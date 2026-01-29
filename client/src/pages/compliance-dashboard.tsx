import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Target, 
  TrendingUp,
  Calendar,
  AlertTriangle,
  Download,
  FileBarChart
} from "lucide-react";
import { format, differenceInDays, isBefore, parseISO } from "date-fns";
import type { Organization, Grant } from "@shared/schema";
import { useLocation } from "wouter";
import html2pdf from "html2pdf.js";

interface ComplianceDashboardProps {
  currentOrganization: Organization;
}

interface ComplianceMetrics {
  totalGrants: number;
  activeGrants: number;
  upcomingDeadlines: number;
  overdueItems: number;
  completedReports: number;
  pendingReports: number;
}

interface GrantCompliance {
  grant: Grant;
  timeEffortReports: { total: number; pending: number; certified: number };
  costAllowabilityChecks: { total: number; pending: number; approved: number };
  federalReports: { total: number; pending: number; submitted: number };
  auditPrepItems: { total: number; pending: number; completed: number };
  nextDeadline: Date | null;
  complianceScore: number;
}

interface GrantTransaction {
  id: number;
  date: string;
  description: string;
  amount: string;
  type: string;
  categoryName?: string;
}

export default function ComplianceDashboard({ currentOrganization }: ComplianceDashboardProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedGrantId, setSelectedGrantId] = useState<number | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);

  const { data: grants = [], isLoading: grantsLoading, error } = useQuery<Grant[]>({
    queryKey: [`/api/grants/${currentOrganization.id}`],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<ComplianceMetrics>({
    queryKey: [`/api/compliance/${currentOrganization.id}/metrics`],
  });

  const { data: grantCompliance = [], isLoading: complianceLoading } = useQuery<GrantCompliance[]>({
    queryKey: [`/api/compliance/${currentOrganization.id}/grants`],
  });

  interface SurveyResponse {
    id: number;
    formId: number;
    formTitle?: string;
    respondentName: string | null;
    respondentEmail: string | null;
    submittedAt: string;
    answers: Record<string, any>;
  }

  const { data: surveyResponses = [] } = useQuery<SurveyResponse[]>({
    queryKey: [`/api/forms/${currentOrganization.id}/recent-responses`],
  });

  const { data: grantTransactions = [] } = useQuery<GrantTransaction[]>({
    queryKey: [`/api/transactions/${currentOrganization.id}`, { grantId: selectedGrantId }],
    enabled: !!selectedGrantId && isDrillDownOpen,
  });

  const selectedGrant = selectedGrantId ? grants.find(g => g.id === selectedGrantId) : null;
  const selectedGrantCompliance = selectedGrantId ? grantCompliance.find(gc => gc.grant.id === selectedGrantId) : null;

  const openGrantDrillDown = (grantId: number) => {
    setSelectedGrantId(grantId);
    setIsDrillDownOpen(true);
  };

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Session expired",
        description: "Please log in again",
        variant: "destructive",
      });
      setLocation("/login");
    }
  }, [error, toast, setLocation]);

  const getComplianceColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getComplianceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Needs Attention</Badge>;
  };

  const getDaysUntil = (date: Date | null) => {
    if (!date) return null;
    return differenceInDays(date, new Date());
  };

  const generateForm990PDF = async () => {
    try {
      const currentYear = new Date().getFullYear() - 1;
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      
      const response = await fetch(`/api/transactions/${currentOrganization.id}?startDate=${startDate}&endDate=${endDate}`);
      const transactions = response.ok ? await response.json() : [];
      
      const revenue = transactions.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      const expenses = transactions.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      const programExpenses = transactions.filter((t: any) => t.type === 'expense' && t.functionalCategory === 'program').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      const managementExpenses = transactions.filter((t: any) => t.type === 'expense' && t.functionalCategory === 'management').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      const fundraisingExpenses = transactions.filter((t: any) => t.type === 'expense' && t.functionalCategory === 'fundraising').reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const pdfContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; font-size: 11px; line-height: 1.4;">
          <div style="text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
            <div style="font-size: 18px; font-weight: bold;">Form 990</div>
            <div style="font-size: 14px; margin-top: 5px;">Return of Organization Exempt From Income Tax</div>
            <div style="font-size: 11px; margin-top: 5px;">Under section 501(c), 527, or 4947(a)(1) of the Internal Revenue Code (except private foundations)</div>
            <div style="font-size: 10px; margin-top: 10px; color: #666;">OMB No. 1545-0047 | Tax Year: ${currentYear}</div>
          </div>

          <div style="background: #f0f0f0; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
            <div style="font-weight: bold; margin-bottom: 5px;">PREPARATION WORKSHEET</div>
            <div style="font-size: 10px; color: #666;">This worksheet provides a starting point based on your recorded financial data. Consult with a tax professional to complete and file your official Form 990.</div>
          </div>

          <div style="background: #fff; border: 2px solid #000; padding: 15px; margin-bottom: 20px;">
            <div style="font-weight: bold; font-size: 13px; margin-bottom: 10px;">Organization Information</div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px;"><strong>Name:</strong></td>
                <td style="padding: 5px;">${currentOrganization.name}</td>
              </tr>
              <tr style="background: #fef9e7;">
                <td style="padding: 5px;"><strong>EIN:</strong></td>
                <td style="padding: 5px; font-style: italic; color: #666;">[Complete this field]</td>
              </tr>
              <tr>
                <td style="padding: 5px;"><strong>Tax Year:</strong></td>
                <td style="padding: 5px;">${currentYear} (January 1 - December 31)</td>
              </tr>
            </table>
          </div>

          <div style="border: 2px solid #000; padding: 15px; margin-bottom: 20px;">
            <div style="font-weight: bold; font-size: 13px; background: #000; color: #fff; padding: 5px; margin: -15px -15px 10px -15px;">Part I: Summary</div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px; width: 60px;">1</td>
                <td style="padding: 8px;">Brief description of organization's mission:</td>
                <td style="padding: 8px; background: #fef9e7; font-style: italic;">[Enter mission statement]</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;">6</td>
                <td style="padding: 8px;">Number of voting members of governing body:</td>
                <td style="padding: 8px; background: #fef9e7; font-style: italic;">[Complete]</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;">7a</td>
                <td style="padding: 8px;">Number of employees:</td>
                <td style="padding: 8px; background: #fef9e7; font-style: italic;">[Complete]</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;">8</td>
                <td style="padding: 8px;">Total gross revenue (from financial records):</td>
                <td style="padding: 8px; font-weight: bold;">$${revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;">9</td>
                <td style="padding: 8px;">Total program service expenses:</td>
                <td style="padding: 8px; font-weight: bold;">$${programExpenses.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;">19</td>
                <td style="padding: 8px;">Total revenue:</td>
                <td style="padding: 8px; font-weight: bold;">$${revenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              </tr>
              <tr>
                <td style="padding: 8px;">20</td>
                <td style="padding: 8px;">Total expenses:</td>
                <td style="padding: 8px; font-weight: bold;">$${expenses.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              </tr>
            </table>
          </div>

          <div style="border: 2px solid #000; padding: 15px; margin-bottom: 20px;">
            <div style="font-weight: bold; font-size: 13px; background: #000; color: #fff; padding: 5px; margin: -15px -15px 10px -15px;">Part IX: Statement of Functional Expenses</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="background: #e0e0e0; font-weight: bold;">
                  <th style="padding: 6px; border: 1px solid #999; text-align: left;">Expense Category</th>
                  <th style="padding: 6px; border: 1px solid #999; text-align: right;">Total</th>
                  <th style="padding: 6px; border: 1px solid #999; text-align: right;">Program Services</th>
                  <th style="padding: 6px; border: 1px solid #999; text-align: right;">Management</th>
                  <th style="padding: 6px; border: 1px solid #999; text-align: right;">Fundraising</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 6px; border: 1px solid #ddd;">Total functional expenses</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">$${expenses.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">$${programExpenses.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">$${managementExpenses.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">$${fundraisingExpenses.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
              </tbody>
            </table>
            <div style="margin-top: 10px; font-size: 10px; color: #666;">
              <strong>Note:</strong> Detailed expense breakdown by line item (compensation, supplies, occupancy, etc.) should be completed with your accountant.
            </div>
          </div>

          <div style="background: #fffacd; border: 2px solid #f0ad4e; padding: 12px; border-radius: 4px; margin-top: 20px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Additional Sections Required:</div>
            <ul style="margin: 5px 0; padding-left: 20px; font-size: 10px;">
              <li>Part II: Signature Block (must be signed by officer)</li>
              <li>Part III: Statement of Program Service Accomplishments</li>
              <li>Part IV: Checklist of Required Schedules</li>
              <li>Part V: Statements Regarding Other IRS Filings</li>
              <li>Part VI: Governance, Management, and Disclosure</li>
              <li>Part VII: Compensation of Officers, Directors, etc.</li>
              <li>Part VIII: Statement of Revenue</li>
              <li>Part X: Balance Sheet</li>
              <li>Part XI: Reconciliation of Net Assets</li>
              <li>Part XII: Financial Statements and Reporting</li>
              <li>Applicable Schedules (A, B, C, D, etc. as required)</li>
            </ul>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #5bc0de; font-size: 10px;">
            <div style="font-weight: bold; margin-bottom: 5px;">Important:</div>
            <p style="margin: 0;">This worksheet is generated from your ComplyBook financial data for tax year ${currentYear}. It provides a starting point for Form 990 preparation but is NOT a complete filing. Work with a qualified CPA or tax professional to:</p>
            <ul style="margin: 5px 0; padding-left: 20px;">
              <li>Complete all required fields marked with yellow highlighting</li>
              <li>Verify accuracy of all financial figures</li>
              <li>Complete all applicable schedules</li>
              <li>Ensure compliance with IRS requirements</li>
              <li>Sign and file the official Form 990</li>
            </ul>
          </div>

          <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #999;">
            Generated ${format(new Date(), 'MMMM d, yyyy')} | ${currentOrganization.name}
          </div>
        </div>
      `;

      const opt = {
        margin: 0.5,
        filename: `Form-990-Worksheet_${currentOrganization.name.replace(/[^a-z0-9]/gi, '_')}_${currentYear}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
      };

      html2pdf().set(opt).from(pdfContent).save();
      
      toast({ 
        title: "Form 990 Worksheet Generated", 
        description: `Tax year ${currentYear} preparation worksheet has been downloaded.`
      });
    } catch (err) {
      console.error('Form 990 generation error:', err);
      toast({ 
        title: "Error generating Form 990", 
        description: "Please try again or contact support.", 
        variant: "destructive" 
      });
    }
  };

  if (grantsLoading || metricsLoading || complianceLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="compliance-dashboard">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor grant compliance, deadlines, and audit readiness
        </p>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Grants</p>
                <p className="text-2xl font-bold" data-testid="metric-active-grants">
                  {metrics?.activeGrants || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-md">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Deadlines</p>
                <p className="text-2xl font-bold" data-testid="metric-upcoming-deadlines">
                  {metrics?.upcomingDeadlines || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-md">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Items</p>
                <p className="text-2xl font-bold" data-testid="metric-overdue-items">
                  {metrics?.overdueItems || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-md">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Reports</p>
                <p className="text-2xl font-bold" data-testid="metric-completed-reports">
                  {metrics?.completedReports || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grant Compliance Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Grant Compliance Status</CardTitle>
              <CardDescription>Overview of compliance for all active grants</CardDescription>
            </div>
            <Button onClick={() => setLocation("/government-grants")} data-testid="button-manage-grants">
              Manage Grants
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {grantCompliance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No active grants to monitor</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setLocation("/government-grants")}
                data-testid="button-add-first-grant"
              >
                Add Your First Grant
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {grantCompliance.map((gc) => (
                <Card 
                  key={gc.grant.id} 
                  className="hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => openGrantDrillDown(gc.grant.id)}
                  data-testid={`grant-card-${gc.grant.id}`}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Grant Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold" data-testid={`grant-name-${gc.grant.id}`}>
                              {gc.grant.name}
                            </h3>
                            {getComplianceBadge(gc.complianceScore)}
                            <Badge variant="outline" className="text-xs">Click for details</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Grantor: {gc.grant.grantorContact || 'N/A'}</span>
                            <span>Award: ${parseFloat(gc.grant.amount).toLocaleString()}</span>
                            {gc.nextDeadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Next deadline: {format(gc.nextDeadline, 'MMM dd, yyyy')} 
                                ({getDaysUntil(gc.nextDeadline)} days)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getComplianceColor(gc.complianceScore)}`}>
                            {gc.complianceScore}%
                          </div>
                          <div className="text-xs text-muted-foreground">Compliance Score</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <Progress value={gc.complianceScore} className="h-2" />

                      {/* Compliance Items Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Time/Effort Reports */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Time/Effort Reports</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              {gc.timeEffortReports.certified}/{gc.timeEffortReports.total} certified
                            </div>
                            {gc.timeEffortReports.pending > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {gc.timeEffortReports.pending} pending
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Cost Allowability */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Cost Checks</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              {gc.costAllowabilityChecks.approved}/{gc.costAllowabilityChecks.total} approved
                            </div>
                            {gc.costAllowabilityChecks.pending > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {gc.costAllowabilityChecks.pending} pending
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Federal Reports */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Federal Reports</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              {gc.federalReports.submitted}/{gc.federalReports.total} submitted
                            </div>
                            {gc.federalReports.pending > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {gc.federalReports.pending} pending
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Audit Prep */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Audit Prep</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              {gc.auditPrepItems.completed}/{gc.auditPrepItems.total} completed
                            </div>
                            {gc.auditPrepItems.pending > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {gc.auditPrepItems.pending} pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form 990 Tools */}
      <Card data-testid="card-form-990-tools">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileBarChart className="h-5 w-5" />
                IRS Form 990 Tools
              </CardTitle>
              <CardDescription>Annual tax return preparation for nonprofit organizations</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-4">
                Form 990 is the annual tax return for tax-exempt organizations. Generate a preparation worksheet pre-filled with your organization's financial data to assist with filing.
              </p>
              <Button 
                onClick={generateForm990PDF}
                data-testid="button-generate-form-990"
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Generate Form 990 Preparation Worksheet
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              <p><strong>Note:</strong> This worksheet provides a starting point based on your recorded financial data. Consult with a tax professional or CPA to complete and file your official Form 990.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Survey Integration for Impact Narratives */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileBarChart className="h-5 w-5" />
                Survey Responses for Impact Reporting
              </CardTitle>
              <CardDescription>Recent survey responses that can be used for compliance narratives</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setLocation("/surveys")} data-testid="button-view-all-surveys">
              View All Surveys
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {surveyResponses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileBarChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No survey responses available</p>
              <p className="text-sm mt-1">Create surveys to gather impact data for compliance reports</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setLocation("/surveys")}
                data-testid="button-create-survey"
              >
                Create Survey
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Use these responses to support your grant impact narratives and compliance documentation.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Survey</TableHead>
                    <TableHead>Respondent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveyResponses.slice(0, 5).map((response) => (
                    <TableRow key={response.id}>
                      <TableCell className="text-sm">
                        {format(parseISO(response.submittedAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {response.formTitle || `Survey #${response.formId}`}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {response.respondentName || response.respondentEmail || 'Anonymous'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const narrativeText = Object.entries(response.answers || {})
                              .map(([q, a]) => `${q}: ${a}`)
                              .join('\n');
                            navigator.clipboard.writeText(narrativeText);
                            toast({
                              title: "Copied to clipboard",
                              description: "Survey response copied for use in compliance narrative.",
                            });
                          }}
                          data-testid={`button-copy-response-${response.id}`}
                        >
                          Copy for Narrative
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {surveyResponses.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing 5 of {surveyResponses.length} responses
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common compliance tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => setLocation("/government-grants")}
              data-testid="button-submit-time-effort"
            >
              <Clock className="h-8 w-8" />
              <span className="font-medium">Submit Time/Effort Report</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => setLocation("/government-grants")}
              data-testid="button-review-costs"
            >
              <Target className="h-8 w-8" />
              <span className="font-medium">Review Cost Allowability</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => setLocation("/government-grants")}
              data-testid="button-file-federal-report"
            >
              <FileText className="h-8 w-8" />
              <span className="font-medium">File Federal Report</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => setLocation("/government-grants")}
              data-testid="button-audit-checklist"
            >
              <CheckCircle2 className="h-8 w-8" />
              <span className="font-medium">Audit Checklist</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grant Drill-Down Dialog */}
      <Dialog open={isDrillDownOpen} onOpenChange={setIsDrillDownOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {selectedGrant?.name || 'Grant Details'}
            </DialogTitle>
            <DialogDescription>
              View linked transactions, budget status, and compliance details
            </DialogDescription>
          </DialogHeader>
          
          {selectedGrant && selectedGrantCompliance && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
                <TabsTrigger value="budget" data-testid="tab-budget">Budget</TabsTrigger>
                <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Award Amount</p>
                      <p className="text-2xl font-bold">${parseFloat(selectedGrant.amount).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Compliance Score</p>
                      <p className={`text-2xl font-bold ${getComplianceColor(selectedGrantCompliance.complianceScore)}`}>
                        {selectedGrantCompliance.complianceScore}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className="mt-1">{selectedGrant.status}</Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Period</p>
                      <p className="text-sm">
                        {selectedGrant.startDate ? format(new Date(selectedGrant.startDate), 'MMM d, yyyy') : 'N/A'} - 
                        {selectedGrant.endDate ? format(new Date(selectedGrant.endDate), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Grant Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Grant Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedGrant.grantorContact && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Grantor Contact</span>
                        <span className="text-sm font-medium">{selectedGrant.grantorContact}</span>
                      </div>
                    )}
                    {selectedGrant.grantorEmail && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Grantor Email</span>
                        <span className="text-sm font-medium">{selectedGrant.grantorEmail}</span>
                      </div>
                    )}
                    {selectedGrant.grantorPhone && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Grantor Phone</span>
                        <span className="text-sm font-medium">{selectedGrant.grantorPhone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Fund Type</span>
                      <Badge variant="outline">{selectedGrant.fundType}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transactions" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Linked Transactions</CardTitle>
                    <CardDescription>Expenses and income recorded against this grant</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {grantTransactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No transactions linked to this grant</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {grantTransactions.slice(0, 10).map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell>{format(parseISO(tx.date), 'MMM d, yyyy')}</TableCell>
                              <TableCell>{tx.description}</TableCell>
                              <TableCell>{tx.categoryName || 'Uncategorized'}</TableCell>
                              <TableCell>
                                <Badge variant={tx.type === 'income' ? 'default' : 'secondary'}>
                                  {tx.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${parseFloat(tx.amount).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    {grantTransactions.length > 10 && (
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        Showing first 10 of {grantTransactions.length} transactions
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="budget" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Budget Overview</CardTitle>
                    <CardDescription>Grant spending vs. budget allocation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Total Budget</span>
                        <span className="font-bold">${parseFloat(selectedGrant.amount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Spent to Date</span>
                        <span className="font-bold text-red-600">
                          ${grantTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Remaining</span>
                        <span className="font-bold text-green-600">
                          ${(parseFloat(selectedGrant.amount) - grantTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0)).toLocaleString()}
                        </span>
                      </div>
                      <Progress 
                        value={(grantTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0) / parseFloat(selectedGrant.amount)) * 100} 
                        className="h-3" 
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        {((grantTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0) / parseFloat(selectedGrant.amount)) * 100).toFixed(1)}% of budget spent
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="compliance" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Time/Effort Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total</span>
                          <span>{selectedGrantCompliance.timeEffortReports.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Certified</span>
                          <span className="text-green-600">{selectedGrantCompliance.timeEffortReports.certified}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Pending</span>
                          <span className="text-yellow-600">{selectedGrantCompliance.timeEffortReports.pending}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Cost Allowability Checks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total</span>
                          <span>{selectedGrantCompliance.costAllowabilityChecks.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Approved</span>
                          <span className="text-green-600">{selectedGrantCompliance.costAllowabilityChecks.approved}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Pending</span>
                          <span className="text-yellow-600">{selectedGrantCompliance.costAllowabilityChecks.pending}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Federal Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total</span>
                          <span>{selectedGrantCompliance.federalReports.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Submitted</span>
                          <span className="text-green-600">{selectedGrantCompliance.federalReports.submitted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Pending</span>
                          <span className="text-yellow-600">{selectedGrantCompliance.federalReports.pending}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Audit Prep Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total</span>
                          <span>{selectedGrantCompliance.auditPrepItems.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Completed</span>
                          <span className="text-green-600">{selectedGrantCompliance.auditPrepItems.completed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Pending</span>
                          <span className="text-yellow-600">{selectedGrantCompliance.auditPrepItems.pending}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
