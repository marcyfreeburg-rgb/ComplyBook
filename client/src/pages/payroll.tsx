import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, Calendar, Users, Eye, Play, Trash2, AlertCircle, UserPlus, Edit, Link2, Unlink, CheckCircle2, Loader2, FileText, Upload, Download, MoreHorizontal, Mail, Send } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import type { PayrollRun, PayrollItem, Employee, Deduction, Organization, Document as DocumentType, Paystub } from "@shared/schema";

interface PayrollProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Payroll({ currentOrganization, userId }: PayrollProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [editingPayrollRun, setEditingPayrollRun] = useState<PayrollRun | null>(null);
  const [deletePayrollRunId, setDeletePayrollRunId] = useState<number | null>(null);
  const [selectedPayrollRun, setSelectedPayrollRun] = useState<PayrollRun | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [hoursWorked, setHoursWorked] = useState<string>("");
  const [isPaystubDialogOpen, setIsPaystubDialogOpen] = useState(false);
  const [selectedPaystub, setSelectedPaystub] = useState<Paystub | null>(null);
  
  const [formData, setFormData] = useState({
    payPeriodStart: "",
    payPeriodEnd: "",
    payDate: "",
    notes: "",
  });

  const { data: payrollRuns = [], isLoading } = useQuery<PayrollRun[]>({
    queryKey: [`/api/payroll-runs/${currentOrganization.id}`],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: [`/api/employees/${currentOrganization.id}/active`],
  });

  const { data: deductions = [] } = useQuery<Deduction[]>({
    queryKey: [`/api/deductions/${currentOrganization.id}/active`],
  });

  // Policies & Procedures documents
  const [isUploadingPolicy, setIsUploadingPolicy] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
  
  const { data: policyDocuments = [], isLoading: isLoadingPolicies } = useQuery<DocumentType[]>({
    queryKey: ['/api/documents', 'policy', currentOrganization.id],
    queryFn: async () => {
      const response = await fetch(`/api/documents/policy/${currentOrganization.id}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const uploadPolicyDocument = async (file: File) => {
    setIsUploadingPolicy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'policy');
      formData.append('entityId', currentOrganization.id.toString());
      formData.append('category', 'policies');
      formData.append('name', file.name);
      
      // Get CSRF token from cookie for file upload
      const csrfToken = document.cookie.split(';').find(c => c.trim().startsWith('csrf_token='))?.split('=')[1];
      
      const response = await fetch('/api/documents/upload-file', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload document');
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/documents', 'policy', currentOrganization.id] });
      toast({ title: "Document uploaded", description: "Policy document uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message || "Failed to upload document", variant: "destructive" });
    } finally {
      setIsUploadingPolicy(false);
    }
  };

  const deletePolicyDocumentMutation = useMutation({
    mutationFn: async (docId: number) => {
      await apiRequest('DELETE', `/api/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents', 'policy', currentOrganization.id] });
      toast({ title: "Document deleted" });
      setDeleteDocId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete document", variant: "destructive" });
    }
  });

  // Email paystub mutation
  const emailPaystubMutation = useMutation({
    mutationFn: async (paystubId: number) => {
      const response = await apiRequest('POST', `/api/paystubs/${paystubId}/email`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Paystub sent", description: `Paystub emailed to ${data.to}` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to email paystub", variant: "destructive" });
    }
  });

  const { data: finchConnections = [], isLoading: isLoadingFinchConnections } = useQuery<Array<{
    id: number;
    connectionId: string;
    companyId: string | null;
    providerId: string | null;
    providerName: string | null;
    products: string[] | null;
    status: string;
    errorMessage: string | null;
    lastSyncedAt: string | null;
    createdAt: string;
  }>>({
    queryKey: [`/api/finch/connection/${currentOrganization.id}`],
  });

  const connectFinchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/finch/create-session/${currentOrganization.id}`, {});
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      if (data.connectUrl) {
        window.location.href = data.connectUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to connect payroll provider",
        variant: "destructive",
      });
    },
  });

  const disconnectFinchMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return await apiRequest('DELETE', `/api/finch/disconnect/${connectionId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/finch/connection/${currentOrganization.id}`] });
      toast({
        title: "Disconnected",
        description: "Successfully disconnected payroll provider",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect payroll provider",
        variant: "destructive",
      });
    },
  });

  const { data: payrollItems = [], isLoading: isLoadingItems } = useQuery<Array<PayrollItem & { employeeName: string; employeeNumber: string | null }>>({
    queryKey: [`/api/payroll-items/${selectedPayrollRun?.id}`],
    enabled: !!selectedPayrollRun,
  });

  const { data: paystubs = [] } = useQuery<Paystub[]>({
    queryKey: ['/api/paystubs/payroll-run', selectedPayrollRun?.id],
    queryFn: async () => {
      if (!selectedPayrollRun?.id) return [];
      const response = await fetch(`/api/paystubs/payroll-run/${selectedPayrollRun.id}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedPayrollRun && selectedPayrollRun.status !== 'draft',
  });

  const getPaystubForItem = (payrollItemId: number): Paystub | undefined => {
    return paystubs.find(p => p.payrollItemId === payrollItemId);
  };

  const resetForm = () => {
    setFormData({
      payPeriodStart: "",
      payPeriodEnd: "",
      payDate: "",
      notes: "",
    });
  };

  const createPayrollRunMutation = useMutation({
    mutationFn: async () => {
      if (!formData.payPeriodStart || !formData.payPeriodEnd || !formData.payDate) {
        throw new Error("Pay period and pay date are required");
      }
      return await apiRequest('POST', '/api/payroll-runs', {
        organizationId: currentOrganization.id,
        payPeriodStart: formData.payPeriodStart,
        payPeriodEnd: formData.payPeriodEnd,
        payDate: formData.payDate,
        status: 'draft',
        totalGross: '0',
        totalDeductions: '0',
        totalNet: '0',
        notes: formData.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payroll-runs/${currentOrganization.id}`] });
      toast({
        title: "Payroll run created",
        description: "Payroll run has been created successfully.",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payroll run. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePayrollRunMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest('PATCH', `/api/payroll-runs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payroll-runs/${currentOrganization.id}`] });
      toast({
        title: "Payroll run updated",
        description: "Payroll run has been updated successfully.",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payroll run. Please try again.",
        variant: "destructive",
      });
    },
  });

  const processPayrollRunMutation = useMutation({
    mutationFn: async (payrollRunId: number) => {
      return await apiRequest('POST', `/api/payroll-runs/${payrollRunId}/process`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payroll-runs/${currentOrganization.id}`] });
      toast({
        title: "Payroll processed",
        description: "Payroll run has been processed successfully.",
      });
      if (selectedPayrollRun) {
        setSelectedPayrollRun({ ...selectedPayrollRun, status: 'processed' as any });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process payroll run.",
        variant: "destructive",
      });
    },
  });

  const deletePayrollRunMutation = useMutation({
    mutationFn: async (payrollRunId: number) => {
      return await apiRequest('DELETE', `/api/payroll-runs/${payrollRunId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payroll-runs/${currentOrganization.id}`] });
      toast({
        title: "Payroll run deleted",
        description: "The payroll run has been removed successfully.",
      });
      setDeletePayrollRunId(null);
      if (selectedPayrollRun && isViewDialogOpen) {
        setIsViewDialogOpen(false);
        setSelectedPayrollRun(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payroll run.",
        variant: "destructive",
      });
    },
  });

  const addEmployeeToPayrollMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPayrollRun || !selectedEmployeeId) {
        throw new Error("Please select an employee");
      }
      
      const employee = employees.find(e => e.id === parseInt(selectedEmployeeId));
      if (!employee) {
        throw new Error("Employee not found");
      }

      // Validate hours for hourly employees (client-side only for UX)
      if (employee.payType === 'hourly') {
        if (!hoursWorked || parseFloat(hoursWorked) <= 0) {
          throw new Error("Hours worked is required for hourly employees");
        }
      }

      // Send only minimal data - server will calculate everything
      const payload: any = {
        payrollRunId: selectedPayrollRun.id,
        employeeId: employee.id,
      };

      // Include hours only if provided (for hourly employees)
      if (hoursWorked && parseFloat(hoursWorked) > 0) {
        payload.hoursWorked = parseFloat(hoursWorked);
      }

      return await apiRequest('POST', '/api/payroll-items', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payroll-items/${selectedPayrollRun?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/payroll-runs/${currentOrganization.id}`] });
      toast({
        title: "Employee added",
        description: "Employee has been added to the payroll run successfully.",
      });
      setIsAddEmployeeDialogOpen(false);
      setSelectedEmployeeId("");
      setHoursWorked("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add employee to payroll run.",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingPayrollRun(null);
    resetForm();
  };

  const handleEditPayrollRun = (payrollRun: PayrollRun) => {
    setEditingPayrollRun(payrollRun);
    setFormData({
      payPeriodStart: typeof payrollRun.payPeriodStart === 'string' ? payrollRun.payPeriodStart : new Date(payrollRun.payPeriodStart).toISOString().split('T')[0],
      payPeriodEnd: typeof payrollRun.payPeriodEnd === 'string' ? payrollRun.payPeriodEnd : new Date(payrollRun.payPeriodEnd).toISOString().split('T')[0],
      payDate: typeof payrollRun.payDate === 'string' ? payrollRun.payDate : new Date(payrollRun.payDate).toISOString().split('T')[0],
      notes: payrollRun.notes || "",
    });
    setIsCreateDialogOpen(true);
  };

  const handleDeletePayrollRun = (id: number) => {
    setDeletePayrollRunId(id);
  };

  const confirmDelete = () => {
    if (deletePayrollRunId) {
      deletePayrollRunMutation.mutate(deletePayrollRunId);
    }
  };

  const handleViewPayrollRun = (payrollRun: PayrollRun) => {
    setSelectedPayrollRun(payrollRun);
    setIsViewDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.payPeriodStart || !formData.payPeriodEnd || !formData.payDate) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (editingPayrollRun) {
      updatePayrollRunMutation.mutate({ id: editingPayrollRun.id, data: formData });
    } else {
      createPayrollRunMutation.mutate();
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'processed':
        return 'default';
      case 'paid':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'processed':
        return 'text-blue-600 dark:text-blue-400';
      case 'paid':
        return 'text-green-600 dark:text-green-400';
      default:
        return '';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Payroll</h1>
          <p className="text-muted-foreground">Manage payroll runs and employee payments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          if (!open) handleCloseDialog();
          else setIsCreateDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-payroll-run">
              <Plus className="w-4 h-4 mr-2" />
              New Payroll Run
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPayrollRun ? 'Edit Payroll Run' : 'Create Payroll Run'}</DialogTitle>
              <DialogDescription>
                {editingPayrollRun 
                  ? 'Update payroll run details for the pay period'
                  : 'Create a new payroll run for a pay period'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pay-period-start">Pay Period Start *</Label>
                  <Input
                    id="pay-period-start"
                    type="date"
                    value={formData.payPeriodStart}
                    onChange={(e) => setFormData({ ...formData, payPeriodStart: e.target.value })}
                    data-testid="input-pay-period-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay-period-end">Pay Period End *</Label>
                  <Input
                    id="pay-period-end"
                    type="date"
                    value={formData.payPeriodEnd}
                    onChange={(e) => setFormData({ ...formData, payPeriodEnd: e.target.value })}
                    data-testid="input-pay-period-end"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-date">Pay Date *</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={formData.payDate}
                  onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}
                  data-testid="input-pay-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional information about this payroll run"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="input-notes"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel-payroll-run"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    createPayrollRunMutation.isPending ||
                    updatePayrollRunMutation.isPending ||
                    !formData.payPeriodStart ||
                    !formData.payPeriodEnd ||
                    !formData.payDate
                  }
                  data-testid="button-submit-payroll-run"
                >
                  {editingPayrollRun 
                    ? (updatePayrollRunMutation.isPending ? "Updating..." : "Update")
                    : (createPayrollRunMutation.isPending ? "Creating..." : "Create")
                  }
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {employees.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">No Active Employees</h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  You need to add active employees before creating payroll runs. Go to the Employees page to add employees.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show onboarding card when no payroll provider is connected */}
      {finchConnections.length === 0 && (
        <Card data-testid="card-payroll-onboarding">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Connect Your Payroll Provider</CardTitle>
                <CardDescription>
                  Sync employee data from your existing payroll system
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect to 200+ payroll providers including Gusto, ADP, Paychex, BambooHR, Paylocity, Rippling, and more. 
                Automatically sync employee information and streamline your payroll management.
              </p>
              <Button
                onClick={() => connectFinchMutation.mutate()}
                disabled={connectFinchMutation.isPending}
                data-testid="button-connect-payroll"
              >
                {connectFinchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Connect Payroll Provider
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show Finch connection details when connected */}
      {finchConnections.length > 0 && (
        <Card data-testid="card-finch-integration">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Finch Payroll Connections</CardTitle>
                  <CardDescription>
                    Synced with your payroll providers
                  </CardDescription>
                </div>
              </div>
              <Badge variant="default" className="bg-blue-600" data-testid="badge-finch-connected">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {finchConnections.length} Connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {finchConnections.map((conn) => (
                <div key={conn.id} className="border rounded-md p-4" data-testid={`card-finch-connection-${conn.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <div>
                      <h4 className="font-semibold" data-testid={`text-finch-provider-${conn.id}`}>{conn.providerName || conn.providerId || 'Unknown Provider'}</h4>
                      <p className="text-sm text-muted-foreground">
                        Connected {new Date(conn.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={conn.status === 'active' ? 'default' : 'destructive'} data-testid={`badge-finch-status-${conn.id}`}>
                      {conn.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-muted rounded-md mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Products</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {conn.products?.slice(0, 3).map((product) => (
                          <Badge key={product} variant="outline" className="text-xs">
                            {product}
                          </Badge>
                        ))}
                        {(conn.products?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(conn.products?.length || 0) - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold capitalize">{conn.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Synced</p>
                      <p className="font-semibold">
                        {conn.lastSyncedAt 
                          ? new Date(conn.lastSyncedAt).toLocaleDateString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectFinchMutation.mutate(conn.connectionId)}
                      disabled={disconnectFinchMutation.isPending}
                      data-testid={`button-disconnect-finch-${conn.id}`}
                    >
                      {disconnectFinchMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4 mr-2" />
                      )}
                      Disconnect
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => connectFinchMutation.mutate()}
                disabled={connectFinchMutation.isPending}
                data-testid="button-add-finch-provider"
              >
                {connectFinchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Another Provider
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payroll Run Details</DialogTitle>
            <DialogDescription>
              View payroll items and process payroll
            </DialogDescription>
          </DialogHeader>
          {selectedPayrollRun && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-md">
                <div>
                  <p className="text-sm text-muted-foreground">Pay Period</p>
                  <p className="font-semibold">
                    {new Date(selectedPayrollRun.payPeriodStart).toLocaleDateString()} - {new Date(selectedPayrollRun.payPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pay Date</p>
                  <p className="font-semibold">{new Date(selectedPayrollRun.payDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadgeVariant(selectedPayrollRun.status)} className="mt-1">
                    <span className={getStatusColor(selectedPayrollRun.status)}>
                      {selectedPayrollRun.status.charAt(0).toUpperCase() + selectedPayrollRun.status.slice(1)}
                    </span>
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Net Pay</p>
                  <p className="font-semibold text-lg">${parseFloat(selectedPayrollRun.totalNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle>Payroll Items</CardTitle>
                      <CardDescription>
                        Employees included in this payroll run
                      </CardDescription>
                    </div>
                    {selectedPayrollRun.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => setIsAddEmployeeDialogOpen(true)}
                        data-testid="button-add-employee-to-payroll"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Employee
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingItems ? (
                    <div className="text-center py-8 text-muted-foreground">Loading payroll items...</div>
                  ) : payrollItems.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">No payroll items yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add employees to this payroll run to continue
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Gross Pay</TableHead>
                          <TableHead>Deductions</TableHead>
                          <TableHead>Net Pay</TableHead>
                          {selectedPayrollRun.status !== 'draft' && (
                            <TableHead>Paystub</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payrollItems.map((item) => {
                          const paystub = getPaystubForItem(item.id);
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.employeeName}</p>
                                  {item.employeeNumber && (
                                    <p className="text-xs text-muted-foreground">#{item.employeeNumber}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{item.hoursWorked || '-'}</TableCell>
                              <TableCell>${parseFloat(item.grossPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell>${parseFloat(item.totalDeductions).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="font-semibold">${parseFloat(item.netPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                              {selectedPayrollRun.status !== 'draft' && (
                                <TableCell>
                                  {paystub ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedPaystub(paystub);
                                        setIsPaystubDialogOpen(true);
                                      }}
                                      data-testid={`button-view-paystub-${item.id}`}
                                    >
                                      <FileText className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-2 justify-end">
                {selectedPayrollRun.status === 'draft' && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => deletePayrollRunMutation.mutate(selectedPayrollRun.id)}
                      disabled={deletePayrollRunMutation.isPending}
                      data-testid="button-delete-payroll-run"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                    <Button
                      onClick={() => processPayrollRunMutation.mutate(selectedPayrollRun.id)}
                      disabled={processPayrollRunMutation.isPending || payrollItems.length === 0}
                      data-testid="button-process-payroll-run"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Process Payroll
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Employee to Payroll</DialogTitle>
            <DialogDescription>
              Select an employee to add to this payroll run. Pay will be calculated automatically based on their rate and any active deductions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="employee-select">Employee *</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={(value) => setSelectedEmployeeId(value)}
              >
                <SelectTrigger id="employee-select" data-testid="select-employee">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter(emp => !payrollItems.find(item => item.employeeId === emp.id))
                    .map((employee) => (
                      <SelectItem key={employee.id} value={String(employee.id)}>
                        {employee.firstName} {employee.lastName}
                        {employee.employeeNumber && ` (${employee.employeeNumber})`}
                        {' - '}
                        {employee.payType === 'hourly' 
                          ? `$${parseFloat(employee.payRate).toFixed(2)}/hr`
                          : `$${parseFloat(employee.payRate).toLocaleString()}/year`
                        }
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEmployeeId && employees.find(e => e.id === parseInt(selectedEmployeeId))?.payType === 'hourly' && (
              <div className="space-y-2">
                <Label htmlFor="hours-worked">Hours Worked *</Label>
                <Input
                  id="hours-worked"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="40.00"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  data-testid="input-hours-worked"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the total hours worked during this pay period
                </p>
              </div>
            )}
            {deductions.length > 0 && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-semibold mb-2">Active Deductions:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {deductions.map((deduction) => (
                    <li key={deduction.id}>
                      • {deduction.name}: {deduction.calculationType === 'percentage' 
                        ? `${parseFloat(deduction.amount).toFixed(2)}%` 
                        : `$${parseFloat(deduction.amount).toFixed(2)}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddEmployeeDialogOpen(false);
                  setSelectedEmployeeId("");
                  setHoursWorked("");
                }}
                data-testid="button-add-employee-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={() => addEmployeeToPayrollMutation.mutate()}
                disabled={
                  addEmployeeToPayrollMutation.isPending ||
                  !selectedEmployeeId ||
                  (employees.find(e => e.id === parseInt(selectedEmployeeId))?.payType === 'hourly' && !hoursWorked)
                }
                data-testid="button-add-employee-submit"
              >
                {addEmployeeToPayrollMutation.isPending ? "Adding..." : "Add to Payroll"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paystub Viewing Dialog - Colorado-compliant earnings statement */}
      <Dialog open={isPaystubDialogOpen} onOpenChange={setIsPaystubDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-paystub">
          <DialogHeader className="sr-only">
            <DialogTitle>Pay Statement</DialogTitle>
            <DialogDescription>Colorado-compliant paycheck stub</DialogDescription>
          </DialogHeader>
          {selectedPaystub && (
            <div className="space-y-4">
              {/* Header - Company and Title */}
              <div className="flex justify-between items-start border-b-2 border-primary pb-4">
                <div>
                  {currentOrganization.logoUrl ? (
                    <img 
                      src={currentOrganization.logoUrl} 
                      alt={selectedPaystub.employerName} 
                      className="max-h-12 object-contain mb-2"
                      data-testid="img-paystub-logo"
                    />
                  ) : (
                    <h2 className="text-lg font-bold text-primary" data-testid="text-paystub-employer">{selectedPaystub.employerName}</h2>
                  )}
                  {selectedPaystub.employerAddress && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{selectedPaystub.employerAddress}</p>
                  )}
                  {selectedPaystub.employerEin && (
                    <p className="text-xs text-muted-foreground">EIN: {selectedPaystub.employerEin}</p>
                  )}
                </div>
                <div className="text-right">
                  <h1 className="text-2xl font-bold tracking-tight">EARNINGS STATEMENT</h1>
                  <div className="flex gap-2 mt-2 justify-end">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => emailPaystubMutation.mutate(selectedPaystub.id)}
                      disabled={emailPaystubMutation.isPending}
                      data-testid="button-email-paystub"
                    >
                      {emailPaystubMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Email to Employee
                    </Button>
                  </div>
                </div>
              </div>

              {/* Employee Info Grid */}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary text-primary-foreground hover:bg-primary">
                      <TableHead className="text-primary-foreground font-semibold text-xs">EMPLOYEE NAME/ADDRESS</TableHead>
                      <TableHead className="text-primary-foreground font-semibold text-xs text-center">EMPLOYEE NO.</TableHead>
                      <TableHead className="text-primary-foreground font-semibold text-xs text-center">REPORTING PERIOD</TableHead>
                      <TableHead className="text-primary-foreground font-semibold text-xs text-center">PAY DATE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="align-top">
                        <p className="font-medium" data-testid="text-paystub-employee">{selectedPaystub.employeeName}</p>
                        {selectedPaystub.employeeAddress && (
                          <p className="text-xs text-muted-foreground whitespace-pre-line">{selectedPaystub.employeeAddress}</p>
                        )}
                        {selectedPaystub.ssnLastFour && (
                          <p className="text-xs text-muted-foreground">SSN: XXX-XX-{selectedPaystub.ssnLastFour}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-center align-top">-</TableCell>
                      <TableCell className="text-center align-top" data-testid="text-paystub-period">
                        {new Date(selectedPaystub.payPeriodStart).toLocaleDateString()} — {new Date(selectedPaystub.payPeriodEnd).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center align-top" data-testid="text-paystub-paydate">
                        {new Date(selectedPaystub.payDate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Main Content - Earnings and Deductions side by side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Income/Earnings Column */}
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="text-xs font-semibold">INCOME</TableHead>
                        <TableHead className="text-xs font-semibold text-right">RATE</TableHead>
                        <TableHead className="text-xs font-semibold text-right">HOURS</TableHead>
                        <TableHead className="text-xs font-semibold text-right">CURRENT PAY</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-sm">REGULAR</TableCell>
                        <TableCell className="text-right text-sm">
                          {selectedPaystub.isHourly === 1 ? `$${parseFloat(selectedPaystub.hourlyRate || '0').toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {selectedPaystub.isHourly === 1 ? (selectedPaystub.regularHours || '0.00') : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          ${parseFloat(selectedPaystub.regularPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                      {parseFloat(selectedPaystub.overtimePay || '0') > 0 && (
                        <TableRow>
                          <TableCell className="text-sm">OVERTIME</TableCell>
                          <TableCell className="text-right text-sm">-</TableCell>
                          <TableCell className="text-right text-sm">{selectedPaystub.overtimeHours || '-'}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            ${parseFloat(selectedPaystub.overtimePay || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Deductions Column */}
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead colSpan={2} className="text-xs font-semibold">STATUTORY DEDUCTION</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-sm">FICA-Medicare</TableCell>
                        <TableCell className="text-right text-sm">
                          ${parseFloat(selectedPaystub.medicareTax || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm">FICA-Social Security</TableCell>
                        <TableCell className="text-right text-sm">
                          ${parseFloat(selectedPaystub.socialSecurityTax || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm">Federal tax</TableCell>
                        <TableCell className="text-right text-sm">
                          ${parseFloat(selectedPaystub.federalIncomeTax || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm">State tax</TableCell>
                        <TableCell className="text-right text-sm">
                          ${parseFloat(selectedPaystub.stateIncomeTax || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                      {/* Other deductions */}
                      {Array.isArray(selectedPaystub.deductionsDetail) && (selectedPaystub.deductionsDetail as Array<{name: string; type: string; amount: string}>)
                        .filter(d => d.type !== 'tax')
                        .map((ded, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{ded.name}</TableCell>
                            <TableCell className="text-right text-sm">
                              ${parseFloat(ded.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals Footer */}
              <div className="border-2 border-primary rounded-md overflow-hidden">
                <div className="grid grid-cols-6 text-center text-sm">
                  <div className="p-3 border-r border-muted bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">GROSS</p>
                    <p className="font-semibold" data-testid="text-paystub-gross">
                      ${parseFloat(selectedPaystub.grossPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 border-r border-muted bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">YTD DEDUCTION</p>
                    <p className="font-semibold" data-testid="text-paystub-ytd-deductions">
                      ${parseFloat(selectedPaystub.ytdTotalDeductions || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 border-r border-muted bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">YTD NET PAY</p>
                    <p className="font-semibold" data-testid="text-paystub-ytd-net">
                      ${parseFloat(selectedPaystub.ytdNetPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 border-r border-muted bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">TOTAL</p>
                    <p className="font-semibold">
                      ${parseFloat(selectedPaystub.grossPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 border-r border-muted bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">DEDUCTION</p>
                    <p className="font-semibold text-destructive">
                      ${parseFloat(selectedPaystub.totalDeductions).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/30">
                    <p className="text-xs text-green-700 dark:text-green-400 mb-1">NET PAY</p>
                    <p className="font-bold text-lg text-green-700 dark:text-green-400" data-testid="text-paystub-net-pay">
                      ${parseFloat(selectedPaystub.netPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                This statement is for informational purposes. Please retain for your records.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Runs</CardTitle>
          <CardDescription>
            All payroll runs for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payroll runs...</div>
          ) : payrollRuns.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No payroll runs yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first payroll run to start processing payroll
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Gross</TableHead>
                  <TableHead>Total Deductions</TableHead>
                  <TableHead>Total Net</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRuns.map((payrollRun) => (
                  <TableRow key={payrollRun.id} data-testid={`payroll-run-${payrollRun.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {new Date(payrollRun.payPeriodStart).toLocaleDateString()} - {new Date(payrollRun.payPeriodEnd).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(payrollRun.payDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(payrollRun.status)}>
                        <span className={getStatusColor(payrollRun.status)}>
                          {payrollRun.status.charAt(0).toUpperCase() + payrollRun.status.slice(1)}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>${parseFloat(payrollRun.totalGross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>${parseFloat(payrollRun.totalDeductions).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="font-semibold">${parseFloat(payrollRun.totalNet).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPayrollRun(payrollRun)}
                          data-testid={`button-view-payroll-run-${payrollRun.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        {payrollRun.status === 'draft' && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditPayrollRun(payrollRun)}
                              data-testid={`button-edit-${payrollRun.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeletePayrollRun(payrollRun.id)}
                              data-testid={`button-delete-${payrollRun.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Policies & Procedures Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Policies & Procedures
            </CardTitle>
            <CardDescription>Upload and manage HR policies, employee handbooks, and procedures</CardDescription>
          </div>
          <div>
            <input
              type="file"
              id="policy-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPolicyDocument(file);
                e.target.value = '';
              }}
            />
            <Button 
              onClick={() => document.getElementById('policy-upload')?.click()}
              disabled={isUploadingPolicy}
              data-testid="button-upload-policy"
            >
              {isUploadingPolicy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPolicies ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading documents...</span>
            </div>
          ) : policyDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No policy documents uploaded yet</p>
              <p className="text-sm">Upload employee handbooks, HR policies, and procedures here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policyDocuments.map((doc) => (
                  <TableRow key={doc.id} data-testid={`row-policy-doc-${doc.id}`}>
                    <TableCell className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{doc.fileName}</span>
                    </TableCell>
                    <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-policy-menu-${doc.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => window.open(`/api/documents/download/${doc.id}`, '_blank')}
                            data-testid={`menu-download-policy-${doc.id}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteDocId(doc.id)}
                            data-testid={`menu-delete-policy-${doc.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Policy Document Dialog */}
      <AlertDialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this document? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDocId && deletePolicyDocumentMutation.mutate(deleteDocId)}
              disabled={deletePolicyDocumentMutation.isPending}
            >
              {deletePolicyDocumentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletePayrollRunId !== null} onOpenChange={(open) => !open && setDeletePayrollRunId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payroll Run</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payroll run? This action cannot be undone and will remove all associated payroll items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletePayrollRunMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deletePayrollRunMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
