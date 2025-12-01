import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  CreditCard, 
  Banknote, 
  Wallet,
  Calendar,
  Clock,
  Play,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import type { 
  Organization, 
  AutoPayRule, 
  ScheduledPayment, 
  BillPayment,
  Vendor 
} from "@shared/schema";

interface BillPaymentsProps {
  currentOrganization: Organization;
}

type PaymentMethod = 'ach' | 'card' | 'check' | 'manual';
type ScheduledPaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
type AutoPayStatus = 'active' | 'disabled' | 'paused';
type AutoPayRuleType = 'vendor' | 'amount_threshold' | 'due_date' | 'combined';

interface AutoPayRuleFormData {
  name: string;
  ruleType: AutoPayRuleType;
  vendorId: string;
  paymentMethod: PaymentMethod;
  daysBeforeDue: string;
  maxAmount: string;
  minAmount: string;
  status: AutoPayStatus;
  requiresApproval: boolean;
}

const defaultAutoPayFormData: AutoPayRuleFormData = {
  name: "",
  ruleType: "combined",
  vendorId: "any",
  paymentMethod: "ach",
  daysBeforeDue: "3",
  maxAmount: "",
  minAmount: "",
  status: "active",
  requiresApproval: false,
};

export default function BillPayments({ currentOrganization }: BillPaymentsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("scheduled");
  const [isAutoPayDialogOpen, setIsAutoPayDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoPayRule | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<number | null>(null);
  const [autoPayFormData, setAutoPayFormData] = useState<AutoPayRuleFormData>(defaultAutoPayFormData);

  // Fetch auto-pay rules
  const { data: autoPayRules = [], isLoading: isLoadingRules } = useQuery<AutoPayRule[]>({
    queryKey: ['/api/auto-pay-rules', currentOrganization.id],
  });

  // Fetch scheduled payments
  const { data: scheduledPayments = [], isLoading: isLoadingScheduled } = useQuery<
    Array<ScheduledPayment & { billNumber: string; vendorName: string | null; billTotalAmount: string }>
  >({
    queryKey: ['/api/scheduled-payments', currentOrganization.id],
  });

  // Fetch payment history
  const { data: paymentHistory = [], isLoading: isLoadingHistory } = useQuery<
    Array<BillPayment & { billNumber: string; vendorName: string | null }>
  >({
    queryKey: ['/api/bill-payments', currentOrganization.id],
  });

  // Fetch vendors for dropdown
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors', currentOrganization.id],
  });

  // Create auto-pay rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: AutoPayRuleFormData) => {
      return apiRequest('POST', '/api/auto-pay-rules', {
        organizationId: currentOrganization.id,
        name: data.name,
        ruleType: data.ruleType,
        vendorId: data.vendorId !== "any" ? parseInt(data.vendorId) : null,
        paymentMethod: data.paymentMethod,
        daysBeforeDue: parseInt(data.daysBeforeDue) || 0,
        maxAmount: data.maxAmount ? parseFloat(data.maxAmount).toFixed(2) : null,
        minAmount: data.minAmount ? parseFloat(data.minAmount).toFixed(2) : null,
        status: data.status,
        requiresApproval: data.requiresApproval,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-pay-rules', currentOrganization.id] });
      setIsAutoPayDialogOpen(false);
      resetAutoPayForm();
      toast({ title: "Auto-pay rule created successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create auto-pay rule", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update auto-pay rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<AutoPayRuleFormData> }) => {
      const payload: any = {};
      if (updates.name) payload.name = updates.name;
      if (updates.vendorId) payload.vendorId = updates.vendorId !== "any" ? parseInt(updates.vendorId) : null;
      if (updates.paymentMethod) payload.paymentMethod = updates.paymentMethod;
      if (updates.daysBeforeDue) payload.daysBeforeDue = parseInt(updates.daysBeforeDue);
      if (updates.maxAmount !== undefined) payload.maxAmount = updates.maxAmount ? parseFloat(updates.maxAmount).toFixed(2) : null;
      if (updates.minAmount !== undefined) payload.minAmount = updates.minAmount ? parseFloat(updates.minAmount).toFixed(2) : null;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.requiresApproval !== undefined) payload.requiresApproval = updates.requiresApproval;
      
      return apiRequest('PATCH', `/api/auto-pay-rules/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-pay-rules', currentOrganization.id] });
      setIsAutoPayDialogOpen(false);
      setEditingRule(null);
      resetAutoPayForm();
      toast({ title: "Auto-pay rule updated successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update auto-pay rule", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete auto-pay rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/auto-pay-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-pay-rules', currentOrganization.id] });
      setDeleteRuleId(null);
      toast({ title: "Auto-pay rule deleted" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete auto-pay rule", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (scheduledPaymentId: number) => {
      return apiRequest('POST', `/api/scheduled-payments/${scheduledPaymentId}/process`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-payments', currentOrganization.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/bill-payments', currentOrganization.id] });
      toast({ title: "Payment processed successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Payment processing failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Cancel scheduled payment mutation
  const cancelPaymentMutation = useMutation({
    mutationFn: async (scheduledPaymentId: number) => {
      return apiRequest('POST', `/api/scheduled-payments/${scheduledPaymentId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-payments', currentOrganization.id] });
      toast({ title: "Payment cancelled" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to cancel payment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const resetAutoPayForm = () => {
    setAutoPayFormData(defaultAutoPayFormData);
  };

  const handleEditRule = (rule: AutoPayRule) => {
    setEditingRule(rule);
    setAutoPayFormData({
      name: rule.name,
      ruleType: rule.ruleType as AutoPayRuleType,
      vendorId: rule.vendorId?.toString() || "any",
      paymentMethod: rule.paymentMethod as PaymentMethod,
      daysBeforeDue: (rule.daysBeforeDue || 0).toString(),
      maxAmount: rule.maxAmount || "",
      minAmount: rule.minAmount || "",
      status: rule.status,
      requiresApproval: rule.requiresApproval,
    });
    setIsAutoPayDialogOpen(true);
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'ach':
        return <Banknote className="w-4 h-4" />;
      case 'check':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod): string => {
    switch (method) {
      case 'card':
        return 'Credit Card';
      case 'ach':
        return 'Bank Transfer (ACH)';
      case 'check':
        return 'Check';
      default:
        return 'Manual';
    }
  };

  const getStatusBadge = (status: ScheduledPaymentStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><Play className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingPayments = scheduledPayments.filter(p => p.status === 'pending');
  const processingPayments = scheduledPayments.filter(p => p.status === 'processing');

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Bill Payments</h1>
        <p className="text-muted-foreground">Manage automatic payments, scheduled payments, and payment history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingPayments.length}</p>
                <p className="text-sm text-muted-foreground">Scheduled Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-autopay-count">{autoPayRules.filter(r => r.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Active Auto-Pay Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-processing-count">{processingPayments.length}</p>
                <p className="text-sm text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled">
            <Calendar className="w-4 h-4 mr-2" />
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="auto-pay" data-testid="tab-autopay">
            <Play className="w-4 h-4 mr-2" />
            Auto-Pay Rules
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Clock className="w-4 h-4 mr-2" />
            Payment History
          </TabsTrigger>
        </TabsList>

        {/* Scheduled Payments Tab */}
        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Payments</CardTitle>
              <CardDescription>Upcoming and pending bill payments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingScheduled ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : scheduledPayments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No scheduled payments</p>
                  <p className="text-sm">Set up auto-pay rules to automatically schedule payments</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Bill</th>
                        <th className="pb-3 font-medium">Vendor</th>
                        <th className="pb-3 font-medium">Scheduled Date</th>
                        <th className="pb-3 font-medium">Amount</th>
                        <th className="pb-3 font-medium">Method</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledPayments.map((payment) => (
                        <tr key={payment.id} className="border-b" data-testid={`row-scheduled-${payment.id}`}>
                          <td className="py-3">
                            <span className="font-medium">{payment.billNumber}</span>
                          </td>
                          <td className="py-3">
                            {payment.vendorName || <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="py-3">{format(new Date(payment.scheduledDate), "MMM dd, yyyy")}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{parseFloat(payment.amount).toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              {getPaymentMethodIcon(payment.paymentMethod as PaymentMethod)}
                              <span className="text-sm">{getPaymentMethodLabel(payment.paymentMethod as PaymentMethod)}</span>
                            </div>
                          </td>
                          <td className="py-3">{getStatusBadge(payment.status as ScheduledPaymentStatus)}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {payment.status === 'pending' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => processPaymentMutation.mutate(payment.id)}
                                    disabled={processPaymentMutation.isPending}
                                    data-testid={`button-process-${payment.id}`}
                                  >
                                    <Play className="w-3 h-3 mr-1" />
                                    Process
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => cancelPaymentMutation.mutate(payment.id)}
                                    disabled={cancelPaymentMutation.isPending}
                                    data-testid={`button-cancel-${payment.id}`}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto-Pay Rules Tab */}
        <TabsContent value="auto-pay">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Auto-Pay Rules</CardTitle>
                <CardDescription>Configure automatic payment scheduling for your bills</CardDescription>
              </div>
              <Button onClick={() => setIsAutoPayDialogOpen(true)} data-testid="button-create-rule">
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingRules ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : autoPayRules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No auto-pay rules configured</p>
                  <p className="text-sm">Create rules to automatically schedule payments for your bills</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {autoPayRules.map((rule) => (
                    <Card key={rule.id} className={rule.status !== 'active' ? "opacity-60" : ""} data-testid={`card-rule-${rule.id}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium" data-testid={`text-rule-name-${rule.id}`}>{rule.name}</h3>
                              {rule.status === 'disabled' && <Badge variant="secondary">Disabled</Badge>}
                              {rule.status === 'paused' && <Badge variant="outline">Paused</Badge>}
                              {rule.requiresApproval && <Badge variant="outline">Requires Approval</Badge>}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {getPaymentMethodIcon(rule.paymentMethod as PaymentMethod)}
                                {getPaymentMethodLabel(rule.paymentMethod as PaymentMethod)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {rule.daysBeforeDue} days before due
                              </span>
                              {(rule.minAmount || rule.maxAmount) && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  {rule.minAmount && `Min: $${parseFloat(rule.minAmount).toFixed(2)}`}
                                  {rule.minAmount && rule.maxAmount && " - "}
                                  {rule.maxAmount && `Max: $${parseFloat(rule.maxAmount).toFixed(2)}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRule(rule)}
                              data-testid={`button-edit-rule-${rule.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteRuleId(rule.id)}
                              data-testid={`button-delete-rule-${rule.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Record of completed payments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No payment history</p>
                  <p className="text-sm">Completed payments will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Bill</th>
                        <th className="pb-3 font-medium">Vendor</th>
                        <th className="pb-3 font-medium">Payment Date</th>
                        <th className="pb-3 font-medium">Amount</th>
                        <th className="pb-3 font-medium">Method</th>
                        <th className="pb-3 font-medium">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id} className="border-b" data-testid={`row-payment-${payment.id}`}>
                          <td className="py-3">
                            <span className="font-medium">{payment.billNumber}</span>
                          </td>
                          <td className="py-3">
                            {payment.vendorName || <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="py-3">{format(new Date(payment.paymentDate), "MMM dd, yyyy")}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{parseFloat(payment.amount).toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              {getPaymentMethodIcon(payment.paymentMethod as PaymentMethod)}
                              <span className="text-sm">{getPaymentMethodLabel(payment.paymentMethod as PaymentMethod)}</span>
                            </div>
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {payment.referenceNumber || payment.checkNumber || payment.stripePaymentIntentId || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Auto-Pay Rule Dialog */}
      <Dialog open={isAutoPayDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAutoPayDialogOpen(false);
          setEditingRule(null);
          resetAutoPayForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Auto-Pay Rule" : "Create Auto-Pay Rule"}</DialogTitle>
            <DialogDescription>
              {editingRule 
                ? "Update the auto-pay rule settings" 
                : "Configure automatic payment scheduling for matching bills"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingRule) {
                updateRuleMutation.mutate({ id: editingRule.id, updates: autoPayFormData });
              } else {
                createRuleMutation.mutate(autoPayFormData);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="ruleName">Rule Name *</Label>
              <Input
                id="ruleName"
                value={autoPayFormData.name}
                onChange={(e) => setAutoPayFormData({ ...autoPayFormData, name: e.target.value })}
                placeholder="e.g., Pay all utility bills"
                required
                data-testid="input-rule-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorId">Vendor</Label>
              <Select
                value={autoPayFormData.vendorId}
                onValueChange={(value) => setAutoPayFormData({ ...autoPayFormData, vendorId: value })}
              >
                <SelectTrigger id="vendorId" data-testid="select-vendor">
                  <SelectValue placeholder="Select vendor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any vendor</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Only apply to bills from this vendor, or "Any vendor" to match all</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select
                value={autoPayFormData.paymentMethod}
                onValueChange={(value: PaymentMethod) => setAutoPayFormData({ ...autoPayFormData, paymentMethod: value })}
              >
                <SelectTrigger id="paymentMethod" data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ach">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Bank Transfer (ACH)
                    </div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Credit Card
                    </div>
                  </SelectItem>
                  <SelectItem value="check">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Check
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Manual
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="daysBeforeDue">Days Before Due Date</Label>
              <Input
                id="daysBeforeDue"
                type="number"
                min="0"
                max="30"
                value={autoPayFormData.daysBeforeDue}
                onChange={(e) => setAutoPayFormData({ ...autoPayFormData, daysBeforeDue: e.target.value })}
                data-testid="input-days-before"
              />
              <p className="text-xs text-muted-foreground">Schedule payment this many days before the bill is due</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minAmount">Minimum Amount</Label>
                <Input
                  id="minAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={autoPayFormData.minAmount}
                  onChange={(e) => setAutoPayFormData({ ...autoPayFormData, minAmount: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-min-amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAmount">Maximum Amount</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={autoPayFormData.maxAmount}
                  onChange={(e) => setAutoPayFormData({ ...autoPayFormData, maxAmount: e.target.value })}
                  placeholder="No limit"
                  data-testid="input-max-amount"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={autoPayFormData.status}
                onValueChange={(value: AutoPayStatus) => setAutoPayFormData({ ...autoPayFormData, status: value })}
              >
                <SelectTrigger id="status" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Control whether this rule is actively scheduling payments</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requiresApproval">Require Approval</Label>
                <p className="text-xs text-muted-foreground">Payments need approval before processing</p>
              </div>
              <Switch
                id="requiresApproval"
                checked={autoPayFormData.requiresApproval}
                onCheckedChange={(checked) => setAutoPayFormData({ ...autoPayFormData, requiresApproval: checked })}
                data-testid="switch-approval"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsAutoPayDialogOpen(false);
                setEditingRule(null);
                resetAutoPayForm();
              }}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                data-testid="button-save-rule"
              >
                {editingRule ? "Save Changes" : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={(open) => !open && setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Auto-Pay Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this auto-pay rule? This action cannot be undone.
              Any pending scheduled payments created by this rule will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRuleId && deleteRuleMutation.mutate(deleteRuleId)}
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
