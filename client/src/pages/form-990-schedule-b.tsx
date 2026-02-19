import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, AlertCircle, RefreshCw, Info, Users, Gift, Copy, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Organization } from "@shared/schema";

interface ScheduleBProps {
  currentOrganization: Organization;
}

interface ScheduleBData {
  organizationName: string;
  ein: string;
  taxYear: number;
  organizationType: string;
  filingRule: string;
  contributionThreshold: number;
  line1Total: string;
  partI: Array<{
    number: number;
    name: string;
    address: string;
    totalContributions: string;
    contributionType: string[];
    hasNoncash: boolean;
  }>;
  partII: Array<{
    contributorNumber: number;
    description: string;
    fairMarketValue: string;
    dateReceived: string;
  }>;
  partIII: Array<{
    contributorNumber: number;
    purposeOfGift: string;
    useOfGift: string;
    descriptionHowHeld: string;
    transfereeName: string;
    transfereeAddress: string;
    relationship: string;
  }>;
  summary: {
    totalContributors: number;
    totalContributions: string;
    noncashContributors: number;
    totalNoncashValue: string;
    meetsGeneralRule: boolean;
    meetsSpecialRule: boolean;
  };
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function CopyableValue({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span
      className="cursor-pointer inline-flex items-center gap-1 group"
      onClick={handleCopy}
      title={`Click to copy: ${value}`}
      data-testid={`copy-value-${label || value}`}
    >
      <span className="tabular-nums">{formatCurrency(value)}</span>
      <span className="invisible group-hover:visible text-muted-foreground">
        {copied ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </span>
    </span>
  );
}

export default function Form990ScheduleB({ currentOrganization }: ScheduleBProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear - 1);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: reportData, isLoading, error, refetch } = useQuery<ScheduleBData>({
    queryKey: [`/api/reports/form-990-schedule-b/${currentOrganization.id}/${taxYear}`],
  });

  const handleExportCSV = () => {
    if (!reportData) return;

    const csvRows: string[][] = [
      ["Schedule B (Form 990) - Schedule of Contributors"],
      [`Organization: ${reportData.organizationName}`],
      [`EIN: ${reportData.ein}`],
      [`Tax Year: ${reportData.taxYear}`],
      [`Organization Type: ${reportData.organizationType}`],
      [`Filing Rule: ${reportData.filingRule === 'special' ? 'Special Rule (501(c)(3) - 33 1/3% support test)' : 'General Rule ($5,000+ contributors)'}`],
      [`Contribution Threshold: ${formatCurrency(reportData.contributionThreshold)}`],
      [`Form 990-EZ Line 1 Total: ${formatCurrency(reportData.line1Total)}`],
      [],
      ["PART I - CONTRIBUTORS"],
      ["(a) No.", "(b) Name", "(b) Address", "(c) Total Contributions", "(d) Type of Contribution"],
    ];

    if (reportData.partI.length === 0) {
      csvRows.push(["", "No contributors met the reporting threshold", "", "", ""]);
    } else {
      for (const c of reportData.partI) {
        csvRows.push([
          String(c.number),
          c.name,
          c.address,
          c.totalContributions,
          c.contributionType.join(", "),
        ]);
      }
    }

    csvRows.push([]);
    csvRows.push(["PART II - NONCASH PROPERTY"]);
    csvRows.push(["(a) No. from Part I", "(b) Description of noncash property given", "(c) FMV (or estimate)", "(d) Date received"]);

    if (reportData.partII.length === 0) {
      csvRows.push(["", "No noncash contributions reported", "", ""]);
    } else {
      for (const nc of reportData.partII) {
        csvRows.push([
          String(nc.contributorNumber),
          nc.description,
          nc.fairMarketValue,
          nc.dateReceived,
        ]);
      }
    }

    csvRows.push([]);
    csvRows.push(["PART III - EXCLUSIVELY RELIGIOUS, CHARITABLE, ETC. CONTRIBUTIONS"]);
    csvRows.push(["Note: Part III applies only to section 501(c)(7), (8), or (10) organizations."]);
    csvRows.push(["Not applicable for 501(c)(3) organizations."]);

    csvRows.push([]);
    csvRows.push(["SUMMARY"]);
    csvRows.push(["Total Contributors Meeting Threshold", String(reportData.summary.totalContributors)]);
    csvRows.push(["Total Contributions from Listed Contributors", reportData.summary.totalContributions]);
    csvRows.push(["Noncash Property Items", String(reportData.summary.noncashContributors)]);
    csvRows.push(["Total Noncash Value", reportData.summary.totalNoncashValue]);
    csvRows.push(["Meets General Rule", reportData.summary.meetsGeneralRule ? "Yes" : "No"]);
    csvRows.push(["Meets Special Rule", reportData.summary.meetsSpecialRule ? "Yes" : "No"]);

    const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `schedule-b-form-990-${taxYear}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "Report exported", description: "Schedule B data has been downloaded as CSV for easy transfer to your filing." });
  };

  return (
    <div className="flex-1 p-6 space-y-6" data-testid="page-schedule-b">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-schedule-b">
            Schedule B (Form 990)
          </h1>
          <p className="text-muted-foreground mt-1">Schedule of Contributors - Attach to Form 990, 990-EZ, or 990-PF</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-schedule-b">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportCSV} disabled={!reportData} data-testid="button-export-schedule-b">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Year Selection</CardTitle>
          <CardDescription>Select the tax year for Schedule B reporting. Lists contributors who gave ${formatCurrency(5000)} or more (or meet the special rule threshold).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="tax-year-schedule-b">Tax Year</Label>
              <Input
                id="tax-year-schedule-b"
                type="number"
                value={taxYear}
                onChange={(e) => setTaxYear(parseInt(e.target.value) || currentYear - 1)}
                className="w-24"
                min={2000}
                max={currentYear}
                data-testid="input-tax-year-schedule-b"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Generating Schedule B data...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Error Loading Schedule B</h3>
                <p className="text-sm text-muted-foreground">
                  Failed to generate Schedule B data. This may occur if there are no transactions for the selected period.
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3" data-testid="button-retry-schedule-b">
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {reportData && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-schedule-b">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="partI" data-testid="tab-part-i">Part I - Contributors</TabsTrigger>
            <TabsTrigger value="partII" data-testid="tab-part-ii">Part II - Noncash</TabsTrigger>
            <TabsTrigger value="partIII" data-testid="tab-part-iii">Part III</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Filing Information
                </CardTitle>
                <CardDescription>Schedule B filing requirements and thresholds for {reportData.taxYear}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Organization</span>
                      <p className="font-medium" data-testid="text-org-name">{reportData.organizationName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">EIN</span>
                      <p className="font-medium" data-testid="text-ein">{reportData.ein || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Organization Type</span>
                      <p className="font-medium" data-testid="text-org-type">{reportData.organizationType}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Form 990-EZ Line 1 (Total Contributions)</span>
                      <p className="font-medium" data-testid="text-line1-total">{formatCurrency(reportData.line1Total)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Reporting Threshold</span>
                      <p className="font-medium" data-testid="text-threshold">{formatCurrency(reportData.contributionThreshold)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Filing Rule Applied</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={reportData.filingRule === 'special' ? 'default' : 'secondary'} data-testid="badge-filing-rule">
                          {reportData.filingRule === 'special' ? 'Special Rule' : 'General Rule'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold text-sm mb-2">Filing Rule Explanation</h4>
                  {reportData.filingRule === 'special' ? (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Your organization qualifies under the <strong>Special Rule</strong> for section 501(c)(3) organizations that meet the 33 1/3% support test.</p>
                      <p>You must list contributors whose total contributions exceed the greater of:</p>
                      <ul className="list-disc list-inside ml-2">
                        <li>$5,000, or</li>
                        <li>2% of Form 990-EZ, Line 1 ({formatCurrency(reportData.line1Total)}) = {formatCurrency(parseFloat(reportData.line1Total) * 0.02)}</li>
                      </ul>
                      <p>Applied threshold: <strong>{formatCurrency(reportData.contributionThreshold)}</strong></p>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      <p>Under the <strong>General Rule</strong>, you must report all contributors who gave $5,000 or more during the tax year.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-md bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-total-contributors">{reportData.summary.totalContributors}</p>
                    <p className="text-xs text-muted-foreground">Contributors Listed</p>
                  </div>
                  <div className="text-center p-3 rounded-md bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-total-contributions">{formatCurrency(reportData.summary.totalContributions)}</p>
                    <p className="text-xs text-muted-foreground">Total from Listed</p>
                  </div>
                  <div className="text-center p-3 rounded-md bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-noncash-items">{reportData.summary.noncashContributors}</p>
                    <p className="text-xs text-muted-foreground">Noncash Items</p>
                  </div>
                  <div className="text-center p-3 rounded-md bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-noncash-value">{formatCurrency(reportData.summary.totalNoncashValue)}</p>
                    <p className="text-xs text-muted-foreground">Noncash FMV Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">About Schedule B</p>
                    <p>Schedule B lists contributors who gave {formatCurrency(reportData.contributionThreshold)} or more during the tax year. For 501(c)(3) organizations, contributor names and addresses are <strong>not</strong> required to be made public. All dollar amounts are whole numbers for IRS formatting. Click any amount to copy it.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partI" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Part I - Contributors
                </CardTitle>
                <CardDescription>
                  Contributors who gave {formatCurrency(reportData.contributionThreshold)} or more during {reportData.taxYear}. Use duplicate copies of Part I if additional space is needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportData.partI.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No contributors met the reporting threshold</p>
                    <p className="text-sm mt-1">No individual contributor gave {formatCurrency(reportData.contributionThreshold)} or more during {reportData.taxYear}.</p>
                    <p className="text-sm mt-2">If no contributors meet the threshold, check the box on Form 990-EZ Line H to certify your organization doesn't meet Schedule B filing requirements.</p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">(a) No.</TableHead>
                          <TableHead className="min-w-[200px]">(b) Name, address, and ZIP + 4</TableHead>
                          <TableHead className="text-right min-w-[130px]">(c) Total contributions</TableHead>
                          <TableHead className="min-w-[120px]">(d) Type of contribution</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.partI.map((contributor) => (
                          <TableRow key={contributor.number} data-testid={`row-contributor-${contributor.number}`}>
                            <TableCell className="font-medium">{contributor.number}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{contributor.name}</p>
                                {contributor.address && (
                                  <p className="text-sm text-muted-foreground">{contributor.address}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <CopyableValue value={contributor.totalContributions} label={`contributor-${contributor.number}`} />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {contributor.contributionType.map((type) => (
                                  <Badge key={type} variant={type === 'Noncash' ? 'outline' : 'secondary'} className="text-xs w-fit">
                                    {type}
                                  </Badge>
                                ))}
                                {contributor.hasNoncash && (
                                  <span className="text-xs text-muted-foreground">(Complete Part II)</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partII" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Part II - Noncash Property
                </CardTitle>
                <CardDescription>
                  Noncash contributions received during {reportData.taxYear}. Use duplicate copies of Part II if additional space is needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportData.partII.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No noncash contributions reported</p>
                    <p className="text-sm mt-1">No in-kind donations were recorded for {reportData.taxYear}.</p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">(a) No. from Part I</TableHead>
                          <TableHead className="min-w-[250px]">(b) Description of noncash property given</TableHead>
                          <TableHead className="text-right min-w-[130px]">(c) FMV (or estimate)</TableHead>
                          <TableHead className="min-w-[120px]">(d) Date received</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.partII.map((item, idx) => (
                          <TableRow key={idx} data-testid={`row-noncash-${idx}`}>
                            <TableCell className="font-medium">{item.contributorNumber || 'N/A'}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">
                              <CopyableValue value={item.fairMarketValue} label={`noncash-${idx}`} />
                            </TableCell>
                            <TableCell>{item.dateReceived}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partIII" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Part III - Exclusively Religious, Charitable, etc., Contributions
                </CardTitle>
                <CardDescription>
                  For organizations described in section 501(c)(7), (8), or (10) only.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Not Applicable</p>
                  <p className="text-sm mt-1">Part III applies only to section 501(c)(7), (8), or (10) organizations that received contributions exclusively for religious, charitable, scientific, literary, or educational purposes, or for the prevention of cruelty to children or animals.</p>
                  <p className="text-sm mt-2">As a 501(c)(3) organization, this part does not apply to your filing.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
