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
import { Download, FileText, AlertCircle, Sparkles, Copy, Check, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Organization } from "@shared/schema";

function formatIRSCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(num));
}

function rawAmount(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return "0";
  return Math.round(num).toString();
}

interface Form990ReportProps {
  currentOrganization: Organization;
  userId: string;
}

interface Form990Data {
  organizationName: string;
  ein: string;
  taxYear: number;
  partI: {
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    line5a: string;
    line5b: string;
    line5c: string;
    line6a: string;
    line6b: string;
    line6c: string;
    line6d: string;
    line7a: string;
    line7b: string;
    line7c: string;
    line8: string;
    line9: string;
    line10: string;
    line11: string;
    line12: string;
    line13: string;
    line14: string;
    line15: string;
    line16: string;
    line17: string;
    line18: string;
    line19: string;
    line20: string;
    line21: string;
  };
  partII: {
    line22_boa: string;
    line22_eoy: string;
    line23_boa: string;
    line23_eoy: string;
    line24_boa: string;
    line24_eoy: string;
    line25_boa: string;
    line25_eoy: string;
    line26_boa: string;
    line26_eoy: string;
    line27_boa: string;
    line27_eoy: string;
  };
  revenueDetails: Array<{ description: string; category: string; amount: string }>;
  expenseDetails: Array<{ description: string; category: string; amount: string }>;
  grants: Array<{ grantorName: string; amount: string; purpose: string }>;
  functionalExpenses: {
    programServiceExpenses: string;
    managementExpenses: string;
    fundraisingExpenses: string;
  };
}

type NarrativeType = "mission" | "accomplishments" | "governance" | "compensation";

interface NarrativeState {
  mission: string;
  accomplishments: string;
  governance: string;
  compensation: string;
}

function FormLine({ 
  lineNum, 
  description, 
  amount, 
  bold, 
  indent,
  sub,
  onCopy 
}: { 
  lineNum: string; 
  description: string; 
  amount: string; 
  bold?: boolean; 
  indent?: boolean;
  sub?: boolean;
  onCopy: (text: string, field: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(rawAmount(amount));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    onCopy(rawAmount(amount), `line-${lineNum}`);
  };

  return (
    <div 
      className={`flex items-center gap-2 py-1.5 px-2 rounded group ${bold ? 'bg-muted' : 'hover-elevate'} ${indent ? 'ml-6' : ''} ${sub ? 'ml-3' : ''}`}
      data-testid={`form-line-${lineNum}`}
    >
      <span className={`w-10 text-right text-xs shrink-0 ${bold ? 'font-bold' : 'text-muted-foreground'}`}>{lineNum}</span>
      <span className={`flex-1 text-sm ${bold ? 'font-semibold' : ''}`}>{description}</span>
      <span className={`text-sm tabular-nums min-w-[100px] text-right ${bold ? 'font-bold' : 'font-medium'}`} data-testid={`value-line-${lineNum}`}>
        {formatIRSCurrency(amount)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={handleCopy}
        data-testid={`copy-line-${lineNum}`}
      >
        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

function BalanceSheetLine({ 
  lineNum, 
  description, 
  boa, 
  eoy, 
  bold,
  onCopy 
}: { 
  lineNum: string; 
  description: string; 
  boa: string; 
  eoy: string; 
  bold?: boolean;
  onCopy: (text: string, field: string) => void;
}) {
  const [copiedBoa, setCopiedBoa] = useState(false);
  const [copiedEoy, setCopiedEoy] = useState(false);

  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded group ${bold ? 'bg-muted' : 'hover-elevate'}`} data-testid={`balance-line-${lineNum}`}>
      <span className={`w-10 text-right text-xs shrink-0 ${bold ? 'font-bold' : 'text-muted-foreground'}`}>{lineNum}</span>
      <span className={`flex-1 text-sm ${bold ? 'font-semibold' : ''}`}>{description}</span>
      <div className="flex items-center gap-1">
        <span className={`text-sm tabular-nums min-w-[90px] text-right ${bold ? 'font-bold' : 'font-medium'}`} data-testid={`value-boa-${lineNum}`}>
          {formatIRSCurrency(boa)}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => { navigator.clipboard.writeText(rawAmount(boa)); setCopiedBoa(true); setTimeout(() => setCopiedBoa(false), 1500); onCopy(rawAmount(boa), `boa-${lineNum}`); }}
          data-testid={`copy-boa-${lineNum}`}>
          {copiedBoa ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <span className={`text-sm tabular-nums min-w-[90px] text-right ${bold ? 'font-bold' : 'font-medium'}`} data-testid={`value-eoy-${lineNum}`}>
          {formatIRSCurrency(eoy)}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={() => { navigator.clipboard.writeText(rawAmount(eoy)); setCopiedEoy(true); setTimeout(() => setCopiedEoy(false), 1500); onCopy(rawAmount(eoy), `eoy-${lineNum}`); }}
          data-testid={`copy-eoy-${lineNum}`}>
          {copiedEoy ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}

export default function Form990Report({ currentOrganization, userId }: Form990ReportProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear - 1);
  const [activeNarrativeTab, setActiveNarrativeTab] = useState<NarrativeType>("mission");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRevenueDetail, setShowRevenueDetail] = useState(false);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [narratives, setNarratives] = useState<NarrativeState>({
    mission: "",
    accomplishments: "",
    governance: "",
    compensation: "",
  });
  const [customContext, setCustomContext] = useState("");

  const { data: reportData, isLoading, error, refetch } = useQuery<Form990Data>({
    queryKey: [`/api/reports/form-990/${currentOrganization.id}/${taxYear}`],
  });

  const generateNarrativeMutation = useMutation({
    mutationFn: async ({ narrativeType, context }: { narrativeType: NarrativeType; context?: string }): Promise<{ narrative: string; narrativeType: NarrativeType }> => {
      const response = await apiRequest("POST", "/api/form-990/generate-narrative", {
        organizationId: currentOrganization.id,
        narrativeType,
        taxYear,
        customContext: context,
      });
      return response.json();
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
      description: "Value copied to clipboard.",
    });
  };

  const handleCopyAllPartI = () => {
    if (!reportData) return;
    const p = reportData.partI;
    const lines = [
      `Form 990-EZ Part I - Revenue, Expenses, and Changes in Net Assets`,
      `Organization: ${reportData.organizationName}`,
      `EIN: ${reportData.ein}`,
      `Tax Year: ${reportData.taxYear}`,
      ``,
      `REVENUE`,
      `Line 1  Contributions, gifts, grants, and similar amounts received: ${rawAmount(p.line1)}`,
      `Line 2  Program service revenue including government fees and contracts: ${rawAmount(p.line2)}`,
      `Line 3  Membership dues and assessments: ${rawAmount(p.line3)}`,
      `Line 4  Investment income: ${rawAmount(p.line4)}`,
      `Line 5a Gross amount from sale of assets other than inventory: ${rawAmount(p.line5a)}`,
      `Line 5b Less: cost or other basis and sales expenses: ${rawAmount(p.line5b)}`,
      `Line 5c Gain or (loss) from sale of assets (line 5a minus 5b): ${rawAmount(p.line5c)}`,
      `Line 6a Gross income from gaming: ${rawAmount(p.line6a)}`,
      `Line 6b Gross income from fundraising events: ${rawAmount(p.line6b)}`,
      `Line 6c Less: direct expenses from gaming and fundraising events: ${rawAmount(p.line6c)}`,
      `Line 6d Net income or (loss) from gaming and fundraising events: ${rawAmount(p.line6d)}`,
      `Line 7a Gross sales of inventory, less returns and allowances: ${rawAmount(p.line7a)}`,
      `Line 7b Less: cost of goods sold: ${rawAmount(p.line7b)}`,
      `Line 7c Gross profit or (loss) from sales of inventory: ${rawAmount(p.line7c)}`,
      `Line 8  Other revenue: ${rawAmount(p.line8)}`,
      `Line 9  TOTAL REVENUE: ${rawAmount(p.line9)}`,
      ``,
      `EXPENSES`,
      `Line 10 Grants and similar amounts paid: ${rawAmount(p.line10)}`,
      `Line 11 Benefits paid to or for members: ${rawAmount(p.line11)}`,
      `Line 12 Salaries, other compensation, and employee benefits: ${rawAmount(p.line12)}`,
      `Line 13 Professional fees and other payments to independent contractors: ${rawAmount(p.line13)}`,
      `Line 14 Occupancy, rent, utilities, and maintenance: ${rawAmount(p.line14)}`,
      `Line 15 Printing, publications, postage, and shipping: ${rawAmount(p.line15)}`,
      `Line 16 Other expenses: ${rawAmount(p.line16)}`,
      `Line 17 TOTAL EXPENSES: ${rawAmount(p.line17)}`,
      ``,
      `NET ASSETS`,
      `Line 18 Excess or (deficit) for the year (line 9 minus line 17): ${rawAmount(p.line18)}`,
      `Line 19 Net assets or fund balances at beginning of year: ${rawAmount(p.line19)}`,
      `Line 20 Other changes in net assets or fund balances: ${rawAmount(p.line20)}`,
      `Line 21 Net assets or fund balances at end of year: ${rawAmount(p.line21)}`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast({ title: "Copied", description: "All Part I values copied to clipboard." });
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const p = reportData.partI;
    const p2 = reportData.partII;

    const csvRows = [
      ["Form 990-EZ Worksheet"],
      [`Organization: ${reportData.organizationName}`],
      [`EIN: ${reportData.ein}`],
      [`Tax Year: ${reportData.taxYear}`],
      [],
      ["PART I - REVENUE, EXPENSES, AND CHANGES IN NET ASSETS OR FUND BALANCES"],
      [],
      ["Line", "Description", "Amount"],
      ["", "REVENUE", ""],
      ["1", "Contributions, gifts, grants, and similar amounts received", rawAmount(p.line1)],
      ["2", "Program service revenue including government fees and contracts", rawAmount(p.line2)],
      ["3", "Membership dues and assessments", rawAmount(p.line3)],
      ["4", "Investment income", rawAmount(p.line4)],
      ["5a", "Gross amount from sale of assets other than inventory", rawAmount(p.line5a)],
      ["5b", "Less: cost or other basis and sales expenses", rawAmount(p.line5b)],
      ["5c", "Gain or (loss) from sale of assets (line 5a minus 5b)", rawAmount(p.line5c)],
      ["6a", "Gross income from gaming", rawAmount(p.line6a)],
      ["6b", "Gross income from fundraising events", rawAmount(p.line6b)],
      ["6c", "Less: direct expenses from gaming and fundraising events", rawAmount(p.line6c)],
      ["6d", "Net income or (loss) from gaming and fundraising events", rawAmount(p.line6d)],
      ["7a", "Gross sales of inventory, less returns and allowances", rawAmount(p.line7a)],
      ["7b", "Less: cost of goods sold", rawAmount(p.line7b)],
      ["7c", "Gross profit or (loss) from sales of inventory", rawAmount(p.line7c)],
      ["8", "Other revenue (describe in Schedule O)", rawAmount(p.line8)],
      ["9", "TOTAL REVENUE (add lines 1, 2, 3, 4, 5c, 6d, 7c, and 8)", rawAmount(p.line9)],
      [],
      ["", "EXPENSES", ""],
      ["10", "Grants and similar amounts paid", rawAmount(p.line10)],
      ["11", "Benefits paid to or for members", rawAmount(p.line11)],
      ["12", "Salaries, other compensation, and employee benefits", rawAmount(p.line12)],
      ["13", "Professional fees and other payments to independent contractors", rawAmount(p.line13)],
      ["14", "Occupancy, rent, utilities, and maintenance", rawAmount(p.line14)],
      ["15", "Printing, publications, postage, and shipping", rawAmount(p.line15)],
      ["16", "Other expenses (describe in Schedule O)", rawAmount(p.line16)],
      ["17", "TOTAL EXPENSES (add lines 10 through 16)", rawAmount(p.line17)],
      [],
      ["", "NET ASSETS OR FUND BALANCES", ""],
      ["18", "Excess or (deficit) for the year (line 9 minus line 17)", rawAmount(p.line18)],
      ["19", "Net assets or fund balances at beginning of year", rawAmount(p.line19)],
      ["20", "Other changes in net assets or fund balances", rawAmount(p.line20)],
      ["21", "Net assets or fund balances at end of year", rawAmount(p.line21)],
      [],
      ["PART II - BALANCE SHEETS"],
      ["Line", "Description", "Beginning of Year", "End of Year"],
      ["22", "Cash, savings, and investments", rawAmount(p2.line22_boa), rawAmount(p2.line22_eoy)],
      ["23", "Land and buildings", rawAmount(p2.line23_boa), rawAmount(p2.line23_eoy)],
      ["24", "Other assets (describe in Schedule O)", rawAmount(p2.line24_boa), rawAmount(p2.line24_eoy)],
      ["25", "Total assets", rawAmount(p2.line25_boa), rawAmount(p2.line25_eoy)],
      ["26", "Total liabilities (describe in Schedule O)", rawAmount(p2.line26_boa), rawAmount(p2.line26_eoy)],
      ["27", "Net assets or fund balances (line 27 of column (B) must agree with line 21)", rawAmount(p2.line27_boa), rawAmount(p2.line27_eoy)],
      [],
      ["FUNCTIONAL EXPENSES BREAKDOWN"],
      ["", "Program Service Expenses", reportData.functionalExpenses.programServiceExpenses],
      ["", "Management & General Expenses", reportData.functionalExpenses.managementExpenses],
      ["", "Fundraising Expenses", reportData.functionalExpenses.fundraisingExpenses],
    ];

    if (reportData.revenueDetails.length > 0) {
      csvRows.push([]);
      csvRows.push(["REVENUE DETAIL"]);
      csvRows.push(["Description", "990-EZ Category", "Amount"]);
      const categoryLabels: Record<string, string> = {
        contribution: "Line 1 - Contributions",
        program_service: "Line 2 - Program Service Revenue",
        membership: "Line 3 - Membership Dues",
        investment: "Line 4 - Investment Income",
        asset_sale: "Line 5 - Sale of Assets",
        fundraising: "Line 6 - Fundraising Events",
        sales: "Line 7 - Sales of Inventory",
        other: "Line 8 - Other Revenue",
      };
      for (const r of reportData.revenueDetails) {
        csvRows.push([r.description, categoryLabels[r.category] || r.category, r.amount]);
      }
    }

    if (reportData.expenseDetails.length > 0) {
      csvRows.push([]);
      csvRows.push(["EXPENSE DETAIL"]);
      csvRows.push(["Description", "990-EZ Category", "Amount"]);
      const expCategoryLabels: Record<string, string> = {
        grants_paid: "Line 10 - Grants Paid",
        member_benefits: "Line 11 - Benefits to Members",
        salaries: "Line 12 - Salaries & Compensation",
        professional_fees: "Line 13 - Professional Fees",
        occupancy: "Line 14 - Occupancy & Utilities",
        printing: "Line 15 - Printing & Postage",
        other_expenses: "Line 16 - Other Expenses",
      };
      for (const e of reportData.expenseDetails) {
        csvRows.push([e.description, expCategoryLabels[e.category] || e.category, e.amount]);
      }
    }

    const escapeCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    const csvContent = csvRows.map(row => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `form-990-ez-worksheet-${taxYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Worksheet exported",
      description: "Form 990-EZ worksheet has been downloaded as CSV.",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-form-990-report">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-form-990-report">
            Form 990-EZ Worksheet
          </h1>
          <p className="text-muted-foreground">
            Line-by-line worksheet for IRS Form 990-EZ filing - hover any line to copy its value
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {reportData && (
            <>
              <Button variant="outline" onClick={handleCopyAllPartI} data-testid="button-copy-all-part1">
                <Copy className="mr-2 h-4 w-4" />
                Copy All Part I
              </Button>
              <Button onClick={handleExportCSV} data-testid="button-export-csv">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Year</CardTitle>
          <CardDescription>Select the tax year for Form 990-EZ reporting</CardDescription>
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

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Generating Form 990-EZ worksheet...</p>
              <p className="text-xs text-muted-foreground mt-2">Compiling financial data for tax year {taxYear}</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Report</h3>
              <p className="text-muted-foreground mb-4">
                Failed to generate the Form 990-EZ data. This may occur if there are no transactions for the selected tax year.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => refetch()} data-testid="button-retry-report">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : reportData ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Part I - Revenue, Expenses, and Changes in Net Assets or Fund Balances
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {reportData.organizationName} {reportData.ein ? `(EIN: ${reportData.ein})` : ''} - Tax Year {reportData.taxYear}
                  </CardDescription>
                </div>
                <Badge variant="secondary">Form 990-EZ</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="mb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Revenue</p>
              </div>
              <FormLine lineNum="1" description="Contributions, gifts, grants, and similar amounts received" amount={reportData.partI.line1} onCopy={copyToClipboard} />
              <FormLine lineNum="2" description="Program service revenue including government fees and contracts" amount={reportData.partI.line2} onCopy={copyToClipboard} />
              <FormLine lineNum="3" description="Membership dues and assessments" amount={reportData.partI.line3} onCopy={copyToClipboard} />
              <FormLine lineNum="4" description="Investment income" amount={reportData.partI.line4} onCopy={copyToClipboard} />
              <FormLine lineNum="5a" description="Gross amount from sale of assets other than inventory" amount={reportData.partI.line5a} onCopy={copyToClipboard} sub />
              <FormLine lineNum="5b" description="Less: cost or other basis and sales expenses" amount={reportData.partI.line5b} onCopy={copyToClipboard} sub />
              <FormLine lineNum="5c" description="Gain or (loss) from sale of assets (line 5a minus 5b)" amount={reportData.partI.line5c} onCopy={copyToClipboard} indent />
              <FormLine lineNum="6a" description="Gross income from gaming" amount={reportData.partI.line6a} onCopy={copyToClipboard} sub />
              <FormLine lineNum="6b" description="Gross income from fundraising events" amount={reportData.partI.line6b} onCopy={copyToClipboard} sub />
              <FormLine lineNum="6c" description="Less: direct expenses from gaming and fundraising events" amount={reportData.partI.line6c} onCopy={copyToClipboard} sub />
              <FormLine lineNum="6d" description="Net income or (loss) from gaming and fundraising events" amount={reportData.partI.line6d} onCopy={copyToClipboard} indent />
              <FormLine lineNum="7a" description="Gross sales of inventory, less returns and allowances" amount={reportData.partI.line7a} onCopy={copyToClipboard} sub />
              <FormLine lineNum="7b" description="Less: cost of goods sold" amount={reportData.partI.line7b} onCopy={copyToClipboard} sub />
              <FormLine lineNum="7c" description="Gross profit or (loss) from sales of inventory" amount={reportData.partI.line7c} onCopy={copyToClipboard} indent />
              <FormLine lineNum="8" description="Other revenue (describe in Schedule O)" amount={reportData.partI.line8} onCopy={copyToClipboard} />
              <div className="border-t my-2" />
              <FormLine lineNum="9" description="Total revenue - Add lines 1, 2, 3, 4, 5c, 6d, 7c, and 8" amount={reportData.partI.line9} bold onCopy={copyToClipboard} />

              <div className="mt-4 mb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Expenses</p>
              </div>
              <FormLine lineNum="10" description="Grants and similar amounts paid" amount={reportData.partI.line10} onCopy={copyToClipboard} />
              <FormLine lineNum="11" description="Benefits paid to or for members" amount={reportData.partI.line11} onCopy={copyToClipboard} />
              <FormLine lineNum="12" description="Salaries, other compensation, and employee benefits" amount={reportData.partI.line12} onCopy={copyToClipboard} />
              <FormLine lineNum="13" description="Professional fees and other payments to independent contractors" amount={reportData.partI.line13} onCopy={copyToClipboard} />
              <FormLine lineNum="14" description="Occupancy, rent, utilities, and maintenance" amount={reportData.partI.line14} onCopy={copyToClipboard} />
              <FormLine lineNum="15" description="Printing, publications, postage, and shipping" amount={reportData.partI.line15} onCopy={copyToClipboard} />
              <FormLine lineNum="16" description="Other expenses (describe in Schedule O)" amount={reportData.partI.line16} onCopy={copyToClipboard} />
              <div className="border-t my-2" />
              <FormLine lineNum="17" description="Total expenses - Add lines 10 through 16" amount={reportData.partI.line17} bold onCopy={copyToClipboard} />

              <div className="mt-4 mb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Net Assets or Fund Balances</p>
              </div>
              <FormLine lineNum="18" description="Excess or (deficit) for the year (line 9 minus line 17)" amount={reportData.partI.line18} bold onCopy={copyToClipboard} />
              <FormLine lineNum="19" description="Net assets or fund balances at beginning of year (from prior year line 27)" amount={reportData.partI.line19} onCopy={copyToClipboard} />
              <FormLine lineNum="20" description="Other changes in net assets or fund balances (explain in Schedule O)" amount={reportData.partI.line20} onCopy={copyToClipboard} />
              <div className="border-t my-2" />
              <FormLine lineNum="21" description="Net assets or fund balances at end of year (combine lines 18 through 20)" amount={reportData.partI.line21} bold onCopy={copyToClipboard} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Part II - Balance Sheets
              </CardTitle>
              <CardDescription>Lines 22-26 require manual entry from your bank statements and financial records. Line 27 is auto-calculated from Part I.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center gap-2 py-1 px-2 text-xs text-muted-foreground font-medium">
                <span className="w-10" />
                <span className="flex-1" />
                <span className="min-w-[90px] text-right">(A) Beginning of year</span>
                <span className="w-6" />
                <span className="min-w-[90px] text-right">(B) End of year</span>
                <span className="w-6" />
              </div>
              <BalanceSheetLine lineNum="22" description="Cash, savings, and investments" boa={reportData.partII.line22_boa} eoy={reportData.partII.line22_eoy} onCopy={copyToClipboard} />
              <BalanceSheetLine lineNum="23" description="Land and buildings" boa={reportData.partII.line23_boa} eoy={reportData.partII.line23_eoy} onCopy={copyToClipboard} />
              <BalanceSheetLine lineNum="24" description="Other assets (describe in Schedule O)" boa={reportData.partII.line24_boa} eoy={reportData.partII.line24_eoy} onCopy={copyToClipboard} />
              <div className="border-t my-2" />
              <BalanceSheetLine lineNum="25" description="Total assets" boa={reportData.partII.line25_boa} eoy={reportData.partII.line25_eoy} bold onCopy={copyToClipboard} />
              <BalanceSheetLine lineNum="26" description="Total liabilities (describe in Schedule O)" boa={reportData.partII.line26_boa} eoy={reportData.partII.line26_eoy} onCopy={copyToClipboard} />
              <div className="border-t my-2" />
              <BalanceSheetLine lineNum="27" description="Net assets or fund balances (line 27 of column (B) must agree with line 21)" boa={reportData.partII.line27_boa} eoy={reportData.partII.line27_eoy} bold onCopy={copyToClipboard} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Functional Expenses Breakdown</CardTitle>
              <CardDescription>How expenses are allocated by function (for Part III)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center py-2 px-3">
                <span className="text-sm font-medium">Program Service Expenses</span>
                <span className="text-sm font-bold tabular-nums" data-testid="text-program-service-expenses">{formatIRSCurrency(reportData.functionalExpenses.programServiceExpenses)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3">
                <span className="text-sm font-medium">Management & General Expenses</span>
                <span className="text-sm font-bold tabular-nums" data-testid="text-management-expenses">{formatIRSCurrency(reportData.functionalExpenses.managementExpenses)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3">
                <span className="text-sm font-medium">Fundraising Expenses</span>
                <span className="text-sm font-bold tabular-nums" data-testid="text-fundraising-expenses">{formatIRSCurrency(reportData.functionalExpenses.fundraisingExpenses)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center py-2 px-3 bg-muted rounded">
                  <span className="text-sm font-bold">Total Functional Expenses</span>
                  <span className="text-sm font-bold tabular-nums">{formatIRSCurrency(reportData.partI.line17)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {reportData.revenueDetails.length > 0 && (
            <Card>
              <CardHeader>
                <button
                  className="flex items-center gap-2 w-full text-left"
                  onClick={() => setShowRevenueDetail(!showRevenueDetail)}
                  data-testid="toggle-revenue-detail"
                >
                  {showRevenueDetail ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-base">Revenue Detail - How transactions were classified</CardTitle>
                </button>
                <CardDescription>Shows which 990-EZ line each income transaction was assigned to</CardDescription>
              </CardHeader>
              {showRevenueDetail && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium text-muted-foreground">Description</th>
                          <th className="text-left p-2 font-medium text-muted-foreground">990-EZ Line</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.revenueDetails.map((item, index) => {
                          const categoryLabels: Record<string, string> = {
                            contribution: "Line 1 - Contributions",
                            program_service: "Line 2 - Program Service",
                            membership: "Line 3 - Membership",
                            investment: "Line 4 - Investment",
                            asset_sale: "Line 5 - Asset Sale",
                            fundraising: "Line 6 - Fundraising",
                            sales: "Line 7 - Inventory Sales",
                            other: "Line 8 - Other",
                          };
                          return (
                            <tr key={index} className="border-b" data-testid={`revenue-detail-${index}`}>
                              <td className="p-2">{item.description}</td>
                              <td className="p-2">
                                <Badge variant="outline">{categoryLabels[item.category] || item.category}</Badge>
                              </td>
                              <td className="p-2 text-right tabular-nums font-medium">{formatIRSCurrency(item.amount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {reportData.expenseDetails.length > 0 && (
            <Card>
              <CardHeader>
                <button
                  className="flex items-center gap-2 w-full text-left"
                  onClick={() => setShowExpenseDetail(!showExpenseDetail)}
                  data-testid="toggle-expense-detail"
                >
                  {showExpenseDetail ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-base">Expense Detail - How transactions were classified</CardTitle>
                </button>
                <CardDescription>Shows which 990-EZ line each expense transaction was assigned to</CardDescription>
              </CardHeader>
              {showExpenseDetail && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium text-muted-foreground">Description</th>
                          <th className="text-left p-2 font-medium text-muted-foreground">990-EZ Line</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.expenseDetails.map((item, index) => {
                          const expCategoryLabels: Record<string, string> = {
                            grants_paid: "Line 10 - Grants Paid",
                            member_benefits: "Line 11 - Member Benefits",
                            salaries: "Line 12 - Salaries",
                            professional_fees: "Line 13 - Professional Fees",
                            occupancy: "Line 14 - Occupancy",
                            printing: "Line 15 - Printing/Postage",
                            other_expenses: "Line 16 - Other",
                          };
                          return (
                            <tr key={index} className="border-b" data-testid={`expense-detail-${index}`}>
                              <td className="p-2">{item.description}</td>
                              <td className="p-2">
                                <Badge variant="outline">{expCategoryLabels[item.category] || item.category}</Badge>
                              </td>
                              <td className="p-2 text-right tabular-nums font-medium">{formatIRSCurrency(item.amount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {reportData.grants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Grants and Similar Amounts Received</CardTitle>
                <CardDescription>Grants recorded in the system for this tax year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium text-muted-foreground">Grantor Name</th>
                        <th className="text-left p-2 font-medium text-muted-foreground">Purpose</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.grants.map((grant, index) => (
                        <tr key={index} className="border-b" data-testid={`grant-${index}`}>
                          <td className="p-2 font-medium" data-testid={`grant-name-${index}`}>{grant.grantorName}</td>
                          <td className="p-2" data-testid={`grant-purpose-${index}`}>{grant.purpose}</td>
                          <td className="p-2 text-right font-bold tabular-nums" data-testid={`grant-amount-${index}`}>{formatIRSCurrency(grant.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

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
                Generate IRS-compliant narrative sections for your Form 990-EZ using AI.
                Review and edit before including in your filing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeNarrativeTab} onValueChange={(v) => setActiveNarrativeTab(v as NarrativeType)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="mission" data-testid="tab-mission">Mission</TabsTrigger>
                  <TabsTrigger value="accomplishments" data-testid="tab-accomplishments">Accomplishments</TabsTrigger>
                  <TabsTrigger value="governance" data-testid="tab-governance">Governance</TabsTrigger>
                  <TabsTrigger value="compensation" data-testid="tab-compensation">Compensation</TabsTrigger>
                </TabsList>

                {(["mission", "accomplishments", "governance", "compensation"] as NarrativeType[]).map((type) => {
                  const labels: Record<NarrativeType, { title: string; hint: string; placeholder: string }> = {
                    mission: {
                      title: "Mission Statement (Part III - Primary Exempt Purpose)",
                      hint: "Describe your organization's primary exempt purpose and most significant activities.",
                      placeholder: "Add any specific programs, achievements, or focus areas you want highlighted...",
                    },
                    accomplishments: {
                      title: "Program Service Accomplishments (Part III)",
                      hint: "Describe your three largest program services by expense, including beneficiaries served.",
                      placeholder: "Describe specific programs, number of people served, geographic areas, partnerships...",
                    },
                    governance: {
                      title: "Governance & Management (Part V / Schedule O)",
                      hint: "Describe your organization's governance structure, policies, and oversight.",
                      placeholder: "Board meeting frequency, conflict of interest policies, document retention...",
                    },
                    compensation: {
                      title: "Compensation Review (Part V / Schedule O)",
                      hint: "Describe the process for reviewing and approving compensation.",
                      placeholder: "Compensation committee structure, use of comparability data, independent review...",
                    },
                  };

                  return (
                    <TabsContent key={type} value={type} className="space-y-4">
                      <div className="space-y-2">
                        <Label>{labels[type].title}</Label>
                        <p className="text-sm text-muted-foreground">{labels[type].hint}</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${type}-context`}>Additional Context (Optional)</Label>
                        <Textarea
                          id={`${type}-context`}
                          placeholder={labels[type].placeholder}
                          value={customContext}
                          onChange={(e) => setCustomContext(e.target.value)}
                          rows={2}
                          data-testid={`input-${type}-context`}
                        />
                      </div>
                      <Button
                        onClick={() => generateNarrativeMutation.mutate({ narrativeType: type, context: customContext })}
                        disabled={generateNarrativeMutation.isPending}
                        data-testid={`button-generate-${type}`}
                      >
                        {generateNarrativeMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate {type.charAt(0).toUpperCase() + type.slice(1)}
                          </>
                        )}
                      </Button>
                      {narratives[type] && (
                        <div className="space-y-2 mt-4">
                          <div className="flex items-center justify-between">
                            <Label>Generated Narrative</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(narratives[type], type)}
                              data-testid={`button-copy-${type}`}
                            >
                              {copiedField === type ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <Textarea
                            value={narratives[type]}
                            onChange={(e) => setNarratives(prev => ({ ...prev, [type]: e.target.value }))}
                            rows={6}
                            data-testid={`textarea-${type}-result`}
                          />
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Options
              </CardTitle>
              <CardDescription>Download or copy your Form 990-EZ data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleExportCSV} data-testid="button-export-cpa-csv">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV (Excel Compatible)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const jsonData = JSON.stringify({
                      organization: reportData.organizationName,
                      ein: reportData.ein,
                      taxYear: reportData.taxYear,
                      partI: reportData.partI,
                      partII: reportData.partII,
                      functionalExpenses: reportData.functionalExpenses,
                      revenueDetails: reportData.revenueDetails,
                      expenseDetails: reportData.expenseDetails,
                      grants: reportData.grants,
                      narratives,
                    }, null, 2);
                    const blob = new Blob([jsonData], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `form-990-ez-data-${taxYear}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                    toast({
                      title: "JSON Data Exported",
                      description: "Complete Form 990-EZ data package has been downloaded.",
                    });
                  }}
                  data-testid="button-export-json"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Export JSON (Full Data Package)
                </Button>
                <Button variant="outline" onClick={handleCopyAllPartI} data-testid="button-copy-summary">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy All Part I Values
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Tip: Hover over any line in the worksheet above to copy individual values. Use "Copy All Part I" to get everything at once.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Filing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Filing Deadline</h4>
                  <p className="text-sm text-muted-foreground">
                    Form 990-EZ is due on the 15th day of the 5th month after your fiscal year ends.
                    For calendar year filers (Jan-Dec), this is typically May 15.
                  </p>
                  <Badge variant="outline">Tax Year {taxYear}: Due May 15, {taxYear + 1}</Badge>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">990-EZ Eligibility</h4>
                  <p className="text-sm text-muted-foreground">
                    Organizations with gross receipts less than $200,000 and total assets less than $500,000 can file Form 990-EZ instead of the full Form 990.
                  </p>
                  {parseInt(reportData.partI.line9) < 200000 ? (
                    <Badge variant="secondary">Eligible for 990-EZ</Badge>
                  ) : (
                    <Badge variant="destructive">May need full Form 990</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Important Note</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This worksheet provides financial data organized by Form 990-EZ line numbers for easy data entry.
                    It should be reviewed by a qualified tax professional before filing. Balance sheet amounts (Part II)
                    may need manual entry if asset and liability tracking is not fully configured.
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
