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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Clock, DollarSign, Users, FileText, CheckCircle, AlertCircle, Plus, Edit, Trash2, FileCheck, AlertTriangle, UserCheck, Download } from "lucide-react";
import html2pdf from "html2pdf.js";
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
    grantId: undefined as string | undefined,
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
    grantId: undefined as string | undefined,
    amount: "",
    completionStatus: "not_started" as "not_started" | "in_progress" | "completed",
    assignedTo: "",
    dueDate: "",
    completedDate: "",
    findings: "",
    notes: "",
  });

  // Delete Confirmation Dialog States
  const [deleteTimeEffortId, setDeleteTimeEffortId] = useState<number | null>(null);
  const [deleteCostCheckId, setDeleteCostCheckId] = useState<number | null>(null);
  const [deleteSubAwardId, setDeleteSubAwardId] = useState<number | null>(null);
  const [deleteFFRId, setDeleteFFRId] = useState<number | null>(null);
  const [deleteAuditItemId, setDeleteAuditItemId] = useState<number | null>(null);

  // Fetch data for dropdowns
  const { data: grants = [] } = useQuery({
    queryKey: [`/api/grants/${currentOrganization.id}`],
  });

  const { data: employees = [] } = useQuery({
    queryKey: [`/api/employees/${currentOrganization.id}`],
  });

  const { data: transactionsData } = useQuery<{ transactions: any[]; total: number; hasMore: boolean }>({
    queryKey: [`/api/transactions/${currentOrganization.id}`, { limit: 100 }],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${currentOrganization.id}?limit=100`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
  });
  const transactions = transactionsData?.transactions || [];

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

  // Create Time/Effort Report Mutation
  const createTimeEffortMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/time-effort-reports/${currentOrganization.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/time-effort-reports/${currentOrganization.id}`] });
      toast({ title: "Time & effort report created successfully" });
      setIsCreateTimeEffortOpen(false);
      resetTimeEffortForm();
    },
    onError: () => {
      toast({ title: "Failed to create time & effort report", variant: "destructive" });
    },
  });

  // Create Cost Allowability Check Mutation
  const createCostCheckMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/cost-allowability-checks/${currentOrganization.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cost-allowability-checks/${currentOrganization.id}`] });
      toast({ title: "Cost allowability check created successfully" });
      setIsCreateCostCheckOpen(false);
      resetCostCheckForm();
    },
    onError: () => {
      toast({ title: "Failed to create cost allowability check", variant: "destructive" });
    },
  });

  // Create Sub Award Mutation
  const createSubAwardMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/sub-awards/${currentOrganization.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sub-awards/${currentOrganization.id}`] });
      toast({ title: "Sub-award created successfully" });
      setIsCreateSubAwardOpen(false);
      resetSubAwardForm();
    },
    onError: () => {
      toast({ title: "Failed to create sub-award", variant: "destructive" });
    },
  });

  // Create Federal Financial Report Mutation
  const createFFRMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/federal-financial-reports/${currentOrganization.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/federal-financial-reports/${currentOrganization.id}`] });
      toast({ title: "Federal financial report created successfully" });
      setIsCreateFFROpen(false);
      resetFFRForm();
    },
    onError: () => {
      toast({ title: "Failed to create federal financial report", variant: "destructive" });
    },
  });

  // Create Audit Prep Item Mutation
  const createAuditItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/audit-prep-items/${currentOrganization.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/audit-prep-items/${currentOrganization.id}`] });
      toast({ title: "Audit prep item created successfully" });
      setIsCreateAuditItemOpen(false);
      resetAuditItemForm();
    },
    onError: () => {
      toast({ title: "Failed to create audit prep item", variant: "destructive" });
    },
  });

  // UPDATE Mutations
  const updateTimeEffortMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/time-effort-reports/${currentOrganization.id}/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/time-effort-reports/${currentOrganization.id}`] });
      toast({ title: "Time & effort report updated successfully" });
      setIsCreateTimeEffortOpen(false);
      setEditingTimeEffort(null);
      resetTimeEffortForm();
    },
    onError: () => {
      toast({ title: "Failed to update time & effort report", variant: "destructive" });
    },
  });

  const updateCostCheckMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/cost-allowability-checks/${currentOrganization.id}/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cost-allowability-checks/${currentOrganization.id}`] });
      toast({ title: "Cost allowability check updated successfully" });
      setIsCreateCostCheckOpen(false);
      setEditingCostCheck(null);
      resetCostCheckForm();
    },
    onError: () => {
      toast({ title: "Failed to update cost allowability check", variant: "destructive" });
    },
  });

  const updateSubAwardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/sub-awards/${currentOrganization.id}/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sub-awards/${currentOrganization.id}`] });
      toast({ title: "Sub-award updated successfully" });
      setIsCreateSubAwardOpen(false);
      setEditingSubAward(null);
      resetSubAwardForm();
    },
    onError: () => {
      toast({ title: "Failed to update sub-award", variant: "destructive" });
    },
  });

  const updateFFRMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/federal-financial-reports/${currentOrganization.id}/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/federal-financial-reports/${currentOrganization.id}`] });
      toast({ title: "Federal financial report updated successfully" });
      setIsCreateFFROpen(false);
      setEditingFFR(null);
      resetFFRForm();
    },
    onError: () => {
      toast({ title: "Failed to update federal financial report", variant: "destructive" });
    },
  });

  const updateAuditItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/audit-prep-items/${currentOrganization.id}/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/audit-prep-items/${currentOrganization.id}`] });
      toast({ title: "Audit prep item updated successfully" });
      setIsCreateAuditItemOpen(false);
      setEditingAuditItem(null);
      resetAuditItemForm();
    },
    onError: () => {
      toast({ title: "Failed to update audit prep item", variant: "destructive" });
    },
  });

  // DELETE Mutations
  const deleteTimeEffortMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/time-effort-reports/${currentOrganization.id}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/time-effort-reports/${currentOrganization.id}`] });
      toast({ title: "Time & effort report deleted successfully" });
      setDeleteTimeEffortId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete time & effort report", variant: "destructive" });
    },
  });

  const deleteCostCheckMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/cost-allowability-checks/${currentOrganization.id}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cost-allowability-checks/${currentOrganization.id}`] });
      toast({ title: "Cost allowability check deleted successfully" });
      setDeleteCostCheckId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete cost allowability check", variant: "destructive" });
    },
  });

  const deleteSubAwardMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/sub-awards/${currentOrganization.id}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sub-awards/${currentOrganization.id}`] });
      toast({ title: "Sub-award deleted successfully" });
      setDeleteSubAwardId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete sub-award", variant: "destructive" });
    },
  });

  const deleteFFRMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/federal-financial-reports/${currentOrganization.id}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/federal-financial-reports/${currentOrganization.id}`] });
      toast({ title: "Federal financial report deleted successfully" });
      setDeleteFFRId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete federal financial report", variant: "destructive" });
    },
  });

  const deleteAuditItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/audit-prep-items/${currentOrganization.id}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/audit-prep-items/${currentOrganization.id}`] });
      toast({ title: "Audit prep item deleted successfully" });
      setDeleteAuditItemId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete audit prep item", variant: "destructive" });
    },
  });

  // PDF Generation for SF-425
  const downloadSF425PDF = (report: any) => {
    const grant = grants.find((g: any) => g.id === report.grantId);
    
    // Helper to format currency safely
    const formatCurrency = (value: any) => {
      if (!value || value === '' || value === null || value === undefined) return '$0.00';
      const num = parseFloat(value);
      if (isNaN(num)) return '$0.00';
      return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Helper to format date safely
    const formatDate = (value: any) => {
      if (!value || value === '' || value === null || value === undefined) return '';
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return '';
      }
    };
    
    // Helper for placeholder text
    const placeholder = (text: string = 'Not captured') => `<em style="color: #999; font-size: 11px;">${text}</em>`;
    
    // Calculate values per SF-425 formulas
    const cashOnHand = 0; // 10c = 10a - 10b (we don't track cash receipts/disbursements)
    const totalFederalShare = (parseFloat(report.federalShareExpenditure || 0) + parseFloat(report.unliquidatedObligations || 0)); // 10g = 10e + 10f
    const unobligatedBalance = 0; // 10h = 10d - 10g (we don't track total authorized)
    const remainingRecipientShare = 0; // 10k = 10i - 10j (we don't track required match)
    const unexpendedProgramIncome = (parseFloat(report.programIncomeEarned || 0) - parseFloat(report.programIncomeExpended || 0)); // 10o
    
    const pdfContent = `
      <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 850px; margin: 0 auto; font-size: 11px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #000; padding-bottom: 15px;">
          <h1 style="font-size: 18px; margin: 0 0 5px 0; font-weight: bold;">FEDERAL FINANCIAL REPORT</h1>
          <p style="margin: 0; font-size: 10px;">(Follow form instructions)</p>
          <p style="margin: 5px 0 0 0; font-size: 10px;"><strong>OMB Approval Number: 0348-0061</strong></p>
          <p style="margin: 3px 0 0 0; font-size: 9px; font-style: italic;">Expiration Date: 02/28/2025</p>
        </div>

        <!-- Section 1-9: Identification Information -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr>
            <td style="border: 1px solid #000; padding: 8px; width: 70%; vertical-align: top;">
              <strong>1. Federal Agency and Organizational Element to Which Report is Submitted:</strong><br/>
              ${currentOrganization.name}
            </td>
            <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
              <strong>2. Federal Grant or Other Identifying Number Assigned by Federal Agency:</strong><br/>
              ${grant?.name || placeholder()}
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr>
            <td style="border: 1px solid #000; padding: 8px; width: 70%; vertical-align: top;">
              <strong>3. Recipient Organization (Name and complete address including Zip code):</strong><br/>
              ${currentOrganization.name}<br/>
              ${placeholder('Address not captured')}
            </td>
            <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
              <strong>4a. UEI:</strong><br/>
              ${placeholder('Not captured')}<br/><br/>
              <strong>4b. EIN:</strong><br/>
              ${placeholder('Not captured')}
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr>
            <td style="border: 1px solid #000; padding: 8px; width: 35%; vertical-align: top;">
              <strong>5. Recipient Account Number or Identifying Number:</strong><br/>
              ${placeholder('Optional')}
            </td>
            <td style="border: 1px solid #000; padding: 8px; width: 30%; vertical-align: top;">
              <strong>6. Report Type:</strong><br/>
              ☐ Quarterly<br/>
              ☐ Semi-Annual<br/>
              ☐ Annual<br/>
              ☐ Final
            </td>
            <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
              <strong>7. Basis of Accounting:</strong><br/>
              ☐ Cash<br/>
              ☐ Accrual
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="border: 1px solid #000; padding: 8px; width: 50%; vertical-align: top;">
              <strong>8. Project/Grant Period:</strong><br/>
              From: ${formatDate(grant?.startDate)} &nbsp;&nbsp; To: ${formatDate(grant?.endDate)}
            </td>
            <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
              <strong>9. Reporting Period End Date (MM/DD/YYYY):</strong><br/>
              ${formatDate(report.reportingPeriodEnd)}
            </td>
          </tr>
        </table>

        <!-- Section 10: Transactions (Federal Cash) -->
        <div style="margin-bottom: 20px;">
          <h3 style="background-color: #e0e0e0; padding: 8px; margin: 0 0 10px 0; font-size: 12px; font-weight: bold; border: 1px solid #000;">10. TRANSACTIONS</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <tr style="background-color: #f5f5f5;">
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold; width: 60%;">Description</td>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: right;">Amount</td>
            </tr>
            
            <!-- 10a-c: Cash Status -->
            <tr style="background-color: #fffacd;">
              <td style="border: 1px solid #000; padding: 6px;"><strong>a.</strong> Cash Receipts:</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${placeholder('Not tracked')}</td>
            </tr>
            <tr style="background-color: #fffacd;">
              <td style="border: 1px solid #000; padding: 6px;"><strong>b.</strong> Cash Disbursements:</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${placeholder('Not tracked')}</td>
            </tr>
            <tr style="background-color: #fffacd;">
              <td style="border: 1px solid #000; padding: 6px;"><strong>c.</strong> Cash on Hand (line a minus line b):</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${placeholder('Cannot calculate')}</td>
            </tr>
            
            <!-- 10d-h: Federal Expenditures and Balance -->
            <tr style="background-color: #fffacd;">
              <td style="border: 1px solid #000; padding: 6px;"><strong>d.</strong> Total Federal funds authorized:</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${placeholder('Not tracked')}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>e.</strong> Federal share of expenditures:</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatCurrency(report.federalShareExpenditure)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>f.</strong> Federal share of unliquidated obligations:</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatCurrency(report.unliquidatedObligations)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>g.</strong> Total Federal share (sum of lines e and f):</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">${formatCurrency(totalFederalShare)}</td>
            </tr>
            <tr style="background-color: #fffacd;">
              <td style="border: 1px solid #000; padding: 6px;"><strong>h.</strong> Unobligated balance of Federal funds (line d minus line g):</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${placeholder('Cannot calculate')}</td>
            </tr>
            
            <!-- 10i-k: Recipient Share -->
            <tr style="background-color: #fffacd;">
              <td style="border: 1px solid #000; padding: 6px;"><strong>i.</strong> Total recipient share required:</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${placeholder('Not tracked')}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>j.</strong> Recipient share of expenditures:</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatCurrency(report.recipientShareExpenditure)}</td>
            </tr>
            <tr style="background-color: #fffacd;">
              <td style="border: 1px solid #000; padding: 6px;"><strong>k.</strong> Remaining recipient share to be provided (line i minus line j):</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${placeholder('Cannot calculate')}</td>
            </tr>
            
            <!-- 10l-o: Program Income -->
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>l.</strong> Total Federal program income earned:</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatCurrency(report.programIncomeEarned)}</td>
            </tr>
            <tr style="background-color: #fffacd;">
              <td style="border: 1px solid #000; padding: 6px;"><strong>m.</strong> Program income expended in accordance with the deduction alternative:</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${placeholder('Not applicable')}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>n.</strong> Program income expended in accordance with the addition alternative:</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatCurrency(report.programIncomeExpended)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>o.</strong> Unexpended program income (line l minus line m or line n):</td>
              <td style="border: 1px solid #000; padding: 6px; text-align: right; font-weight: bold;">${formatCurrency(unexpendedProgramIncome)}</td>
            </tr>
          </table>
          <p style="margin-top: 8px; font-size: 9px; color: #666; font-style: italic;">
            <span style="background-color: #fffacd; padding: 2px 4px;">Highlighted</span> fields are not captured in system database. Complete manually for official submission.
          </p>
        </div>

        <!-- Section 11: Indirect Expense -->
        <div style="margin-bottom: 20px;">
          <h3 style="background-color: #e0e0e0; padding: 8px; margin: 0 0 10px 0; font-size: 12px; font-weight: bold; border: 1px solid #000;">11. INDIRECT EXPENSE</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <tr style="background-color: #f5f5f5;">
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold; width: 15%;">a. Type</td>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold; width: 10%;">b. Rate</td>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold; width: 20%;">c. Period (From/To)</td>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold; width: 20%;">d. Base</td>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold; width: 20%;">e. Amount Charged</td>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold; width: 15%;">f. Federal Share</td>
            </tr>
            <tr style="background-color: #fffacd;">
              <td style="border: 1px solid #000; padding: 6px;">${placeholder()}</td>
              <td style="border: 1px solid #000; padding: 6px;">${placeholder()}</td>
              <td style="border: 1px solid #000; padding: 6px;">${placeholder()}</td>
              <td style="border: 1px solid #000; padding: 6px;">${placeholder()}</td>
              <td style="border: 1px solid #000; padding: 6px;">${placeholder()}</td>
              <td style="border: 1px solid #000; padding: 6px;">${placeholder()}</td>
            </tr>
          </table>
          <p style="margin-top: 5px; font-size: 9px; color: #666; font-style: italic;">
            Indirect expense information not captured in system. Complete manually for official submission.
          </p>
        </div>

        <!-- Section 12: Remarks -->
        ${report.notes ? `
        <div style="margin-bottom: 20px;">
          <h3 style="background-color: #e0e0e0; padding: 8px; margin: 0 0 10px 0; font-size: 12px; font-weight: bold; border: 1px solid #000;">12. REMARKS</h3>
          <div style="border: 1px solid #000; padding: 10px; min-height: 60px; font-size: 10px;">
            ${report.notes}
          </div>
          <p style="margin-top: 5px; font-size: 9px; color: #666; font-style: italic;">
            Attach additional documentation as needed to explain unliquidated obligations and other transactions.
          </p>
        </div>
        ` : `
        <div style="margin-bottom: 20px;">
          <h3 style="background-color: #e0e0e0; padding: 8px; margin: 0 0 10px 0; font-size: 12px; font-weight: bold; border: 1px solid #000;">12. REMARKS</h3>
          <div style="border: 1px solid #000; padding: 10px; min-height: 60px; font-size: 10px; color: #999;">
            <em>No remarks provided. Attach additional documentation as needed.</em>
          </div>
        </div>
        `}

        <!-- Section 13: Certification -->
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <h3 style="background-color: #e0e0e0; padding: 8px; margin: 0 0 10px 0; font-size: 12px; font-weight: bold; border: 1px solid #000;">13. CERTIFICATION</h3>
          <p style="font-size: 10px; line-height: 1.5; margin-bottom: 15px; border: 1px solid #000; padding: 10px; background-color: #f9f9f9;">
            <strong>By signing this report, I certify to the best of my knowledge and belief that the report is true, complete, and accurate, and the expenditures, disbursements and cash receipts are for the purposes and objectives set forth in the award documents.</strong> I am aware that any false, fictitious, or fraudulent information may subject me to criminal, civil, or administrative penalties. (U.S. Code, Title 18, Section 1001)
          </p>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <tr style="background-color: #fffacd;">
              <td style="border: 1px solid #000; padding: 8px; width: 70%;">
                <strong>13a. Typed or Printed Name and Title of Authorized Certifying Official:</strong><br/><br/>
                ${placeholder('Complete manually before submission')}
              </td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                <strong>13c. Telephone:</strong><br/><br/>
                ${placeholder()}
              </td>
            </tr>
            <tr style="background-color: #fffacd;">
              <td style="border: 1px solid #000; padding: 8px;">
                <strong>13b. Signature of Authorized Certifying Official:</strong><br/><br/>
                ${placeholder('Signature required')}
              </td>
              <td style="border: 1px solid #000; padding: 8px; vertical-align: top;">
                <strong>13d. Email Address:</strong><br/><br/>
                ${placeholder()}
              </td>
            </tr>
            <tr style="background-color: #fffacd;">
              <td colspan="2" style="border: 1px solid #000; padding: 8px;">
                <strong>13e. Date Report Submitted (MM/DD/YYYY):</strong><br/><br/>
                ${formatDate(report.submittedDate) || placeholder('Not yet submitted')}
              </td>
            </tr>
          </table>
        </div>

        <!-- Section 14: Agency Use Only -->
        <div style="margin-bottom: 30px;">
          <h3 style="background-color: #e0e0e0; padding: 8px; margin: 0 0 10px 0; font-size: 12px; font-weight: bold; border: 1px solid #000;">14. AGENCY USE ONLY</h3>
          <div style="border: 1px solid #000; padding: 10px; min-height: 40px; background-color: #f0f0f0;">
            <em style="font-size: 9px; color: #666;">Reserved for federal agency use</em>
          </div>
        </div>

        <!-- Paperwork Reduction Notice -->
        <div style="border-top: 2px solid #000; padding-top: 15px; margin-top: 30px;">
          <p style="font-size: 8px; line-height: 1.4; color: #444; text-align: justify;">
            <strong>Paperwork Reduction Act Statement:</strong> According to the Paperwork Reduction Act, as amended, no persons are required to respond to a collection of information unless it displays a valid OMB Control Number. The valid OMB control number for this information collection is 0348-0061. Public reporting burden for this collection of information is estimated to average 1.5 hours per response, including time for reviewing instructions, searching existing data sources, gathering and maintaining the data needed, and completing and reviewing the collection of information. Send comments regarding the burden estimate or any other aspect of this collection of information, including suggestions for reducing this burden, to the Office of Management and Budget, Paperwork Reduction Project (0348-0061), Washington, DC 20503.
          </p>
        </div>

        <!-- Generation Footer -->
        <div style="margin-top: 20px; text-align: center; border-top: 1px solid #ccc; padding-top: 10px;">
          <p style="font-size: 9px; color: #666;">
            <strong>SF-425 Federal Financial Report</strong><br/>
            Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br/>
            Organization: ${currentOrganization.name}<br/>
            Report Period Ending: ${formatDate(report.reportingPeriodEnd)}<br/>
            <em style="font-size: 8px;">This export contains data from the ComplyBook system. Yellow highlighted fields require manual completion before official submission.</em>
          </p>
        </div>
      </div>
    `;

    const opt = {
      margin: 0.5,
      filename: `SF-425_${grant?.name || report.id}_${new Date(report.reportingPeriodEnd).toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(pdfContent).save();
    
    toast({ 
      title: "PDF Generated",
      description: "Your SF-425 report has been downloaded"
    });
  };

  // Form Handlers
  const handleCreateTimeEffort = () => {
    const payload = {
      employeeId: parseInt(timeEffortFormData.employeeId),
      grantId: parseInt(timeEffortFormData.grantId),
      reportingPeriodStart: timeEffortFormData.reportingPeriodStart,
      reportingPeriodEnd: timeEffortFormData.reportingPeriodEnd,
      totalHours: parseFloat(timeEffortFormData.totalHours),
      grantHours: parseFloat(timeEffortFormData.grantHours),
      otherActivitiesHours: timeEffortFormData.otherActivitiesHours ? parseFloat(timeEffortFormData.otherActivitiesHours) : undefined,
      percentageEffort: parseFloat(timeEffortFormData.percentageEffort),
      certificationDate: timeEffortFormData.certificationDate || undefined,
      certifiedBy: timeEffortFormData.certifiedBy || undefined,
      notes: timeEffortFormData.notes || undefined,
    };
    if (editingTimeEffort) {
      updateTimeEffortMutation.mutate({ id: editingTimeEffort.id, data: payload });
    } else {
      createTimeEffortMutation.mutate(payload);
    }
  };

  const handleCreateCostCheck = () => {
    const payload = {
      transactionId: costCheckFormData.transactionId ? parseInt(costCheckFormData.transactionId) : undefined,
      grantId: parseInt(costCheckFormData.grantId),
      costCategory: costCheckFormData.costCategory,
      amount: costCheckFormData.amount,
      allowabilityStatus: costCheckFormData.allowabilityStatus,
      reviewedBy: costCheckFormData.reviewedBy || undefined,
      reviewDate: costCheckFormData.reviewDate || undefined,
      justification: costCheckFormData.justification || undefined,
      notes: costCheckFormData.notes || undefined,
    };
    if (editingCostCheck) {
      updateCostCheckMutation.mutate({ id: editingCostCheck.id, data: payload });
    } else {
      createCostCheckMutation.mutate(payload);
    }
  };

  const handleCreateSubAward = () => {
    const payload = {
      grantId: parseInt(subAwardFormData.grantId),
      subrecipientName: subAwardFormData.subrecipientName,
      subrecipientEIN: subAwardFormData.subrecipientEIN,
      awardAmount: subAwardFormData.awardAmount,
      awardDate: subAwardFormData.awardDate,
      startDate: subAwardFormData.startDate,
      endDate: subAwardFormData.endDate,
      purpose: subAwardFormData.purpose,
      status: subAwardFormData.status,
      complianceStatus: subAwardFormData.complianceStatus,
      lastMonitoringDate: subAwardFormData.lastMonitoringDate || undefined,
      nextMonitoringDate: subAwardFormData.nextMonitoringDate || undefined,
      notes: subAwardFormData.notes || undefined,
    };
    if (editingSubAward) {
      updateSubAwardMutation.mutate({ id: editingSubAward.id, data: payload });
    } else {
      createSubAwardMutation.mutate(payload);
    }
  };

  const handleCreateFFR = () => {
    const payload = {
      grantId: parseInt(ffrFormData.grantId),
      reportingPeriodStart: ffrFormData.reportingPeriodStart,
      reportingPeriodEnd: ffrFormData.reportingPeriodEnd,
      federalShareExpenditure: ffrFormData.federalShareExpenditure,
      recipientShareExpenditure: ffrFormData.recipientShareExpenditure,
      totalExpenditure: ffrFormData.totalExpenditure,
      unliquidatedObligations: ffrFormData.unliquidatedObligations,
      recipientShareUnliquidated: ffrFormData.recipientShareUnliquidated,
      programIncomeEarned: ffrFormData.programIncomeEarned,
      programIncomeExpended: ffrFormData.programIncomeExpended,
      status: ffrFormData.status,
      submittedDate: ffrFormData.submittedDate || undefined,
      approvedDate: ffrFormData.approvedDate || undefined,
      notes: ffrFormData.notes || undefined,
    };
    if (editingFFR) {
      updateFFRMutation.mutate({ id: editingFFR.id, data: payload });
    } else {
      createFFRMutation.mutate(payload);
    }
  };

  const handleCreateAuditItem = () => {
    const payload = {
      auditYear: parseInt(auditItemFormData.auditYear),
      itemType: auditItemFormData.itemType,
      description: auditItemFormData.description,
      grantId: auditItemFormData.grantId ? parseInt(auditItemFormData.grantId) : undefined,
      amount: auditItemFormData.amount || undefined,
      completionStatus: auditItemFormData.completionStatus,
      assignedTo: auditItemFormData.assignedTo || undefined,
      dueDate: auditItemFormData.dueDate || undefined,
      completedDate: auditItemFormData.completedDate || undefined,
      findings: auditItemFormData.findings || undefined,
      notes: auditItemFormData.notes || undefined,
    };
    if (editingAuditItem) {
      updateAuditItemMutation.mutate({ id: editingAuditItem.id, data: payload });
    } else {
      createAuditItemMutation.mutate(payload);
    }
  };

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
    setEditingTimeEffort(null);
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
    setEditingCostCheck(null);
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
    setEditingSubAward(null);
  };

  const resetFFRForm = () => {
    setFFRFormData({
      grantId: undefined,
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
    setEditingFFR(null);
  };

  const resetAuditItemForm = () => {
    setAuditItemFormData({
      auditYear: new Date().getFullYear().toString(),
      itemType: "single_audit",
      description: "",
      grantId: undefined,
      amount: "",
      completionStatus: "not_started",
      assignedTo: "",
      dueDate: "",
      completedDate: "",
      findings: "",
      notes: "",
    });
    setEditingAuditItem(null);
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
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => {
                              setEditingTimeEffort(report);
                              setTimeEffortFormData({
                                employeeId: report.employeeId.toString(),
                                grantId: report.grantId.toString(),
                                reportingPeriodStart: report.reportingPeriodStart,
                                reportingPeriodEnd: report.reportingPeriodEnd,
                                totalHours: report.totalHours.toString(),
                                grantHours: report.grantHours.toString(),
                                otherActivitiesHours: report.otherActivitiesHours?.toString() || "",
                                percentageEffort: report.percentageEffort.toString(),
                                certificationDate: report.certificationDate || "",
                                certifiedBy: report.certifiedBy || "",
                                notes: report.notes || "",
                              });
                              setIsCreateTimeEffortOpen(true);
                            }}
                            data-testid={`button-edit-${report.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => setDeleteTimeEffortId(report.id)}
                            data-testid={`button-delete-${report.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => {
                              setEditingCostCheck(check);
                              setCostCheckFormData({
                                transactionId: check.transactionId?.toString() || "",
                                grantId: check.grantId.toString(),
                                costCategory: check.costCategory,
                                amount: check.amount,
                                allowabilityStatus: check.allowabilityStatus,
                                reviewedBy: check.reviewedBy || "",
                                reviewDate: check.reviewDate || "",
                                justification: check.justification || "",
                                notes: check.notes || "",
                              });
                              setIsCreateCostCheckOpen(true);
                            }}
                            data-testid={`button-edit-${check.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => setDeleteCostCheckId(check.id)}
                            data-testid={`button-delete-${check.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => {
                              setEditingSubAward(award);
                              setSubAwardFormData({
                                grantId: award.grantId.toString(),
                                subrecipientName: award.subrecipientName,
                                subrecipientEIN: award.subrecipientEIN,
                                awardAmount: award.awardAmount,
                                awardDate: award.awardDate,
                                startDate: award.startDate,
                                endDate: award.endDate,
                                purpose: award.purpose,
                                status: award.status,
                                complianceStatus: award.complianceStatus,
                                lastMonitoringDate: award.lastMonitoringDate || "",
                                nextMonitoringDate: award.nextMonitoringDate || "",
                                notes: award.notes || "",
                              });
                              setIsCreateSubAwardOpen(true);
                            }}
                            data-testid={`button-edit-${award.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => setDeleteSubAwardId(award.id)}
                            data-testid={`button-delete-${award.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => downloadSF425PDF(report)}
                            data-testid={`button-download-${report.id}`}
                            title="Download SF-425 PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => {
                              setEditingFFR(report);
                              setFFRFormData({
                                grantId: report.grantId.toString(),
                                reportingPeriodStart: report.reportingPeriodStart,
                                reportingPeriodEnd: report.reportingPeriodEnd,
                                federalShareExpenditure: report.federalShareExpenditure,
                                recipientShareExpenditure: report.recipientShareExpenditure,
                                totalExpenditure: report.totalExpenditure,
                                unliquidatedObligations: report.unliquidatedObligations,
                                recipientShareUnliquidated: report.recipientShareUnliquidated,
                                programIncomeEarned: report.programIncomeEarned,
                                programIncomeExpended: report.programIncomeExpended,
                                status: report.status,
                                submittedDate: report.submittedDate || "",
                                approvedDate: report.approvedDate || "",
                                notes: report.notes || "",
                              });
                              setIsCreateFFROpen(true);
                            }}
                            data-testid={`button-edit-${report.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => setDeleteFFRId(report.id)}
                            data-testid={`button-delete-${report.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => {
                              setEditingAuditItem(item);
                              setAuditItemFormData({
                                auditYear: item.auditYear.toString(),
                                itemType: item.itemType,
                                description: item.description,
                                grantId: item.grantId?.toString() || "",
                                amount: item.amount || "",
                                completionStatus: item.completionStatus,
                                assignedTo: item.assignedTo || "",
                                dueDate: item.dueDate || "",
                                completedDate: item.completedDate || "",
                                findings: item.findings || "",
                                notes: item.notes || "",
                              });
                              setIsCreateAuditItemOpen(true);
                            }}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => setDeleteAuditItemId(item.id)}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Time/Effort Report Dialog */}
      <Dialog open={isCreateTimeEffortOpen} onOpenChange={(open) => { setIsCreateTimeEffortOpen(open); if (!open) resetTimeEffortForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-time-effort">
          <DialogHeader>
            <DialogTitle>{editingTimeEffort ? "Edit" : "Create"} Time & Effort Report</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employeeId">Employee *</Label>
                <Select value={timeEffortFormData.employeeId} onValueChange={(value) => setTimeEffortFormData({...timeEffortFormData, employeeId: value})}>
                  <SelectTrigger data-testid="select-employee">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="grantId">Grant *</Label>
                <Select value={timeEffortFormData.grantId} onValueChange={(value) => setTimeEffortFormData({...timeEffortFormData, grantId: value})}>
                  <SelectTrigger data-testid="select-grant">
                    <SelectValue placeholder="Select grant" />
                  </SelectTrigger>
                  <SelectContent>
                    {grants.map((grant: any) => (
                      <SelectItem key={grant.id} value={grant.id.toString()}>{grant.grantName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reportingPeriodStart">Period Start *</Label>
                <Input type="date" value={timeEffortFormData.reportingPeriodStart} onChange={(e) => setTimeEffortFormData({...timeEffortFormData, reportingPeriodStart: e.target.value})} data-testid="input-period-start" />
              </div>
              <div>
                <Label htmlFor="reportingPeriodEnd">Period End *</Label>
                <Input type="date" value={timeEffortFormData.reportingPeriodEnd} onChange={(e) => setTimeEffortFormData({...timeEffortFormData, reportingPeriodEnd: e.target.value})} data-testid="input-period-end" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="totalHours">Total Hours *</Label>
                <Input type="number" step="0.01" value={timeEffortFormData.totalHours} onChange={(e) => setTimeEffortFormData({...timeEffortFormData, totalHours: e.target.value})} data-testid="input-total-hours" />
              </div>
              <div>
                <Label htmlFor="grantHours">Grant Hours *</Label>
                <Input type="number" step="0.01" value={timeEffortFormData.grantHours} onChange={(e) => setTimeEffortFormData({...timeEffortFormData, grantHours: e.target.value})} data-testid="input-grant-hours" />
              </div>
              <div>
                <Label htmlFor="percentageEffort">Effort % *</Label>
                <Input type="number" step="0.01" value={timeEffortFormData.percentageEffort} onChange={(e) => setTimeEffortFormData({...timeEffortFormData, percentageEffort: e.target.value})} data-testid="input-percentage-effort" />
              </div>
            </div>
            <div>
              <Label htmlFor="otherActivitiesHours">Other Activities Hours</Label>
              <Input type="number" step="0.01" value={timeEffortFormData.otherActivitiesHours} onChange={(e) => setTimeEffortFormData({...timeEffortFormData, otherActivitiesHours: e.target.value})} data-testid="input-other-hours" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="certifiedBy">Certified By</Label>
                <Input value={timeEffortFormData.certifiedBy} onChange={(e) => setTimeEffortFormData({...timeEffortFormData, certifiedBy: e.target.value})} data-testid="input-certified-by" />
              </div>
              <div>
                <Label htmlFor="certificationDate">Certification Date</Label>
                <Input type="date" value={timeEffortFormData.certificationDate} onChange={(e) => setTimeEffortFormData({...timeEffortFormData, certificationDate: e.target.value})} data-testid="input-certification-date" />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea value={timeEffortFormData.notes} onChange={(e) => setTimeEffortFormData({...timeEffortFormData, notes: e.target.value})} data-testid="input-notes" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateTimeEffortOpen(false)} data-testid="button-cancel">Cancel</Button>
              <Button onClick={handleCreateTimeEffort} disabled={createTimeEffortMutation.isPending || updateTimeEffortMutation.isPending} data-testid="button-submit">
                {(createTimeEffortMutation.isPending || updateTimeEffortMutation.isPending) ? (editingTimeEffort ? "Updating..." : "Creating...") : (editingTimeEffort ? "Update Report" : "Create Report")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cost Allowability Check Dialog */}
      <Dialog open={isCreateCostCheckOpen} onOpenChange={(open) => { setIsCreateCostCheckOpen(open); if (!open) resetCostCheckForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-cost-check">
          <DialogHeader>
            <DialogTitle>{editingCostCheck ? "Edit" : "Create"} Cost Allowability Check</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grantId">Grant *</Label>
                <Select value={costCheckFormData.grantId} onValueChange={(value) => setCostCheckFormData({...costCheckFormData, grantId: value})}>
                  <SelectTrigger data-testid="select-grant">
                    <SelectValue placeholder="Select grant" />
                  </SelectTrigger>
                  <SelectContent>
                    {grants.map((grant: any) => (
                      <SelectItem key={grant.id} value={grant.id.toString()}>{grant.grantName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="transactionId">Transaction (optional) <span className="text-muted-foreground text-xs">- Recent 100</span></Label>
                <Select value={costCheckFormData.transactionId} onValueChange={(value) => setCostCheckFormData({...costCheckFormData, transactionId: value})}>
                  <SelectTrigger data-testid="select-transaction">
                    <SelectValue placeholder="Select from recent transactions" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactions.map((txn: any) => (
                      <SelectItem key={txn.id} value={txn.id.toString()}>{txn.description} - ${txn.amount}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="costCategory">Cost Category *</Label>
                <Input value={costCheckFormData.costCategory} onChange={(e) => setCostCheckFormData({...costCheckFormData, costCategory: e.target.value})} data-testid="input-cost-category" />
              </div>
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input type="number" step="0.01" value={costCheckFormData.amount} onChange={(e) => setCostCheckFormData({...costCheckFormData, amount: e.target.value})} data-testid="input-amount" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="allowabilityStatus">Allowability Status *</Label>
                <Select value={costCheckFormData.allowabilityStatus} onValueChange={(value: any) => setCostCheckFormData({...costCheckFormData, allowabilityStatus: value})}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="allowable">Allowable</SelectItem>
                    <SelectItem value="unallowable">Unallowable</SelectItem>
                    <SelectItem value="questionable">Questionable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reviewDate">Review Date</Label>
                <Input type="date" value={costCheckFormData.reviewDate} onChange={(e) => setCostCheckFormData({...costCheckFormData, reviewDate: e.target.value})} data-testid="input-review-date" />
              </div>
            </div>
            <div>
              <Label htmlFor="reviewedBy">Reviewed By</Label>
              <Input value={costCheckFormData.reviewedBy} onChange={(e) => setCostCheckFormData({...costCheckFormData, reviewedBy: e.target.value})} data-testid="input-reviewed-by" />
            </div>
            <div>
              <Label htmlFor="justification">Justification</Label>
              <Textarea value={costCheckFormData.justification} onChange={(e) => setCostCheckFormData({...costCheckFormData, justification: e.target.value})} data-testid="input-justification" />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea value={costCheckFormData.notes} onChange={(e) => setCostCheckFormData({...costCheckFormData, notes: e.target.value})} data-testid="input-notes" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateCostCheckOpen(false)} data-testid="button-cancel">Cancel</Button>
              <Button onClick={handleCreateCostCheck} disabled={createCostCheckMutation.isPending || updateCostCheckMutation.isPending} data-testid="button-submit">
                {(createCostCheckMutation.isPending || updateCostCheckMutation.isPending) ? (editingCostCheck ? "Updating..." : "Creating...") : (editingCostCheck ? "Update Check" : "Create Check")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub Award Dialog */}
      <Dialog open={isCreateSubAwardOpen} onOpenChange={(open) => { setIsCreateSubAwardOpen(open); if (!open) resetSubAwardForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-sub-award">
          <DialogHeader>
            <DialogTitle>{editingSubAward ? "Edit" : "Create"} Sub-Recipient Award</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="grantId">Grant *</Label>
              <Select value={subAwardFormData.grantId} onValueChange={(value) => setSubAwardFormData({...subAwardFormData, grantId: value})}>
                <SelectTrigger data-testid="select-grant">
                  <SelectValue placeholder="Select grant" />
                </SelectTrigger>
                <SelectContent>
                  {grants.map((grant: any) => (
                    <SelectItem key={grant.id} value={grant.id.toString()}>{grant.grantName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subrecipientName">Subrecipient Name *</Label>
                <Input value={subAwardFormData.subrecipientName} onChange={(e) => setSubAwardFormData({...subAwardFormData, subrecipientName: e.target.value})} data-testid="input-subrecipient-name" />
              </div>
              <div>
                <Label htmlFor="subrecipientEIN">EIN *</Label>
                <Input value={subAwardFormData.subrecipientEIN} onChange={(e) => setSubAwardFormData({...subAwardFormData, subrecipientEIN: e.target.value})} data-testid="input-ein" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="awardAmount">Award Amount *</Label>
                <Input type="number" step="0.01" value={subAwardFormData.awardAmount} onChange={(e) => setSubAwardFormData({...subAwardFormData, awardAmount: e.target.value})} data-testid="input-award-amount" />
              </div>
              <div>
                <Label htmlFor="awardDate">Award Date *</Label>
                <Input type="date" value={subAwardFormData.awardDate} onChange={(e) => setSubAwardFormData({...subAwardFormData, awardDate: e.target.value})} data-testid="input-award-date" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input type="date" value={subAwardFormData.startDate} onChange={(e) => setSubAwardFormData({...subAwardFormData, startDate: e.target.value})} data-testid="input-start-date" />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input type="date" value={subAwardFormData.endDate} onChange={(e) => setSubAwardFormData({...subAwardFormData, endDate: e.target.value})} data-testid="input-end-date" />
              </div>
            </div>
            <div>
              <Label htmlFor="purpose">Purpose *</Label>
              <Textarea value={subAwardFormData.purpose} onChange={(e) => setSubAwardFormData({...subAwardFormData, purpose: e.target.value})} data-testid="input-purpose" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select value={subAwardFormData.status} onValueChange={(value: any) => setSubAwardFormData({...subAwardFormData, status: value})}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="complianceStatus">Compliance Status *</Label>
                <Select value={subAwardFormData.complianceStatus} onValueChange={(value: any) => setSubAwardFormData({...subAwardFormData, complianceStatus: value})}>
                  <SelectTrigger data-testid="select-compliance">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lastMonitoringDate">Last Monitoring Date</Label>
                <Input type="date" value={subAwardFormData.lastMonitoringDate} onChange={(e) => setSubAwardFormData({...subAwardFormData, lastMonitoringDate: e.target.value})} data-testid="input-last-monitoring" />
              </div>
              <div>
                <Label htmlFor="nextMonitoringDate">Next Monitoring Date</Label>
                <Input type="date" value={subAwardFormData.nextMonitoringDate} onChange={(e) => setSubAwardFormData({...subAwardFormData, nextMonitoringDate: e.target.value})} data-testid="input-next-monitoring" />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea value={subAwardFormData.notes} onChange={(e) => setSubAwardFormData({...subAwardFormData, notes: e.target.value})} data-testid="input-notes" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateSubAwardOpen(false)} data-testid="button-cancel">Cancel</Button>
              <Button onClick={handleCreateSubAward} disabled={createSubAwardMutation.isPending || updateSubAwardMutation.isPending} data-testid="button-submit">
                {(createSubAwardMutation.isPending || updateSubAwardMutation.isPending) ? (editingSubAward ? "Updating..." : "Creating...") : (editingSubAward ? "Update Sub-Award" : "Create Sub-Award")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Federal Financial Report Dialog */}
      <Dialog open={isCreateFFROpen} onOpenChange={(open) => { setIsCreateFFROpen(open); if (!open) resetFFRForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-ffr">
          <DialogHeader>
            <DialogTitle>{editingFFR ? "Edit" : "Create"} Federal Financial Report (SF-425)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="grantId">Grant *</Label>
              <Select value={ffrFormData.grantId} onValueChange={(value) => setFFRFormData({...ffrFormData, grantId: value})}>
                <SelectTrigger data-testid="select-grant">
                  <SelectValue placeholder="Select grant" />
                </SelectTrigger>
                <SelectContent>
                  {grants.map((grant: any) => (
                    <SelectItem key={grant.id} value={grant.id.toString()}>{grant.grantName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reportingPeriodStart">Period Start *</Label>
                <Input type="date" value={ffrFormData.reportingPeriodStart} onChange={(e) => setFFRFormData({...ffrFormData, reportingPeriodStart: e.target.value})} data-testid="input-period-start" />
              </div>
              <div>
                <Label htmlFor="reportingPeriodEnd">Period End *</Label>
                <Input type="date" value={ffrFormData.reportingPeriodEnd} onChange={(e) => setFFRFormData({...ffrFormData, reportingPeriodEnd: e.target.value})} data-testid="input-period-end" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="federalShareExpenditure">Federal Share *</Label>
                <Input type="number" step="0.01" value={ffrFormData.federalShareExpenditure} onChange={(e) => setFFRFormData({...ffrFormData, federalShareExpenditure: e.target.value})} data-testid="input-federal-share" />
              </div>
              <div>
                <Label htmlFor="recipientShareExpenditure">Recipient Share *</Label>
                <Input type="number" step="0.01" value={ffrFormData.recipientShareExpenditure} onChange={(e) => setFFRFormData({...ffrFormData, recipientShareExpenditure: e.target.value})} data-testid="input-recipient-share" />
              </div>
              <div>
                <Label htmlFor="totalExpenditure">Total Expenditure *</Label>
                <Input type="number" step="0.01" value={ffrFormData.totalExpenditure} onChange={(e) => setFFRFormData({...ffrFormData, totalExpenditure: e.target.value})} data-testid="input-total-expenditure" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unliquidatedObligations">Unliquidated Obligations *</Label>
                <Input type="number" step="0.01" value={ffrFormData.unliquidatedObligations} onChange={(e) => setFFRFormData({...ffrFormData, unliquidatedObligations: e.target.value})} data-testid="input-unliquidated" />
              </div>
              <div>
                <Label htmlFor="recipientShareUnliquidated">Recipient Share Unliquidated *</Label>
                <Input type="number" step="0.01" value={ffrFormData.recipientShareUnliquidated} onChange={(e) => setFFRFormData({...ffrFormData, recipientShareUnliquidated: e.target.value})} data-testid="input-recipient-unliquidated" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="programIncomeEarned">Program Income Earned *</Label>
                <Input type="number" step="0.01" value={ffrFormData.programIncomeEarned} onChange={(e) => setFFRFormData({...ffrFormData, programIncomeEarned: e.target.value})} data-testid="input-income-earned" />
              </div>
              <div>
                <Label htmlFor="programIncomeExpended">Program Income Expended *</Label>
                <Input type="number" step="0.01" value={ffrFormData.programIncomeExpended} onChange={(e) => setFFRFormData({...ffrFormData, programIncomeExpended: e.target.value})} data-testid="input-income-expended" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select value={ffrFormData.status} onValueChange={(value: any) => setFFRFormData({...ffrFormData, status: value})}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="submittedDate">Submitted Date</Label>
                <Input type="date" value={ffrFormData.submittedDate} onChange={(e) => setFFRFormData({...ffrFormData, submittedDate: e.target.value})} data-testid="input-submitted-date" />
              </div>
              <div>
                <Label htmlFor="approvedDate">Approved Date</Label>
                <Input type="date" value={ffrFormData.approvedDate} onChange={(e) => setFFRFormData({...ffrFormData, approvedDate: e.target.value})} data-testid="input-approved-date" />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea value={ffrFormData.notes} onChange={(e) => setFFRFormData({...ffrFormData, notes: e.target.value})} data-testid="input-notes" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateFFROpen(false)} data-testid="button-cancel">Cancel</Button>
              <Button onClick={handleCreateFFR} disabled={createFFRMutation.isPending || updateFFRMutation.isPending} data-testid="button-submit">
                {(createFFRMutation.isPending || updateFFRMutation.isPending) ? (editingFFR ? "Updating..." : "Creating...") : (editingFFR ? "Update Report" : "Create Report")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Prep Item Dialog */}
      <Dialog open={isCreateAuditItemOpen} onOpenChange={(open) => { setIsCreateAuditItemOpen(open); if (!open) resetAuditItemForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-audit-item">
          <DialogHeader>
            <DialogTitle>{editingAuditItem ? "Edit" : "Create"} Audit Prep Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="auditYear">Audit Year *</Label>
                <Input type="number" value={auditItemFormData.auditYear} onChange={(e) => setAuditItemFormData({...auditItemFormData, auditYear: e.target.value})} data-testid="input-audit-year" />
              </div>
              <div>
                <Label htmlFor="itemType">Type *</Label>
                <Select value={auditItemFormData.itemType} onValueChange={(value: any) => setAuditItemFormData({...auditItemFormData, itemType: value})}>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_audit">Single Audit</SelectItem>
                    <SelectItem value="form_990">Form 990</SelectItem>
                    <SelectItem value="schedule_of_expenditures">Schedule of Expenditures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea value={auditItemFormData.description} onChange={(e) => setAuditItemFormData({...auditItemFormData, description: e.target.value})} data-testid="input-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grantId">Grant (optional)</Label>
                <Select value={auditItemFormData.grantId} onValueChange={(value) => setAuditItemFormData({...auditItemFormData, grantId: value})}>
                  <SelectTrigger data-testid="select-grant">
                    <SelectValue placeholder="Select grant" />
                  </SelectTrigger>
                  <SelectContent>
                    {grants.map((grant: any) => (
                      <SelectItem key={grant.id} value={grant.id.toString()}>{grant.grantName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input type="number" step="0.01" value={auditItemFormData.amount} onChange={(e) => setAuditItemFormData({...auditItemFormData, amount: e.target.value})} data-testid="input-amount" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="completionStatus">Completion Status *</Label>
                <Select value={auditItemFormData.completionStatus} onValueChange={(value: any) => setAuditItemFormData({...auditItemFormData, completionStatus: value})}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input value={auditItemFormData.assignedTo} onChange={(e) => setAuditItemFormData({...auditItemFormData, assignedTo: e.target.value})} data-testid="input-assigned-to" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input type="date" value={auditItemFormData.dueDate} onChange={(e) => setAuditItemFormData({...auditItemFormData, dueDate: e.target.value})} data-testid="input-due-date" />
              </div>
              <div>
                <Label htmlFor="completedDate">Completed Date</Label>
                <Input type="date" value={auditItemFormData.completedDate} onChange={(e) => setAuditItemFormData({...auditItemFormData, completedDate: e.target.value})} data-testid="input-completed-date" />
              </div>
            </div>
            <div>
              <Label htmlFor="findings">Findings</Label>
              <Textarea value={auditItemFormData.findings} onChange={(e) => setAuditItemFormData({...auditItemFormData, findings: e.target.value})} data-testid="input-findings" />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea value={auditItemFormData.notes} onChange={(e) => setAuditItemFormData({...auditItemFormData, notes: e.target.value})} data-testid="input-notes" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateAuditItemOpen(false)} data-testid="button-cancel">Cancel</Button>
              <Button onClick={handleCreateAuditItem} disabled={createAuditItemMutation.isPending || updateAuditItemMutation.isPending} data-testid="button-submit">
                {(createAuditItemMutation.isPending || updateAuditItemMutation.isPending) ? (editingAuditItem ? "Updating..." : "Creating...") : (editingAuditItem ? "Update Item" : "Create Item")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <AlertDialog open={deleteTimeEffortId !== null} onOpenChange={(open) => !open && setDeleteTimeEffortId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time & Effort Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time & effort report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTimeEffortId && deleteTimeEffortMutation.mutate(deleteTimeEffortId)}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteCostCheckId !== null} onOpenChange={(open) => !open && setDeleteCostCheckId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cost Allowability Check</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this cost allowability check? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCostCheckId && deleteCostCheckMutation.mutate(deleteCostCheckId)}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteSubAwardId !== null} onOpenChange={(open) => !open && setDeleteSubAwardId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sub-Award</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sub-award? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSubAwardId && deleteSubAwardMutation.mutate(deleteSubAwardId)}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteFFRId !== null} onOpenChange={(open) => !open && setDeleteFFRId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Federal Financial Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this federal financial report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFFRId && deleteFFRMutation.mutate(deleteFFRId)}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAuditItemId !== null} onOpenChange={(open) => !open && setDeleteAuditItemId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Audit Prep Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this audit prep item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAuditItemId && deleteAuditItemMutation.mutate(deleteAuditItemId)}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
