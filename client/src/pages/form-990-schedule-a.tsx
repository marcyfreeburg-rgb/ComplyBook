import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, AlertCircle, RefreshCw, CheckCircle2, XCircle, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Organization } from "@shared/schema";

interface ScheduleAProps {
  currentOrganization: Organization;
}

interface ScheduleAData {
  partI: { publicCharityType: number | null };
  partII: {
    sectionA: { years: number[]; line1: string[]; line2: string[]; line3: string[]; line4: string[]; line5: string; line6: string };
    sectionB: { years: number[]; line7: string[]; line8: string[]; line9: string[]; line10: string[]; line11: string; line12: string };
    sectionC: { line13: boolean; line14: string; line15: string; line16a: boolean; line16b: boolean; line17a: boolean; line17b: boolean; line18: boolean };
  };
  partIII: {
    sectionA: { years: number[]; line1: string[]; line2: string[]; line3: string[]; line4: string[]; line5: string[]; line6: string[]; line7a: string[]; line7b: string[]; line7c: string[]; line8: string[] };
    sectionB: { years: number[]; line9: string[]; line10a: string[]; line10b: string[]; line10c: string[]; line11: string[]; line12: string[]; line13: string[] };
    sectionC: { line14: boolean; line15: string; line16: string };
    sectionD: { line17: string; line18: string; line19a: boolean; line19b: boolean; line20: boolean };
  };
  partIV: null;
  partV: null;
  summary: {
    totalPublicSupport: string;
    totalSupport: string;
    publicSupportPercentage: string;
    meetsThreshold: boolean;
    meetsFactsAndCircumstances: boolean;
    partIIIPublicSupport: string;
    partIIITotalSupport: string;
    partIIIPublicSupportPercentage: string;
    partIIIInvestmentPercentage: string;
    partIIIMeetsThreshold: boolean;
  };
}

const PUBLIC_CHARITY_TYPES = [
  { value: "1", label: "A church, convention of churches, or association of churches (section 170(b)(1)(A)(i))" },
  { value: "2", label: "A school (section 170(b)(1)(A)(ii))" },
  { value: "3", label: "A hospital or cooperative hospital service organization (section 170(b)(1)(A)(iii))" },
  { value: "4", label: "A medical research organization operated with a hospital (section 170(b)(1)(A)(iii))" },
  { value: "5", label: "An organization for the benefit of a college or university owned by a governmental unit (section 170(b)(1)(A)(iv))" },
  { value: "6", label: "A federal, state, or local government or governmental unit (section 170(b)(1)(A)(v))" },
  { value: "7", label: "An organization that normally receives substantial support from a governmental unit or the general public (section 170(b)(1)(A)(vi))" },
  { value: "8", label: "A community trust (section 170(b)(1)(A)(vi))" },
  { value: "9", label: "An agricultural research organization (section 170(b)(1)(A)(ix))" },
  { value: "10", label: "An organization receiving >33\u2153% from contributions and gross receipts; \u226433\u2153% from investment income (section 509(a)(2))" },
  { value: "11", label: "An organization organized exclusively to test for public safety (section 509(a)(4))" },
  { value: "12", label: "A supporting organization (section 509(a)(3))" },
];

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function formatPercent(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0.00%";
  return `${num.toFixed(2)}%`;
}

function SupportScheduleTable({ 
  title, 
  years, 
  rows, 
  totalRows 
}: { 
  title: string; 
  years: number[]; 
  rows: Array<{ label: string; values: string[]; bold?: boolean }>; 
  totalRows?: Array<{ label: string; value: string; bold?: boolean }>;
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">{title}</h4>
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Calendar year (or fiscal year beginning in)</TableHead>
              {years.map((year, i) => (
                <TableHead key={year} className="text-right min-w-[100px]">
                  ({String.fromCharCode(97 + i)}) {year}
                </TableHead>
              ))}
              <TableHead className="text-right min-w-[120px] font-bold">(f) Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => {
              const total = row.values.reduce((s, v) => s + parseFloat(v || "0"), 0);
              return (
                <TableRow key={idx}>
                  <TableCell className={row.bold ? "font-semibold" : ""}>
                    {row.label}
                  </TableCell>
                  {row.values.map((val, i) => (
                    <TableCell key={i} className="text-right tabular-nums">
                      {formatCurrency(val)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {totalRows && totalRows.length > 0 && (
        <div className="space-y-1 mt-2">
          {totalRows.map((row, idx) => (
            <div key={idx} className={`flex justify-between items-center px-3 py-2 rounded ${row.bold ? 'bg-muted font-semibold' : ''}`}>
              <span className="text-sm">{row.label}</span>
              <span className="text-sm tabular-nums">{formatCurrency(row.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Form990ScheduleA({ currentOrganization }: ScheduleAProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear - 1);
  const [selectedCharityType, setSelectedCharityType] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");
  const [supportingOrgType, setSupportingOrgType] = useState<string>("");

  const { data: reportData, isLoading, error, refetch } = useQuery<ScheduleAData>({
    queryKey: [`/api/reports/form-990-schedule-a/${currentOrganization.id}/${taxYear}`],
  });

  const needsPartII = ["5", "7", "8"].includes(selectedCharityType);
  const needsPartIII = selectedCharityType === "10";

  const handleExportCSV = () => {
    if (!reportData) return;

    const years = reportData.partII.sectionA.years;
    const csvRows: string[][] = [
      ["Schedule A (Form 990) - Public Charity Status and Public Support"],
      [`Organization: ${currentOrganization.name}`],
      [`Tax Year: ${taxYear}`],
      [],
    ];

    if (selectedCharityType) {
      const charityLabel = PUBLIC_CHARITY_TYPES.find(t => t.value === selectedCharityType)?.label || "";
      csvRows.push(["Part I: Public Charity Status"]);
      csvRows.push([`Line ${selectedCharityType}: ${charityLabel}`]);
      csvRows.push([]);
    }

    if (needsPartII || !needsPartIII) {
      csvRows.push(["Part II - Section A: Public Support"]);
      csvRows.push(["", ...years.map(String), "Total"]);
      const addRow = (label: string, values: string[]) => {
        const total = values.reduce((s, v) => s + parseFloat(v), 0).toFixed(2);
        csvRows.push([label, ...values, total]);
      };
      addRow("Line 1 - Gifts, grants, contributions, membership fees", reportData.partII.sectionA.line1);
      addRow("Line 2 - Tax revenues", reportData.partII.sectionA.line2);
      addRow("Line 3 - Government services/facilities", reportData.partII.sectionA.line3);
      addRow("Line 4 - Total (Lines 1-3)", reportData.partII.sectionA.line4);
      csvRows.push([`Line 5 - Excess contributions (2% threshold)`, reportData.partII.sectionA.line5]);
      csvRows.push([`Line 6 - Public support (Line 4 - Line 5)`, reportData.partII.sectionA.line6]);
      csvRows.push([]);
      csvRows.push(["Part II - Section B: Total Support"]);
      csvRows.push(["", ...years.map(String), "Total"]);
      addRow("Line 7 - Amounts from Line 4", reportData.partII.sectionB.line7);
      addRow("Line 8 - Investment income", reportData.partII.sectionB.line8);
      addRow("Line 9 - Unrelated business income", reportData.partII.sectionB.line9);
      addRow("Line 10 - Other income", reportData.partII.sectionB.line10);
      csvRows.push([`Line 11 - Total support`, reportData.partII.sectionB.line11]);
      csvRows.push([]);
      csvRows.push(["Part II - Section C: Public Support Percentage"]);
      csvRows.push([`Line 14 - Public support percentage ${taxYear}`, `${reportData.partII.sectionC.line14}%`]);
      csvRows.push([`Line 15 - Prior year percentage`, `${reportData.partII.sectionC.line15}%`]);
      csvRows.push([`Line 13 - First five years`, reportData.partII.sectionC.line13 ? "Yes" : "No"]);
      csvRows.push([`Line 16a - 33 1/3% support test (current year)`, reportData.partII.sectionC.line16a ? "Yes" : "No"]);
      csvRows.push([`Line 16b - 33 1/3% support test (prior year)`, reportData.partII.sectionC.line16b ? "Yes" : "No"]);
      csvRows.push([`Line 17a - 10% facts-and-circumstances test (current year)`, reportData.partII.sectionC.line17a ? "Yes" : "No"]);
      csvRows.push([`Line 17b - 10% facts-and-circumstances test (prior year)`, reportData.partII.sectionC.line17b ? "Yes" : "No"]);
      csvRows.push([`Line 18 - Private foundation`, reportData.partII.sectionC.line18 ? "Yes" : "No"]);
    }

    if (needsPartIII) {
      csvRows.push(["Part III - Section A: Public Support"]);
      csvRows.push(["", ...years.map(String), "Total"]);
      const addRow = (label: string, values: string[]) => {
        const total = values.reduce((s, v) => s + parseFloat(v), 0).toFixed(2);
        csvRows.push([label, ...values, total]);
      };
      addRow("Line 1 - Gifts, grants, contributions, membership fees", reportData.partIII.sectionA.line1);
      addRow("Line 2 - Gross receipts from related activities", reportData.partIII.sectionA.line2);
      addRow("Line 3 - Non-UBI gross receipts", reportData.partIII.sectionA.line3);
      addRow("Line 6 - Total", reportData.partIII.sectionA.line6);
      addRow("Line 8 - Public support", reportData.partIII.sectionA.line8);
      csvRows.push([]);
      csvRows.push([`Line 15 - Public support percentage`, `${reportData.partIII.sectionC.line15}%`]);
      csvRows.push([`Line 17 - Investment income percentage`, `${reportData.partIII.sectionD.line17}%`]);
      csvRows.push([`Line 14 - First five years`, reportData.partIII.sectionC.line14 ? "Yes" : "No"]);
      csvRows.push([`Line 19a - Both tests pass (current year)`, reportData.partIII.sectionD.line19a ? "Yes" : "No"]);
      csvRows.push([`Line 19b - Both tests pass (prior year)`, reportData.partIII.sectionD.line19b ? "Yes" : "No"]);
      csvRows.push([`Line 20 - Does not qualify`, reportData.partIII.sectionD.line20 ? "Yes" : "No"]);
    }

    csvRows.push([]);
    csvRows.push(["Summary"]);
    if (needsPartIII) {
      csvRows.push(["Total Public Support (Part III)", reportData.summary.partIIIPublicSupport]);
      csvRows.push(["Total Support (Part III)", reportData.summary.partIIITotalSupport]);
      csvRows.push(["Public Support Percentage (Part III)", `${reportData.summary.partIIIPublicSupportPercentage}%`]);
      csvRows.push(["Investment Income Percentage (Part III)", `${reportData.summary.partIIIInvestmentPercentage}%`]);
      csvRows.push(["Meets 33 1/3% Threshold (Part III)", reportData.summary.partIIIMeetsThreshold ? "Yes" : "No"]);
    } else {
      csvRows.push(["Total Public Support (Part II)", reportData.summary.totalPublicSupport]);
      csvRows.push(["Total Support (Part II)", reportData.summary.totalSupport]);
      csvRows.push(["Public Support Percentage (Part II)", `${reportData.summary.publicSupportPercentage}%`]);
      csvRows.push(["Meets 33 1/3% Threshold (Part II)", reportData.summary.meetsThreshold ? "Yes" : "No"]);
    }

    const csvContent = csvRows.map(row => row.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schedule-a-form-990-${taxYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Report exported", description: "Schedule A data has been downloaded as CSV." });
  };

  return (
    <div className="flex-1 p-6 space-y-6" data-testid="page-schedule-a">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-schedule-a">
            Schedule A (Form 990)
          </h1>
          <p className="text-muted-foreground">
            Public Charity Status and Public Support
          </p>
        </div>
        {reportData && (
          <Button onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Year</CardTitle>
          <CardDescription>Select the tax year for Schedule A reporting. The support schedule covers the 5-year period ending in this year.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="w-48">
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
            <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Generating Schedule A data...</p>
              <p className="text-xs text-muted-foreground mt-2">Computing 5-year support schedule for {taxYear - 4} through {taxYear}</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Schedule A</h3>
              <p className="text-muted-foreground mb-4">
                Failed to generate the Schedule A data. This may occur if there are no transactions for the selected period.
              </p>
              <Button variant="outline" onClick={() => refetch()} data-testid="button-retry">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : reportData ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(needsPartIII ? reportData.summary.partIIIMeetsThreshold : reportData.summary.meetsThreshold) ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Public Support Test Summary
                {needsPartIII && <Badge variant="secondary">509(a)(2)</Badge>}
                {needsPartII && <Badge variant="secondary">170(b)(1)(A)</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Public Support</p>
                  <p className="text-xl font-bold tabular-nums" data-testid="text-total-public-support">
                    {formatCurrency(needsPartIII ? reportData.summary.partIIIPublicSupport : reportData.summary.totalPublicSupport)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Support</p>
                  <p className="text-xl font-bold tabular-nums" data-testid="text-total-support">
                    {formatCurrency(needsPartIII ? reportData.summary.partIIITotalSupport : reportData.summary.totalSupport)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Public Support %</p>
                  <p className={`text-xl font-bold tabular-nums ${parseFloat(needsPartIII ? reportData.summary.partIIIPublicSupportPercentage : reportData.summary.publicSupportPercentage) >= 33.33 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-support-percentage">
                    {formatPercent(needsPartIII ? reportData.summary.partIIIPublicSupportPercentage : reportData.summary.publicSupportPercentage)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">33\u2153% Test</p>
                  <div className="flex items-center gap-2 mt-1">
                    {(needsPartIII ? reportData.summary.partIIIMeetsThreshold : reportData.summary.meetsThreshold) ? (
                      <Badge variant="default" className="bg-green-600" data-testid="badge-threshold-status">Passes</Badge>
                    ) : (
                      <Badge variant="destructive" data-testid="badge-threshold-status">Does Not Pass</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex flex-wrap gap-1 h-auto">
                  <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                  <TabsTrigger value="partI" data-testid="tab-part-1">Part I</TabsTrigger>
                  <TabsTrigger value="partII" data-testid="tab-part-2">Part II</TabsTrigger>
                  <TabsTrigger value="partIII" data-testid="tab-part-3">Part III</TabsTrigger>
                  <TabsTrigger value="partIV" data-testid="tab-part-4">Part IV</TabsTrigger>
                  <TabsTrigger value="partV" data-testid="tab-part-5">Part V</TabsTrigger>
                  <TabsTrigger value="partVI" data-testid="tab-part-6">Part VI</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="space-y-2">
                        <h3 className="font-semibold">About Schedule A</h3>
                        <p className="text-sm text-muted-foreground">
                          Schedule A determines whether your organization qualifies as a public charity rather than a private foundation.
                          Most nonprofits qualify under <strong>line 7</strong> (receives substantial public support) or <strong>line 10</strong> (the 33\u2153% support test).
                        </p>
                        <p className="text-sm text-muted-foreground">
                          This report automatically computes the 5-year support schedule ({reportData.partII.sectionA.years[0]}&ndash;{reportData.partII.sectionA.years[4]}) from your transaction data.
                          Contributions, grants, membership fees, investment income, and program service revenue are categorized based on your transaction categories.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>How to use:</strong> Select your public charity type in Part I, then review the auto-calculated support schedule in Part II or Part III.
                          Export to CSV for your tax preparer.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">5-Year Support Period</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                          Calendar years included in this calculation:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {reportData.partII.sectionA.years.map(year => (
                            <Badge key={year} variant="secondary">{year}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Key Thresholds</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">33\u2153% public support test</span>
                            <span className={parseFloat(reportData.summary.publicSupportPercentage) >= 33.33 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                              {parseFloat(reportData.summary.publicSupportPercentage) >= 33.33 ? 'Passes' : 'Does not pass'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">10% facts-and-circumstances test</span>
                            <span className={parseFloat(reportData.summary.publicSupportPercentage) >= 10 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                              {parseFloat(reportData.summary.publicSupportPercentage) >= 10 ? 'May qualify' : 'Does not qualify'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="partI" className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Part I: Reason for Public Charity Status</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select the reason your organization is not a private foundation. Most organizations check line 7 or line 10.
                    </p>
                  </div>
                  <RadioGroup value={selectedCharityType} onValueChange={(val) => setSelectedCharityType(val === selectedCharityType ? "" : val)}>
                    <div className="space-y-3">
                      {PUBLIC_CHARITY_TYPES.map((type) => (
                        <div
                          key={type.value}
                          className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${selectedCharityType === type.value ? 'border-primary bg-primary/5' : 'border-border'}`}
                          onClick={() => setSelectedCharityType(selectedCharityType === type.value ? "" : type.value)}
                        >
                          <RadioGroupItem
                            value={type.value}
                            id={`charity-type-${type.value}`}
                            className="mt-0.5"
                            data-testid={`radio-charity-type-${type.value}`}
                          />
                          <label htmlFor={`charity-type-${type.value}`} className="text-sm cursor-pointer leading-relaxed flex-1">
                            <span className="font-medium">Line {type.value}.</span> {type.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>

                  {selectedCharityType === "12" && (
                    <div className="ml-8 mt-2 space-y-3">
                      <p className="text-sm font-medium">Select the type of supporting organization:</p>
                      <RadioGroup value={supportingOrgType} onValueChange={(val) => setSupportingOrgType(val === supportingOrgType ? "" : val)}>
                        <div className="space-y-2">
                          <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${supportingOrgType === "12a" ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setSupportingOrgType(supportingOrgType === "12a" ? "" : "12a")}>
                            <RadioGroupItem value="12a" id="supporting-org-12a" className="mt-0.5" data-testid="radio-supporting-org-12a" />
                            <label htmlFor="supporting-org-12a" className="text-sm cursor-pointer leading-relaxed flex-1">
                              <span className="font-medium">Type I.</span> Operated, supervised, or controlled by the supported organization(s)
                            </label>
                          </div>
                          <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${supportingOrgType === "12b" ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setSupportingOrgType(supportingOrgType === "12b" ? "" : "12b")}>
                            <RadioGroupItem value="12b" id="supporting-org-12b" className="mt-0.5" data-testid="radio-supporting-org-12b" />
                            <label htmlFor="supporting-org-12b" className="text-sm cursor-pointer leading-relaxed flex-1">
                              <span className="font-medium">Type II.</span> Supervised or controlled in connection with the supported organization(s)
                            </label>
                          </div>
                          <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${supportingOrgType === "12c" ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setSupportingOrgType(supportingOrgType === "12c" ? "" : "12c")}>
                            <RadioGroupItem value="12c" id="supporting-org-12c" className="mt-0.5" data-testid="radio-supporting-org-12c" />
                            <label htmlFor="supporting-org-12c" className="text-sm cursor-pointer leading-relaxed flex-1">
                              <span className="font-medium">Type III \u2014 Functionally integrated.</span> Operated in connection with the supported organization(s)
                            </label>
                          </div>
                          <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${supportingOrgType === "12d" ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => setSupportingOrgType(supportingOrgType === "12d" ? "" : "12d")}>
                            <RadioGroupItem value="12d" id="supporting-org-12d" className="mt-0.5" data-testid="radio-supporting-org-12d" />
                            <label htmlFor="supporting-org-12d" className="text-sm cursor-pointer leading-relaxed flex-1">
                              <span className="font-medium">Type III \u2014 Non-functionally integrated.</span> Not functionally integrated with the supported organization(s)
                            </label>
                          </div>
                        </div>
                      </RadioGroup>
                      <div className="p-3 border rounded-lg bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                          Supporting organizations must complete <strong>Part IV</strong> (Sections A through E).
                          {supportingOrgType === "12d" && (
                            <> Type III non-functionally integrated organizations must also complete <strong>Part V</strong>.</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedCharityType && (
                    <div className="p-4 border rounded-lg bg-muted/30 mt-4">
                      <p className="text-sm">
                        {needsPartII && (
                          <>You selected a type that requires completing <strong>Part II</strong> (Support Schedule for sections 170(b)(1)(A)(iv) and (vi)). Review the Part II tab for your 5-year support schedule.</>
                        )}
                        {needsPartIII && (
                          <>You selected section 509(a)(2), which requires completing <strong>Part III</strong>. Review the Part III tab for your support and investment income schedules.</>
                        )}
                        {!needsPartII && !needsPartIII && selectedCharityType !== "12" && (
                          <>This classification type does not require completing the support schedules in Part II or Part III. Consult your tax advisor for any additional requirements.</>
                        )}
                        {selectedCharityType === "12" && (
                          <>You selected a supporting organization classification. Complete <strong>Part IV</strong> and review the applicable tabs for your organization type.</>
                        )}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="partII" className="space-y-6 mt-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Part II: Support Schedule for Organizations Described in Sections 170(b)(1)(A)(iv) and 170(b)(1)(A)(vi)</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete this part if you checked line 5, 7, or 8 of Part I. All amounts are auto-calculated from your transaction data.
                    </p>
                  </div>

                  <ScrollArea className="w-full">
                    <div className="min-w-[700px] space-y-6">
                      <SupportScheduleTable
                        title="Section A. Public Support"
                        years={reportData.partII.sectionA.years}
                        rows={[
                          { label: "1. Gifts, grants, contributions, and membership fees", values: reportData.partII.sectionA.line1 },
                          { label: "2. Tax revenues levied for the organization", values: reportData.partII.sectionA.line2 },
                          { label: "3. Government services/facilities furnished without charge", values: reportData.partII.sectionA.line3 },
                          { label: "4. Total (add lines 1 through 3)", values: reportData.partII.sectionA.line4, bold: true },
                        ]}
                        totalRows={[
                          { label: "5. Portion of contributions exceeding 2% of line 11 total", value: reportData.partII.sectionA.line5 },
                          { label: "6. Public support (line 4 total minus line 5)", value: reportData.partII.sectionA.line6, bold: true },
                        ]}
                      />

                      <SupportScheduleTable
                        title="Section B. Total Support"
                        years={reportData.partII.sectionB.years}
                        rows={[
                          { label: "7. Amounts from line 4", values: reportData.partII.sectionB.line7 },
                          { label: "8. Gross income from interest, dividends, rents, royalties", values: reportData.partII.sectionB.line8 },
                          { label: "9. Net income from unrelated business activities", values: reportData.partII.sectionB.line9 },
                          { label: "10. Other income", values: reportData.partII.sectionB.line10 },
                        ]}
                        totalRows={[
                          { label: "11. Total support (add lines 7 through 10)", value: reportData.partII.sectionB.line11, bold: true },
                          { label: "12. Gross receipts from related activities", value: reportData.partII.sectionB.line12 },
                        ]}
                      />
                    </div>
                  </ScrollArea>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Section C. Computation of Public Support Percentage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${reportData.partII.sectionC.line13 ? 'border-primary bg-primary/5' : 'border-border'}`} data-testid="checkbox-line-13">
                          {reportData.partII.sectionC.line13 ? (
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-muted-foreground/40 rounded-sm shrink-0" />
                          )}
                          <span className="text-sm"><span className="font-medium">Line 13.</span> If the organization did not check a box on line 13a or 13b, and line 14 is 33\u2153% or more, check this box and stop here. The organization qualifies as a publicly supported organization (first five years).</span>
                        </div>

                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                          <span className="text-sm font-medium">Line 14: Public support percentage for {taxYear}</span>
                          <span className={`text-lg font-bold tabular-nums ${parseFloat(reportData.partII.sectionC.line14) >= 33.33 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-part2-percentage">
                            {formatPercent(reportData.partII.sectionC.line14)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg">
                          <span className="text-sm text-muted-foreground">Line 15: Public support percentage from prior year</span>
                          <span className="text-sm tabular-nums">{formatPercent(reportData.partII.sectionC.line15)}</span>
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${reportData.partII.sectionC.line16a ? 'border-green-600 bg-green-50 dark:bg-green-950/20' : 'border-border'}`} data-testid="checkbox-line-16a">
                          {reportData.partII.sectionC.line16a ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-muted-foreground/40 rounded-sm shrink-0" />
                          )}
                          <span className="text-sm"><span className="font-medium">Line 16a.</span> 33\u2153% support test\u2014{taxYear}. If the organization did not check the box on line 13, and line 14 is 33\u2153% or more, check this box and stop here. The organization qualifies as a publicly supported organization.</span>
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${reportData.partII.sectionC.line16b ? 'border-green-600 bg-green-50 dark:bg-green-950/20' : 'border-border'}`} data-testid="checkbox-line-16b">
                          {reportData.partII.sectionC.line16b ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-muted-foreground/40 rounded-sm shrink-0" />
                          )}
                          <span className="text-sm"><span className="font-medium">Line 16b.</span> 33\u2153% support test\u2014{taxYear - 1}. If the organization did not check a box on line 13 or 16a, and line 15 is 33\u2153% or more, check this box and stop here. The organization qualifies as a publicly supported organization.</span>
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${reportData.partII.sectionC.line17a ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/20' : 'border-border'}`} data-testid="checkbox-line-17a">
                          {reportData.partII.sectionC.line17a ? (
                            <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-muted-foreground/40 rounded-sm shrink-0" />
                          )}
                          <span className="text-sm"><span className="font-medium">Line 17a.</span> 10%-facts-and-circumstances test\u2014{taxYear}. If the organization did not check a box on line 13, 16a, or 16b, and line 14 is 10% or more, and if the organization meets the facts-and-circumstances test, check this box and stop here. Explain in Part VI how the organization meets the test.</span>
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${reportData.partII.sectionC.line17b ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/20' : 'border-border'}`} data-testid="checkbox-line-17b">
                          {reportData.partII.sectionC.line17b ? (
                            <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-muted-foreground/40 rounded-sm shrink-0" />
                          )}
                          <span className="text-sm"><span className="font-medium">Line 17b.</span> 10%-facts-and-circumstances test\u2014{taxYear - 1}. If the organization did not check a box on line 13, 16a, 16b, or 17a, and line 15 is 10% or more, and if the organization meets the facts-and-circumstances test, check this box and stop here. Explain in Part VI how the organization meets the test.</span>
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${reportData.partII.sectionC.line18 ? 'border-red-600 bg-red-50 dark:bg-red-950/20' : 'border-border'}`} data-testid="checkbox-line-18">
                          {reportData.partII.sectionC.line18 ? (
                            <CheckCircle2 className="h-5 w-5 text-red-600 shrink-0" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-muted-foreground/40 rounded-sm shrink-0" />
                          )}
                          <span className="text-sm"><span className="font-medium">Line 18.</span> Private foundation. If the organization did not check a box on line 13, 16a, 16b, 17a, or 17b, check this box and see instructions.</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="partIII" className="space-y-6 mt-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Part III: Support Schedule for Organizations Described in Section 509(a)(2)</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete this part if you checked line 10 of Part I. All amounts are auto-calculated from your transaction data.
                    </p>
                  </div>

                  <ScrollArea className="w-full">
                    <div className="min-w-[700px] space-y-6">
                      <SupportScheduleTable
                        title="Section A. Public Support"
                        years={reportData.partIII.sectionA.years}
                        rows={[
                          { label: "1. Gifts, grants, contributions, and membership fees", values: reportData.partIII.sectionA.line1 },
                          { label: "2. Gross receipts from related activities", values: reportData.partIII.sectionA.line2 },
                          { label: "3. Gross receipts from non-UBI activities", values: reportData.partIII.sectionA.line3 },
                          { label: "4. Tax revenues levied for the organization", values: reportData.partIII.sectionA.line4 },
                          { label: "5. Government services/facilities", values: reportData.partIII.sectionA.line5 },
                          { label: "6. Total (add lines 1 through 5)", values: reportData.partIII.sectionA.line6, bold: true },
                          { label: "7a. From disqualified persons", values: reportData.partIII.sectionA.line7a },
                          { label: "7b. From others exceeding $5,000 or 1%", values: reportData.partIII.sectionA.line7b },
                          { label: "7c. Add lines 7a and 7b", values: reportData.partIII.sectionA.line7c },
                          { label: "8. Public support (line 6 minus line 7c)", values: reportData.partIII.sectionA.line8, bold: true },
                        ]}
                      />

                      <SupportScheduleTable
                        title="Section B. Total Support"
                        years={reportData.partIII.sectionB.years}
                        rows={[
                          { label: "9. Amounts from line 6", values: reportData.partIII.sectionB.line9 },
                          { label: "10a. Gross investment income", values: reportData.partIII.sectionB.line10a },
                          { label: "10b. Unrelated business taxable income", values: reportData.partIII.sectionB.line10b },
                          { label: "10c. Add lines 10a and 10b", values: reportData.partIII.sectionB.line10c },
                          { label: "11. Net unrelated business income (not on 10b)", values: reportData.partIII.sectionB.line11 },
                          { label: "12. Other income", values: reportData.partIII.sectionB.line12 },
                          { label: "13. Total support (add lines 9, 10c, 11, 12)", values: reportData.partIII.sectionB.line13, bold: true },
                        ]}
                      />
                    </div>
                  </ScrollArea>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Section C. Public Support Percentage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className={`flex items-center gap-3 p-3 rounded-lg border ${reportData.partIII.sectionC.line14 ? 'border-primary bg-primary/5' : 'border-border'}`} data-testid="checkbox-line-14">
                            {reportData.partIII.sectionC.line14 ? (
                              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            ) : (
                              <div className="h-5 w-5 border-2 border-muted-foreground/40 rounded-sm shrink-0" />
                            )}
                            <span className="text-sm"><span className="font-medium">Line 14.</span> First five years. If the Form 990 is for the organization's first, second, third, fourth, or fifth tax year as a section 501(c)(3) organization, check this box and stop here.</span>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                            <span className="text-sm">Line 15: Public support % for {taxYear}</span>
                            <span className={`font-bold tabular-nums ${parseFloat(reportData.partIII.sectionC.line15) > 33.33 ? 'text-green-600' : ''}`} data-testid="text-part3-public-pct">
                              {formatPercent(reportData.partIII.sectionC.line15)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3">
                            <span className="text-sm text-muted-foreground">Line 16: Prior year %</span>
                            <span className="text-sm tabular-nums">{formatPercent(reportData.partIII.sectionC.line16)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Section D. Investment Income Percentage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                            <span className="text-sm">Line 17: Investment income % for {taxYear}</span>
                            <span className={`font-bold tabular-nums ${parseFloat(reportData.partIII.sectionD.line17) <= 33.33 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-part3-invest-pct">
                              {formatPercent(reportData.partIII.sectionD.line17)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3">
                            <span className="text-sm text-muted-foreground">Line 18: Prior year %</span>
                            <span className="text-sm tabular-nums">{formatPercent(reportData.partIII.sectionD.line18)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Qualification Determination</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${reportData.partIII.sectionD.line19a ? 'border-green-600 bg-green-50 dark:bg-green-950/20' : 'border-border'}`} data-testid="checkbox-line-19a">
                          {reportData.partIII.sectionD.line19a ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-muted-foreground/40 rounded-sm shrink-0" />
                          )}
                          <span className="text-sm"><span className="font-medium">Line 19a.</span> 33\u2153% support tests\u2014{taxYear}. If the organization did not check the box on line 14, and line 15 is more than 33\u2153%, and line 17 is not more than 33\u2153%, check this box and stop here. The organization qualifies as a publicly supported organization.</span>
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${reportData.partIII.sectionD.line19b ? 'border-green-600 bg-green-50 dark:bg-green-950/20' : 'border-border'}`} data-testid="checkbox-line-19b">
                          {reportData.partIII.sectionD.line19b ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-muted-foreground/40 rounded-sm shrink-0" />
                          )}
                          <span className="text-sm"><span className="font-medium">Line 19b.</span> 33\u2153% support tests\u2014{taxYear - 1}. If the organization did not check a box on line 14 or line 19a, and line 16 is more than 33\u2153%, and line 18 is not more than 33\u2153%, check this box and stop here. The organization qualifies as a publicly supported organization.</span>
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${reportData.partIII.sectionD.line20 ? 'border-red-600 bg-red-50 dark:bg-red-950/20' : 'border-border'}`} data-testid="checkbox-line-20">
                          {reportData.partIII.sectionD.line20 ? (
                            <CheckCircle2 className="h-5 w-5 text-red-600 shrink-0" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-muted-foreground/40 rounded-sm shrink-0" />
                          )}
                          <span className="text-sm"><span className="font-medium">Line 20.</span> Private foundation. If the organization did not check a box on line 14, 19a, or 19b, check this box and see instructions.</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="partIV" className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Part IV: Supporting Organizations</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete this part only if you checked line 12 of Part I (supporting organization under section 509(a)(3)).
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>
                          Supporting organizations must complete Sections A through E of Part IV. This includes answering questions about
                          the type of supporting organization (Type I, Type II, or Type III), listing supported organizations, and
                          providing information about organizational relationships and control.
                        </p>
                        <p>
                          <strong>This section requires manual completion.</strong> Work with your tax advisor to complete Part IV based on your
                          organization's specific supporting organization classification and relationships.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="partV" className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Part V: Type III Non-Functionally Integrated 509(a)(3) Supporting Organizations</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete this part only if the organization is a Type III non-functionally integrated supporting organization (checked Part I, line 12, and Part IV, Section A, line 1, and Part IV, Section B, line 1i).
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>
                          Part V determines the distributable amount and tracks distributions for Type III non-functionally integrated
                          supporting organizations. It includes sections for Adjusted Net Income, Minimum Asset Amount, Distributable Amount,
                          Distributions, and Distribution Allocations.
                        </p>
                        <p>
                          <strong>This section requires manual completion.</strong> The calculations involve complex asset valuations and
                          distribution requirements. Work with your tax advisor to complete this section.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="partVI" className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Part VI: Supplemental Information</h3>
                    <p className="text-sm text-muted-foreground">
                      Provide explanations required by Parts II, III, and IV. These explanations support your public charity status determination.
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Common explanations needed in Part VI include:</p>
                        <ul className="list-disc ml-4 space-y-1">
                          <li><strong>Part II, Line 10:</strong> Describe any other income not from investment or unrelated business activities</li>
                          <li><strong>Part II, Lines 17a/17b:</strong> If using the 10% facts-and-circumstances test, explain how the organization meets this test</li>
                          <li><strong>Part III, Line 12:</strong> Describe any other income reported</li>
                        </ul>
                        <p className="mt-2">
                          Use the Form 990 Report page's AI Narrative Builder to help generate these explanations, then include them with your Schedule A filing.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
