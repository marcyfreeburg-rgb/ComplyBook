import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, TrendingUp, AlertCircle, Sparkles, Copy, Check, RefreshCw } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Organization } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface Form990ReportProps {
  currentOrganization: Organization;
  userId: string;
}

interface Form990Data {
  totalRevenue: string;
  totalExpenses: string;
  programServiceExpenses: string;
  managementExpenses: string;
  fundraisingExpenses: string;
  totalAssets: string;
  totalLiabilities: string;
  netAssets: string;
  revenueBySource: Array<{
    source: string;
    amount: string;
  }>;
  expensesByFunction: Array<{
    function: string;
    amount: string;
  }>;
  grants: Array<{
    grantorName: string;
    amount: string;
    purpose: string;
  }>;
}

type NarrativeType = "mission" | "accomplishments" | "governance" | "compensation";

interface NarrativeState {
  mission: string;
  accomplishments: string;
  governance: string;
  compensation: string;
}

export default function Form990Report({ currentOrganization, userId }: Form990ReportProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear - 1);
  const [activeNarrativeTab, setActiveNarrativeTab] = useState<NarrativeType>("mission");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [narratives, setNarratives] = useState<NarrativeState>({
    mission: "",
    accomplishments: "",
    governance: "",
    compensation: "",
  });
  const [customContext, setCustomContext] = useState("");

  const { data: reportData, isLoading, error } = useQuery<Form990Data>({
    queryKey: [`/api/reports/form-990`, { taxYear }],
  });

  const generateNarrativeMutation = useMutation({
    mutationFn: async ({ narrativeType, context }: { narrativeType: NarrativeType; context?: string }) => {
      const response = await apiRequest("POST", "/api/form-990/generate-narrative", {
        organizationId: currentOrganization.id,
        narrativeType,
        taxYear,
        customContext: context,
      });
      return response;
    },
    onSuccess: (data: { narrative: string; narrativeType: NarrativeType }) => {
      setNarratives(prev => ({
        ...prev,
        [data.narrativeType]: data.narrative,
      }));
      toast({
        title: "Narrative generated",
        description: "The AI-powered narrative has been created. You can edit it before using.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error generating narrative",
        description: error.message || "Failed to generate narrative. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied",
      description: "Narrative copied to clipboard.",
    });
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    const csvRows = [
      ["Form 990 Report"],
      [`Organization: ${currentOrganization.name}`],
      [`Tax Year: ${taxYear}`],
      [],
      ["Financial Summary"],
      ["Item", "Amount"],
      ["Total Revenue", reportData.totalRevenue],
      ["Total Expenses", reportData.totalExpenses],
      ["Program Service Expenses", reportData.programServiceExpenses],
      ["Management & General Expenses", reportData.managementExpenses],
      ["Fundraising Expenses", reportData.fundraisingExpenses],
      ["Total Assets", reportData.totalAssets],
      ["Total Liabilities", reportData.totalLiabilities],
      ["Net Assets", reportData.netAssets],
      [],
      ["Revenue by Source"],
      ["Source", "Amount"],
      ...reportData.revenueBySource.map(r => [r.source, r.amount]),
      [],
      ["Expenses by Function"],
      ["Function", "Amount"],
      ...reportData.expensesByFunction.map(e => [e.function, e.amount]),
      [],
      ["Grants Received"],
      ["Grantor", "Amount", "Purpose"],
      ...reportData.grants.map(g => [g.grantorName, g.amount, g.purpose]),
    ];

    const csvContent = csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `form-990-report-${taxYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report exported",
      description: "The Form 990 report has been downloaded as CSV.",
    });
  };

  const netIncome = reportData ? 
    parseFloat(reportData.totalRevenue) - parseFloat(reportData.totalExpenses) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-form-990-report">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-form-990-report">
            Form 990 Report
          </h1>
          <p className="text-muted-foreground">
            IRS Form 990 reporting data for nonprofit tax filing
          </p>
        </div>
        {reportData && (
          <Button onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Tax Year Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Year</CardTitle>
          <CardDescription>Select the tax year for Form 990 reporting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="taxYear">Tax Year</Label>
              <Input
                id="taxYear"
                type="number"
                value={taxYear}
                onChange={(e) => setTaxYear(parseInt(e.target.value))}
                min={2000}
                max={currentYear}
                data-testid="input-tax-year"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Narrative Builder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>AI Narrative Builder</CardTitle>
              <Badge variant="secondary">AI-Powered</Badge>
            </div>
          </div>
          <CardDescription>
            Generate IRS-compliant narrative sections for your Form 990 using AI. 
            Review and edit before including in your filing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeNarrativeTab} onValueChange={(v) => setActiveNarrativeTab(v as NarrativeType)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="mission" data-testid="tab-mission">
                Mission
              </TabsTrigger>
              <TabsTrigger value="accomplishments" data-testid="tab-accomplishments">
                Accomplishments
              </TabsTrigger>
              <TabsTrigger value="governance" data-testid="tab-governance">
                Governance
              </TabsTrigger>
              <TabsTrigger value="compensation" data-testid="tab-compensation">
                Compensation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mission" className="space-y-4">
              <div className="space-y-2">
                <Label>Mission Statement (Part I, Lines 1-2)</Label>
                <p className="text-sm text-muted-foreground">
                  Describe your organization's mission and most significant activities for the tax year.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mission-context">Additional Context (Optional)</Label>
                <Textarea
                  id="mission-context"
                  placeholder="Add any specific programs, achievements, or focus areas you want highlighted..."
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  rows={2}
                  data-testid="input-mission-context"
                />
              </div>
              <Button
                onClick={() => generateNarrativeMutation.mutate({ narrativeType: "mission", context: customContext })}
                disabled={generateNarrativeMutation.isPending}
                data-testid="button-generate-mission"
              >
                {generateNarrativeMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Mission Statement
                  </>
                )}
              </Button>
              {narratives.mission && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Generated Narrative</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(narratives.mission, "mission")}
                      data-testid="button-copy-mission"
                    >
                      {copiedField === "mission" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={narratives.mission}
                    onChange={(e) => setNarratives(prev => ({ ...prev, mission: e.target.value }))}
                    rows={6}
                    data-testid="textarea-mission-result"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="accomplishments" className="space-y-4">
              <div className="space-y-2">
                <Label>Program Service Accomplishments (Part III)</Label>
                <p className="text-sm text-muted-foreground">
                  Describe your three largest program services by expense, including beneficiaries served and measurable outcomes.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accomplishments-context">Additional Context (Optional)</Label>
                <Textarea
                  id="accomplishments-context"
                  placeholder="Describe specific programs, number of people served, geographic areas, partnerships..."
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  rows={2}
                  data-testid="input-accomplishments-context"
                />
              </div>
              <Button
                onClick={() => generateNarrativeMutation.mutate({ narrativeType: "accomplishments", context: customContext })}
                disabled={generateNarrativeMutation.isPending}
                data-testid="button-generate-accomplishments"
              >
                {generateNarrativeMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Accomplishments
                  </>
                )}
              </Button>
              {narratives.accomplishments && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Generated Narrative</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(narratives.accomplishments, "accomplishments")}
                      data-testid="button-copy-accomplishments"
                    >
                      {copiedField === "accomplishments" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={narratives.accomplishments}
                    onChange={(e) => setNarratives(prev => ({ ...prev, accomplishments: e.target.value }))}
                    rows={8}
                    data-testid="textarea-accomplishments-result"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="governance" className="space-y-4">
              <div className="space-y-2">
                <Label>Governance & Management (Part VI)</Label>
                <p className="text-sm text-muted-foreground">
                  Describe your organization's governance structure, policies, and oversight processes.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="governance-context">Additional Context (Optional)</Label>
                <Textarea
                  id="governance-context"
                  placeholder="Board meeting frequency, conflict of interest policies, document retention, whistleblower protections..."
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  rows={2}
                  data-testid="input-governance-context"
                />
              </div>
              <Button
                onClick={() => generateNarrativeMutation.mutate({ narrativeType: "governance", context: customContext })}
                disabled={generateNarrativeMutation.isPending}
                data-testid="button-generate-governance"
              >
                {generateNarrativeMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Governance Description
                  </>
                )}
              </Button>
              {narratives.governance && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Generated Narrative</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(narratives.governance, "governance")}
                      data-testid="button-copy-governance"
                    >
                      {copiedField === "governance" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={narratives.governance}
                    onChange={(e) => setNarratives(prev => ({ ...prev, governance: e.target.value }))}
                    rows={6}
                    data-testid="textarea-governance-result"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="compensation" className="space-y-4">
              <div className="space-y-2">
                <Label>Compensation Review Process (Part VI, Lines 15a-b)</Label>
                <p className="text-sm text-muted-foreground">
                  Describe the process for reviewing and approving compensation for officers, directors, and key employees.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="compensation-context">Additional Context (Optional)</Label>
                <Textarea
                  id="compensation-context"
                  placeholder="Compensation committee structure, use of comparability data, independent review..."
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  rows={2}
                  data-testid="input-compensation-context"
                />
              </div>
              <Button
                onClick={() => generateNarrativeMutation.mutate({ narrativeType: "compensation", context: customContext })}
                disabled={generateNarrativeMutation.isPending}
                data-testid="button-generate-compensation"
              >
                {generateNarrativeMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Compensation Description
                  </>
                )}
              </Button>
              {narratives.compensation && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Generated Narrative</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(narratives.compensation, "compensation")}
                      data-testid="button-copy-compensation"
                    >
                      {copiedField === "compensation" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={narratives.compensation}
                    onChange={(e) => setNarratives(prev => ({ ...prev, compensation: e.target.value }))}
                    rows={6}
                    data-testid="textarea-compensation-result"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Generating Form 990 report...</p>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Report</h3>
              <p className="text-muted-foreground">
                Failed to load the Form 990 report. Please try again.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : reportData ? (
        <>
          {/* Part I: Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Part I: Summary
              </CardTitle>
              <CardDescription>Revenue, expenses, and changes in net assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-total-revenue">
                      {formatCurrency(parseFloat(reportData.totalRevenue), currentOrganization.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="text-total-expenses">
                      {formatCurrency(parseFloat(reportData.totalExpenses), currentOrganization.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Income/Loss</p>
                    <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-net-income">
                      {formatCurrency(netIncome, currentOrganization.currency)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Position */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Financial Position
              </CardTitle>
              <CardDescription>Assets, liabilities, and net assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Assets</p>
                    <p className="text-2xl font-bold" data-testid="text-total-assets">
                      {formatCurrency(parseFloat(reportData.totalAssets), currentOrganization.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Liabilities</p>
                    <p className="text-2xl font-bold" data-testid="text-total-liabilities">
                      {formatCurrency(parseFloat(reportData.totalLiabilities), currentOrganization.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Assets</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-net-assets">
                      {formatCurrency(parseFloat(reportData.netAssets), currentOrganization.currency)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Functional Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Functional Expenses</CardTitle>
              <CardDescription>Part IX: Statement of Functional Expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center" data-testid="row-program-expenses">
                  <span className="font-medium">Program Service Expenses</span>
                  <span className="font-bold text-lg" data-testid="text-program-service-expenses">
                    {formatCurrency(parseFloat(reportData.programServiceExpenses), currentOrganization.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center" data-testid="row-management-expenses">
                  <span className="font-medium">Management & General Expenses</span>
                  <span className="font-bold text-lg" data-testid="text-management-expenses">
                    {formatCurrency(parseFloat(reportData.managementExpenses), currentOrganization.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center" data-testid="row-fundraising-expenses">
                  <span className="font-medium">Fundraising Expenses</span>
                  <span className="font-bold text-lg" data-testid="text-fundraising-expenses">
                    {formatCurrency(parseFloat(reportData.fundraisingExpenses), currentOrganization.currency)}
                  </span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total Functional Expenses</span>
                    <span className="font-bold text-xl">
                      {formatCurrency(parseFloat(reportData.totalExpenses), currentOrganization.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Source */}
          {reportData.revenueBySource.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Source</CardTitle>
                <CardDescription>Part VIII: Statement of Revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.revenueBySource.map((item, index) => (
                    <div key={index} className="flex justify-between items-center" data-testid={`revenue-source-${index}`}>
                      <span className="font-medium" data-testid={`revenue-source-name-${index}`}>
                        {item.source}
                      </span>
                      <span className="font-bold" data-testid={`revenue-source-amount-${index}`}>
                        {formatCurrency(parseFloat(item.amount), currentOrganization.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grants Received */}
          {reportData.grants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Grants and Similar Amounts Received</CardTitle>
                <CardDescription>Schedule I: Grants and Other Assistance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Grantor Name</th>
                        <th className="text-left p-2">Purpose</th>
                        <th className="text-right p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.grants.map((grant, index) => (
                        <tr key={index} className="border-b" data-testid={`grant-${index}`}>
                          <td className="p-2 font-medium" data-testid={`grant-name-${index}`}>
                            {grant.grantorName}
                          </td>
                          <td className="p-2" data-testid={`grant-purpose-${index}`}>
                            {grant.purpose}
                          </td>
                          <td className="p-2 text-right font-bold" data-testid={`grant-amount-${index}`}>
                            {formatCurrency(parseFloat(grant.amount), currentOrganization.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Note */}
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Important Note</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This report provides financial data for IRS Form 990 preparation. It should be reviewed by a qualified
                    tax professional before filing. The report reflects transaction data recorded in your ComplyBook system
                    for the specified tax year.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
