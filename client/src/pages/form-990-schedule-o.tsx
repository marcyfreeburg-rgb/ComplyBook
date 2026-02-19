import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, AlertCircle, RefreshCw, Info, Sparkles, Copy, Check, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import type { Organization } from "@shared/schema";

interface ScheduleOProps {
  currentOrganization: Organization;
}

interface ScheduleOLineItem {
  formPart: string;
  lineNumber: string;
  title: string;
  explanation: string;
  hasData: boolean;
  dataContext: string;
}

interface ScheduleOData {
  organizationName: string;
  ein: string;
  taxYear: number;
  lineItems: ScheduleOLineItem[];
  summary: {
    totalLineItems: number;
    itemsWithExplanations: number;
    itemsNeedingAttention: number;
  };
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

export default function Form990ScheduleO({ currentOrganization }: ScheduleOProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear - 1);
  const [activeTab, setActiveTab] = useState("overview");
  const [narratives, setNarratives] = useState<Record<string, string>>({});
  const [customContexts, setCustomContexts] = useState<Record<string, string>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);

  const { data: reportData, isLoading, error, refetch } = useQuery<ScheduleOData>({
    queryKey: [`/api/reports/form-990-schedule-o/${currentOrganization.id}/${taxYear}`],
  });

  const generateNarrativeMutation = useMutation({
    mutationFn: async ({ lineNumber, formPart, dataContext, customContext }: { lineNumber: string; formPart: string; dataContext: string; customContext?: string }): Promise<{ narrative: string; formPart: string; lineNumber: string }> => {
      const response = await apiRequest("POST", "/api/form-990-schedule-o/generate-narrative", {
        organizationId: currentOrganization.id,
        lineNumber,
        formPart,
        taxYear,
        dataContext,
        customContext,
      });
      return response.json();
    },
    onSuccess: (data) => {
      const key = `${data.formPart}-${data.lineNumber}`;
      setNarratives(prev => ({ ...prev, [key]: data.narrative }));
      setGeneratingKey(null);
      toast({
        title: "Narrative generated",
        description: `AI explanation for ${data.formPart}, Line ${data.lineNumber} is ready. You can edit it before using.`,
      });
    },
    onError: (error: any) => {
      setGeneratingKey(null);
      toast({
        title: "Error generating narrative",
        description: error.message || "Failed to generate narrative. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateNarrative = (item: ScheduleOLineItem) => {
    const key = `${item.formPart}-${item.lineNumber}`;
    setGeneratingKey(key);
    generateNarrativeMutation.mutate({
      lineNumber: item.lineNumber,
      formPart: item.formPart,
      dataContext: item.dataContext,
      customContext: customContexts[key],
    });
  };

  const [generateAllQueue, setGenerateAllQueue] = useState<ScheduleOLineItem[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const handleGenerateAll = async () => {
    if (!reportData) return;
    const items = reportData.lineItems.filter(i => {
      const key = `${i.formPart}-${i.lineNumber}`;
      return !narratives[key] && (i.hasData || ["33", "34", "35b", "44d"].includes(i.lineNumber));
    });
    if (items.length === 0) {
      toast({ title: "Nothing to generate", description: "All items already have narratives or no data to explain." });
      return;
    }
    setIsGeneratingAll(true);
    setGenerateAllQueue(items);
    toast({
      title: "Generating all narratives",
      description: `Generating AI explanations for ${items.length} line items sequentially...`,
    });

    for (const item of items) {
      const key = `${item.formPart}-${item.lineNumber}`;
      setGeneratingKey(key);
      try {
        const response = await apiRequest("POST", "/api/form-990-schedule-o/generate-narrative", {
          organizationId: currentOrganization.id,
          lineNumber: item.lineNumber,
          formPart: item.formPart,
          taxYear,
          dataContext: item.dataContext,
          customContext: customContexts[key],
        });
        const data = await response.json();
        setNarratives(prev => ({ ...prev, [key]: data.narrative }));
      } catch (err: any) {
        toast({
          title: "Error",
          description: `Failed to generate for ${item.formPart} Line ${item.lineNumber}: ${err.message}`,
          variant: "destructive",
        });
      }
    }
    setGeneratingKey(null);
    setIsGeneratingAll(false);
    setGenerateAllQueue([]);
    toast({ title: "Complete", description: "All narratives have been generated." });
  };

  const handleCopyNarrative = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied", description: "Narrative copied to clipboard." });
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const rows = [["Form Part", "Line Number", "Title", "Auto-Generated Data", "AI Narrative / User Notes"]];
    for (const item of reportData.lineItems) {
      const key = `${item.formPart}-${item.lineNumber}`;
      const narrative = narratives[key] || item.explanation || "";
      rows.push([item.formPart, item.lineNumber, item.title, item.explanation, narrative]);
    }
    const csv = rows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule-o-${reportData.organizationName.replace(/\s+/g, '-')}-${taxYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Schedule O data exported to CSV." });
  };

  const handleExportText = () => {
    if (!reportData) return;
    const lines: string[] = [
      `SCHEDULE O (Form 990) - Supplemental Information to Form 990 or 990-EZ`,
      `Organization: ${reportData.organizationName}`,
      `EIN: ${reportData.ein}`,
      `Tax Year: ${reportData.taxYear}`,
      ``,
      `---`,
      ``
    ];

    for (const item of reportData.lineItems) {
      const key = `${item.formPart}-${item.lineNumber}`;
      const narrative = narratives[key] || item.explanation;
      if (narrative) {
        lines.push(`Form 990-EZ, ${item.formPart}, Line ${item.lineNumber} - ${item.title}`);
        lines.push(narrative);
        lines.push(``);
      }
    }

    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule-o-${reportData.organizationName.replace(/\s+/g, '-')}-${taxYear}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Schedule O exported as formatted text file." });
  };

  const getLineItemsByPart = (part: string) => {
    if (!reportData) return [];
    return reportData.lineItems.filter(i => i.formPart === part);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-schedule-o">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading Schedule O data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="error-schedule-o">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load Schedule O data. Please try again.</p>
            <Button onClick={() => refetch()} data-testid="button-retry-schedule-o">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto" data-testid="page-schedule-o">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-schedule-o">Schedule O (Form 990)</h1>
          <p className="text-sm text-muted-foreground mt-1">Supplemental Information to Form 990 or 990-EZ</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="taxYear" className="text-sm whitespace-nowrap">Tax Year:</Label>
            <Input
              id="taxYear"
              type="number"
              value={taxYear}
              onChange={(e) => setTaxYear(parseInt(e.target.value) || currentYear - 1)}
              className="w-24"
              data-testid="input-tax-year-schedule-o"
            />
          </div>
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-schedule-o">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={!reportData} data-testid="button-export-csv-schedule-o">
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" onClick={handleExportText} disabled={!reportData} data-testid="button-export-text-schedule-o">
            <FileText className="h-4 w-4 mr-1" /> Text
          </Button>
        </div>
      </div>

      {reportData && (
        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-schedule-o">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="part-i" data-testid="tab-part-i">Part I</TabsTrigger>
            <TabsTrigger value="part-ii" data-testid="tab-part-ii">Part II</TabsTrigger>
            <TabsTrigger value="part-iii" data-testid="tab-part-iii">Part III</TabsTrigger>
            <TabsTrigger value="part-v" data-testid="tab-part-v">Part V</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Filing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1" data-testid="card-filing-info">
                  <p className="text-sm font-medium" data-testid="text-org-name">{reportData.organizationName}</p>
                  <p className="text-xs text-muted-foreground">EIN: {reportData.ein || "Not set"}</p>
                  <p className="text-xs text-muted-foreground">Tax Year: {reportData.taxYear}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Line Items Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2" data-testid="card-summary">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total line items:</span>
                    <Badge variant="secondary">{reportData.summary.totalLineItems}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">With auto-data:</span>
                    <Badge variant="secondary">{reportData.summary.itemsWithExplanations}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Need attention:</span>
                    <Badge variant={reportData.summary.itemsNeedingAttention > 0 ? "destructive" : "secondary"}>
                      {reportData.summary.itemsNeedingAttention}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">About Schedule O</CardTitle>
                </CardHeader>
                <CardContent data-testid="card-about">
                  <p className="text-xs text-muted-foreground">
                    Schedule O provides supplemental narrative explanations for specific line items on Form 990 or 990-EZ. 
                    Use the AI generate feature to create professional IRS-ready narratives based on your financial data.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-base">All Line Items</CardTitle>
                  <CardDescription>Review and generate explanations for each required line item</CardDescription>
                </div>
                <Button variant="outline" onClick={handleGenerateAll} disabled={generateNarrativeMutation.isPending || isGeneratingAll} data-testid="button-generate-all">
                  {isGeneratingAll ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  {isGeneratingAll ? "Generating..." : "Generate All"}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.lineItems.map((item) => {
                    const key = `${item.formPart}-${item.lineNumber}`;
                    const narrative = narratives[key];
                    const hasNarrative = !!(narrative || item.explanation);
                    return (
                      <div key={key} className="flex items-start gap-3 p-3 rounded-md border" data-testid={`overview-item-${key}`}>
                        <div className="shrink-0 mt-0.5">
                          {hasNarrative ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : item.hasData ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Info className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{item.formPart}</Badge>
                            <span className="text-sm font-medium">Line {item.lineNumber}</span>
                            <span className="text-xs text-muted-foreground truncate">{item.title}</span>
                          </div>
                          {hasNarrative && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {narrative || item.explanation}
                            </p>
                          )}
                        </div>
                        <Badge variant={hasNarrative ? "secondary" : item.hasData ? "destructive" : "outline"}>
                          {hasNarrative ? "Done" : item.hasData ? "Needs explanation" : "Optional"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="part-i" className="space-y-4 mt-4">
            <PartSection
              title="Part I - Revenue, Expenses, and Changes in Net Assets or Fund Balances"
              description="Supplemental information for Form 990-EZ Part I line items"
              items={getLineItemsByPart("Part I")}
              narratives={narratives}
              customContexts={customContexts}
              copiedField={copiedField}
              generatingKey={generatingKey}
              onGenerate={handleGenerateNarrative}
              onCopy={handleCopyNarrative}
              onNarrativeChange={(key, value) => setNarratives(prev => ({ ...prev, [key]: value }))}
              onContextChange={(key, value) => setCustomContexts(prev => ({ ...prev, [key]: value }))}
              isPending={generateNarrativeMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="part-ii" className="space-y-4 mt-4">
            <PartSection
              title="Part II - Balance Sheets"
              description="Supplemental information for Form 990-EZ Part II line items"
              items={getLineItemsByPart("Part II")}
              narratives={narratives}
              customContexts={customContexts}
              copiedField={copiedField}
              generatingKey={generatingKey}
              onGenerate={handleGenerateNarrative}
              onCopy={handleCopyNarrative}
              onNarrativeChange={(key, value) => setNarratives(prev => ({ ...prev, [key]: value }))}
              onContextChange={(key, value) => setCustomContexts(prev => ({ ...prev, [key]: value }))}
              isPending={generateNarrativeMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="part-iii" className="space-y-4 mt-4">
            <PartSection
              title="Part III - Statement of Program Service Accomplishments"
              description="Supplemental information for Form 990-EZ Part III line items"
              items={getLineItemsByPart("Part III")}
              narratives={narratives}
              customContexts={customContexts}
              copiedField={copiedField}
              generatingKey={generatingKey}
              onGenerate={handleGenerateNarrative}
              onCopy={handleCopyNarrative}
              onNarrativeChange={(key, value) => setNarratives(prev => ({ ...prev, [key]: value }))}
              onContextChange={(key, value) => setCustomContexts(prev => ({ ...prev, [key]: value }))}
              isPending={generateNarrativeMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="part-v" className="space-y-4 mt-4">
            <PartSection
              title="Part V - Other Information"
              description="Supplemental information for Form 990-EZ Part V line items"
              items={getLineItemsByPart("Part V")}
              narratives={narratives}
              customContexts={customContexts}
              copiedField={copiedField}
              generatingKey={generatingKey}
              onGenerate={handleGenerateNarrative}
              onCopy={handleCopyNarrative}
              onNarrativeChange={(key, value) => setNarratives(prev => ({ ...prev, [key]: value }))}
              onContextChange={(key, value) => setCustomContexts(prev => ({ ...prev, [key]: value }))}
              isPending={generateNarrativeMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function PartSection({
  title,
  description,
  items,
  narratives,
  customContexts,
  copiedField,
  generatingKey,
  onGenerate,
  onCopy,
  onNarrativeChange,
  onContextChange,
  isPending,
}: {
  title: string;
  description: string;
  items: ScheduleOLineItem[];
  narratives: Record<string, string>;
  customContexts: Record<string, string>;
  copiedField: string | null;
  generatingKey: string | null;
  onGenerate: (item: ScheduleOLineItem) => void;
  onCopy: (key: string, text: string) => void;
  onNarrativeChange: (key: string, value: string) => void;
  onContextChange: (key: string, value: string) => void;
  isPending: boolean;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">No line items for this section.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {items.map((item) => {
        const key = `${item.formPart}-${item.lineNumber}`;
        const narrative = narratives[key] || "";
        const isGenerating = generatingKey === key && isPending;

        return (
          <Card key={key} data-testid={`line-item-${key}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{item.formPart}</Badge>
                  <CardTitle className="text-sm">Line {item.lineNumber}</CardTitle>
                  {item.hasData ? (
                    <Badge variant="secondary">Has Data</Badge>
                  ) : (
                    <Badge variant="outline">Manual Entry</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {(narrative || item.explanation) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onCopy(key, narrative || item.explanation)}
                      data-testid={`button-copy-${key}`}
                    >
                      {copiedField === key ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => onGenerate(item)}
                    disabled={isGenerating}
                    data-testid={`button-generate-${key}`}
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    {isGenerating ? "Generating..." : "AI Generate"}
                  </Button>
                </div>
              </div>
              <CardDescription>{item.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.dataContext && (
                <div className="p-2 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    <span data-testid={`data-context-${key}`}>{item.dataContext}</span>
                  </p>
                </div>
              )}

              {item.explanation && !narrative && (
                <div className="p-2 rounded-md border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Auto-generated from transaction data:</p>
                  <p className="text-sm" data-testid={`auto-explanation-${key}`}>{item.explanation}</p>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Additional context for AI (optional)
                </Label>
                <Input
                  value={customContexts[key] || ""}
                  onChange={(e) => onContextChange(key, e.target.value)}
                  placeholder="Add context to improve AI-generated narrative..."
                  className="text-sm"
                  data-testid={`input-context-${key}`}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Narrative explanation (editable)
                </Label>
                <Textarea
                  value={narrative || item.explanation}
                  onChange={(e) => onNarrativeChange(key, e.target.value)}
                  placeholder="Click 'AI Generate' to create a narrative, or type your own explanation..."
                  rows={4}
                  className="text-sm"
                  data-testid={`textarea-narrative-${key}`}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
