import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Clock, DollarSign, Users, FileText, CheckCircle, AlertCircle, Plus, Edit, Trash2, FileCheck, AlertTriangle, UserCheck } from "lucide-react";
import type { Organization } from "@shared/schema";

interface GovernmentGrantsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function GovernmentGrants({ currentOrganization, userId }: GovernmentGrantsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("time-effort");

  // Time/Effort Reporting State
  const [isCreateTimeEffortOpen, setIsCreateTimeEffortOpen] = useState(false);
  const [editingTimeEffort, setEditingTimeEffort] = useState<any | null>(null);
  const [timeEffortFormData, setTimeEffortFormData] = useState({
    employeeId: "",
    grantId: "",
    reportingPeriodStart: new Date().toISOString().split('T')[0],
    reportingPeriodEnd: new Date().toISOString().split('T')[0],
    totalHours: "",
    grantHours: "",
    otherActivitiesHours: "",
    percentageEffort: "",
    certificationDate: "",
    certifiedBy: "",
    notes: "",
  });

  // Cost Allowability State
  const [isCreateCostCheckOpen, setIsCreateCostCheckOpen] = useState(false);
  const [editingCostCheck, setEditingCostCheck] = useState<any | null>(null);
  const [costCheckFormData, setCostCheckFormData] = useState({
    transactionId: "",
    grantId: "",
    costCategory: "",
    amount: "",
    allowabilityStatus: "pending" as "pending" | "allowable" | "unallowable" | "questionable",
    reviewedBy: "",
    reviewDate: "",
    justification: "",
    notes: "",
  });

  // Sub Award Monitoring State
  const [isCreateSubAwardOpen, setIsCreateSubAwardOpen] = useState(false);
  const [editingSubAward, setEditingSubAward] = useState<any | null>(null);
  const [subAwardFormData, setSubAwardFormData] = useState({
    grantId: "",
    subrecipientName: "",
    subrecipientEIN: "",
    awardAmount: "",
    awardDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    purpose: "",
    status: "active" as "active" | "completed" | "terminated",
    complianceStatus: "compliant" as "compliant" | "non_compliant" | "under_review",
    lastMonitoringDate: "",
    nextMonitoringDate: "",
    notes: "",
  });

  // Federal Financial Report State
  const [isCreateFFROpen, setIsCreateFFROpen] = useState(false);
  const [editingFFR, setEditingFFR] = useState<any | null>(null);
  const [ffrFormData, setFFRFormData] = useState({
    grantId: "",
    reportingPeriodStart: new Date().toISOString().split('T')[0],
    reportingPeriodEnd: new Date().toISOString().split('T')[0],
    federalShareExpenditure: "",
    recipientShareExpenditure: "",
    totalExpenditure: "",
    unliquidatedObligations: "",
    recipientShareUnliquidated: "",
    programIncomeEarned: "",
    programIncomeExpended: "",
    status: "draft" as "draft" | "submitted" | "approved",
    submittedDate: "",
    approvedDate: "",
    notes: "",
  });

  // Audit Prep State
  const [isCreateAuditItemOpen, setIsCreateAuditItemOpen] = useState(false);
  const [editingAuditItem, setEditingAuditItem] = useState<any | null>(null);
  const [auditItemFormData, setAuditItemFormData] = useState({
    auditYear: new Date().getFullYear().toString(),
    itemType: "single_audit" as "single_audit" | "form_990" | "schedule_of_expenditures",
    description: "",
    grantId: "",
    amount: "",
    completionStatus: "not_started" as "not_started" | "in_progress" | "completed",
    assignedTo: "",
    dueDate: "",
    completedDate: "",
    findings: "",
    notes: "",
  });

  // Fetch data for dropdowns
  const { data: grants = [] } = useQuery({
    queryKey: [`/api/grants/${currentOrganization.id}`],
  });

  const { data: employees = [] } = useQuery({
    queryKey: [`/api/employees/${currentOrganization.id}`],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: [`/api/transactions/${currentOrganization.id}`],
  });

  // Fetch Time/Effort Reports
  const { data: timeEffortReports = [], isLoading: loadingTimeEffort } = useQuery({
    queryKey: [`/api/time-effort-reports/${currentOrganization.id}`],
  });

  // Fetch Cost Allowability Checks
  const { data: costChecks = [], isLoading: loadingCostChecks } = useQuery({
    queryKey: [`/api/cost-allowability-checks/${currentOrganization.id}`],
  });

  // Fetch Sub Awards
  const { data: subAwards = [], isLoading: loadingSubAwards } = useQuery({
    queryKey: [`/api/sub-awards/${currentOrganization.id}`],
  });

  // Fetch Federal Financial Reports
  const { data: federalReports = [], isLoading: loadingFederalReports } = useQuery({
    queryKey: [`/api/federal-financial-reports/${currentOrganization.id}`],
  });

  // Fetch Audit Prep Items
  const { data: auditItems = [], isLoading: loadingAuditItems } = useQuery({
    queryKey: [`/api/audit-prep-items/${currentOrganization.id}`],
  });

  // Reset forms
  const resetTimeEffortForm = () => {
    setTimeEffortFormData({
      employeeId: "",
      grantId: "",
      reportingPeriodStart: new Date().toISOString().split('T')[0],
      reportingPeriodEnd: new Date().toISOString().split('T')[0],
      totalHours: "",
      grantHours: "",
      otherActivitiesHours: "",
      percentageEffort: "",
      certificationDate: "",
      certifiedBy: "",
      notes: "",
    });
  };

  const resetCostCheckForm = () => {
    setCostCheckFormData({
      transactionId: "",
      grantId: "",
      costCategory: "",
      amount: "",
      allowabilityStatus: "pending",
      reviewedBy: "",
      reviewDate: "",
      justification: "",
      notes: "",
    });
  };

  const resetSubAwardForm = () => {
    setSubAwardFormData({
      grantId: "",
      subrecipientName: "",
      subrecipientEIN: "",
      awardAmount: "",
      awardDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      purpose: "",
      status: "active",
      complianceStatus: "compliant",
      lastMonitoringDate: "",
      nextMonitoringDate: "",
      notes: "",
    });
  };

  const resetFFRForm = () => {
    setFFRFormData({
      grantId: "",
      reportingPeriodStart: new Date().toISOString().split('T')[0],
      reportingPeriodEnd: new Date().toISOString().split('T')[0],
      federalShareExpenditure: "",
      recipientShareExpenditure: "",
      totalExpenditure: "",
      unliquidatedObligations: "",
      recipientShareUnliquidated: "",
      programIncomeEarned: "",
      programIncomeExpended: "",
      status: "draft",
      submittedDate: "",
      approvedDate: "",
      notes: "",
    });
  };

  const resetAuditItemForm = () => {
    setAuditItemFormData({
      auditYear: new Date().getFullYear().toString(),
      itemType: "single_audit",
      description: "",
      grantId: "",
      amount: "",
      completionStatus: "not_started",
      assignedTo: "",
      dueDate: "",
      completedDate: "",
      findings: "",
      notes: "",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Government Grants</h1>
          <p className="text-muted-foreground">Manage grant compliance, reporting, and monitoring</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full" data-testid="tabs-government-grants">
          <TabsTrigger value="time-effort" data-testid="tab-time-effort">
            <Clock className="h-4 w-4 mr-2" />
            Time/Effort
          </TabsTrigger>
          <TabsTrigger value="cost-allowability" data-testid="tab-cost-allowability">
            <DollarSign className="h-4 w-4 mr-2" />
            Cost Allowability
          </TabsTrigger>
          <TabsTrigger value="sub-awards" data-testid="tab-sub-awards">
            <Users className="h-4 w-4 mr-2" />
            Sub Awards
          </TabsTrigger>
          <TabsTrigger value="federal-reports" data-testid="tab-federal-reports">
            <FileText className="h-4 w-4 mr-2" />
            Federal Reports
          </TabsTrigger>
          <TabsTrigger value="audit-prep" data-testid="tab-audit-prep">
            <FileCheck className="h-4 w-4 mr-2" />
            Audit Prep
          </TabsTrigger>
        </TabsList>

        {/* Time/Effort Reporting Tab */}
        <TabsContent value="time-effort" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle data-testid="text-time-effort-title">Time & Effort Reporting</CardTitle>
              <Button onClick={() => setIsCreateTimeEffortOpen(true)} data-testid="button-create-time-effort">
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </CardHeader>
            <CardContent>
              {loadingTimeEffort ? (
                <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
              ) : timeEffortReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No time & effort reports yet</p>
                  <p className="text-sm">Click "New Report" to track employee time allocation to grants</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timeEffortReports.map((report: any) => (
                    <div key={report.id} className="border rounded-lg p-4" data-testid={`card-time-effort-${report.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <UserCheck className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold" data-testid={`text-employee-name-${report.id}`}>
                              {employees.find((e: any) => e.id === report.employeeId)?.fullName || "Unknown Employee"}
                            </h3>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Grant</p>
                              <p className="font-medium" data-testid={`text-grant-name-${report.id}`}>
                                {grants.find((g: any) => g.id === report.grantId)?.grantName || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Period</p>
                              <p className="font-medium" data-testid={`text-period-${report.id}`}>
                                {new Date(report.reportingPeriodStart).toLocaleDateString()} - {new Date(report.reportingPeriodEnd).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Grant Hours</p>
                              <p className="font-medium" data-testid={`text-grant-hours-${report.id}`}>
                                {report.grantHours} / {report.totalHours}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Effort %</p>
                              <p className="font-medium" data-testid={`text-effort-percent-${report.id}`}>
                                {report.percentageEffort}%
                              </p>
                            </div>
                          </div>
                          {report.certifiedBy && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <CheckCircle className="h-4 w-4 inline mr-1 text-green-600" />
                              Certified by {report.certifiedBy} on {new Date(report.certificationDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Allowability Tab */}
        <TabsContent value="cost-allowability" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle data-testid="text-cost-allowability-title">Cost Allowability Checks</CardTitle>
              <Button onClick={() => setIsCreateCostCheckOpen(true)} data-testid="button-create-cost-check">
                <Plus className="h-4 w-4 mr-2" />
                New Check
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCostChecks ? (
                <div className="text-center py-8 text-muted-foreground">Loading cost checks...</div>
              ) : costChecks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No cost allowability checks yet</p>
                  <p className="text-sm">Click "New Check" to verify grant expenses against federal guidelines</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {costChecks.map((check: any) => (
                    <div key={check.id} className="border rounded-lg p-4" data-testid={`card-cost-check-${check.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold" data-testid={`text-cost-category-${check.id}`}>{check.costCategory}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              check.allowabilityStatus === 'allowable' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              check.allowabilityStatus === 'unallowable' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              check.allowabilityStatus === 'questionable' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`} data-testid={`badge-status-${check.id}`}>
                              {check.allowabilityStatus}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Amount</p>
                              <p className="font-medium" data-testid={`text-amount-${check.id}`}>${parseFloat(check.amount).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Grant</p>
                              <p className="font-medium" data-testid={`text-grant-${check.id}`}>
                                {grants.find((g: any) => g.id === check.grantId)?.grantName || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Reviewed By</p>
                              <p className="font-medium" data-testid={`text-reviewed-by-${check.id}`}>
                                {check.reviewedBy || "Pending"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sub Awards Tab */}
        <TabsContent value="sub-awards" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle data-testid="text-sub-awards-title">Sub-Recipient Awards</CardTitle>
              <Button onClick={() => setIsCreateSubAwardOpen(true)} data-testid="button-create-sub-award">
                <Plus className="h-4 w-4 mr-2" />
                New Sub-Award
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSubAwards ? (
                <div className="text-center py-8 text-muted-foreground">Loading sub-awards...</div>
              ) : subAwards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No sub-awards yet</p>
                  <p className="text-sm">Click "New Sub-Award" to track sub-recipient monitoring and compliance</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subAwards.map((award: any) => (
                    <div key={award.id} className="border rounded-lg p-4" data-testid={`card-sub-award-${award.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold" data-testid={`text-subrecipient-${award.id}`}>{award.subrecipientName}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              award.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              award.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`} data-testid={`badge-status-${award.id}`}>
                              {award.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Award Amount</p>
                              <p className="font-medium" data-testid={`text-award-amount-${award.id}`}>${parseFloat(award.awardAmount).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">EIN</p>
                              <p className="font-medium" data-testid={`text-ein-${award.id}`}>{award.subrecipientEIN}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Period</p>
                              <p className="font-medium" data-testid={`text-period-${award.id}`}>
                                {new Date(award.startDate).toLocaleDateString()} - {new Date(award.endDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Compliance</p>
                              <p className={`font-medium ${
                                award.complianceStatus === 'compliant' ? 'text-green-600' :
                                award.complianceStatus === 'non_compliant' ? 'text-red-600' :
                                'text-yellow-600'
                              }`} data-testid={`text-compliance-${award.id}`}>
                                {award.complianceStatus.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Federal Financial Reports Tab */}
        <TabsContent value="federal-reports" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle data-testid="text-federal-reports-title">Federal Financial Reports (SF-425)</CardTitle>
              <Button onClick={() => setIsCreateFFROpen(true)} data-testid="button-create-ffr">
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </CardHeader>
            <CardContent>
              {loadingFederalReports ? (
                <div className="text-center py-8 text-muted-foreground">Loading federal reports...</div>
              ) : federalReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No federal financial reports yet</p>
                  <p className="text-sm">Click "New Report" to create SF-425 federal financial reports</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {federalReports.map((report: any) => (
                    <div key={report.id} className="border rounded-lg p-4" data-testid={`card-ffr-${report.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold" data-testid={`text-grant-${report.id}`}>
                              {grants.find((g: any) => g.id === report.grantId)?.grantName || "Unknown Grant"}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              report.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              report.status === 'submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`} data-testid={`badge-status-${report.id}`}>
                              {report.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Period</p>
                              <p className="font-medium" data-testid={`text-period-${report.id}`}>
                                {new Date(report.reportingPeriodStart).toLocaleDateString()} - {new Date(report.reportingPeriodEnd).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Federal Share</p>
                              <p className="font-medium" data-testid={`text-federal-share-${report.id}`}>
                                ${parseFloat(report.federalShareExpenditure || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Recipient Share</p>
                              <p className="font-medium" data-testid={`text-recipient-share-${report.id}`}>
                                ${parseFloat(report.recipientShareExpenditure || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Expenditure</p>
                              <p className="font-medium" data-testid={`text-total-expenditure-${report.id}`}>
                                ${parseFloat(report.totalExpenditure || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Prep Tab */}
        <TabsContent value="audit-prep" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle data-testid="text-audit-prep-title">Single Audit & 990 Prep</CardTitle>
              <Button onClick={() => setIsCreateAuditItemOpen(true)} data-testid="button-create-audit-item">
                <Plus className="h-4 w-4 mr-2" />
                New Audit Item
              </Button>
            </CardHeader>
            <CardContent>
              {loadingAuditItems ? (
                <div className="text-center py-8 text-muted-foreground">Loading audit items...</div>
              ) : auditItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No audit prep items yet</p>
                  <p className="text-sm">Click "New Audit Item" to track audit and compliance requirements</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {auditItems.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-4" data-testid={`card-audit-item-${item.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileCheck className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold" data-testid={`text-description-${item.id}`}>{item.description}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.completionStatus === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              item.completionStatus === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`} data-testid={`badge-status-${item.id}`}>
                              {item.completionStatus.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Audit Year</p>
                              <p className="font-medium" data-testid={`text-year-${item.id}`}>{item.auditYear}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Type</p>
                              <p className="font-medium" data-testid={`text-type-${item.id}`}>
                                {item.itemType.replace(/_/g, ' ')}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Assigned To</p>
                              <p className="font-medium" data-testid={`text-assigned-${item.id}`}>
                                {item.assignedTo || "Unassigned"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Due Date</p>
                              <p className="font-medium" data-testid={`text-due-date-${item.id}`}>
                                {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "Not set"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
