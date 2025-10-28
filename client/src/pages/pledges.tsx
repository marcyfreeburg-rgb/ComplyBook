import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock, CheckCircle2, AlertCircle, DollarSign, Calendar, Edit2, Receipt } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Pledge, Donor, Fund, PledgePayment, Organization } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface PledgesProps {
  currentOrganization: Organization;
  userId: string;
}

interface PledgeWithDonor extends Pledge {
  donorName: string;
}

export default function Pledges({ currentOrganization, userId }: PledgesProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPaymentHistoryDialogOpen, setIsPaymentHistoryDialogOpen] = useState(false);
  const [editingPledge, setEditingPledge] = useState<PledgeWithDonor | null>(null);
  const [recordingPaymentFor, setRecordingPaymentFor] = useState<PledgeWithDonor | null>(null);
  const [viewingPaymentsFor, setViewingPaymentsFor] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    donorId: "",
    fundId: "",
    amount: "",
    pledgeDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    status: "pending" as "pending" | "partial" | "fulfilled" | "cancelled",
    notes: "",
    paymentSchedule: "",
  });

  const [paymentFormData, setPaymentFormData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: "",
    transactionReference: "",
    notes: "",
  });

  const { data: pledges = [], isLoading } = useQuery<PledgeWithDonor[]>({
    queryKey: [`/api/pledges`, currentOrganization.id],
  });

  const { data: donors = [] } = useQuery<Donor[]>({
    queryKey: [`/api/donors/${currentOrganization.id}`],
  });

  const { data: funds = [] } = useQuery<Fund[]>({
    queryKey: [`/api/funds`, currentOrganization.id],
  });

  const { data: pledgePayments = [], isLoading: isLoadingPayments } = useQuery<PledgePayment[]>({
    queryKey: [`/api/pledges/${viewingPaymentsFor}/payments`],
    enabled: !!viewingPaymentsFor && isPaymentHistoryDialogOpen,
  });

  const resetForm = () => {
    setFormData({
      donorId: "",
      fundId: "",
      amount: "",
      pledgeDate: new Date().toISOString().split('T')[0],
      dueDate: "",
      status: "pending",
      notes: "",
      paymentSchedule: "",
    });
  };

  const resetPaymentForm = () => {
    setPaymentFormData({
      amount: "",
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: "",
      transactionReference: "",
      notes: "",
    });
  };

  const createPledgeMutation = useMutation({
    mutationFn: async () => {
      if (!formData.donorId || !formData.amount || !formData.dueDate) {
        throw new Error("Donor, amount, and due date are required");
      }
      return await apiRequest('POST', '/api/pledges', {
        organizationId: currentOrganization.id,
        donorId: parseInt(formData.donorId),
        fundId: formData.fundId && formData.fundId !== "none" ? parseInt(formData.fundId) : null,
        amount: formData.amount,
        pledgeDate: new Date(formData.pledgeDate),
        dueDate: new Date(formData.dueDate),
        status: formData.status,
        amountPaid: "0.00",
        notes: formData.notes,
        paymentSchedule: formData.paymentSchedule,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pledges`, currentOrganization.id] });
      toast({
        title: "Pledge created",
        description: "The pledge has been added successfully.",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create pledge. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePledgeMutation = useMutation({
    mutationFn: async () => {
      if (!editingPledge) return;
      if (!formData.donorId || !formData.amount || !formData.dueDate) {
        throw new Error("Donor, amount, and due date are required");
      }
      return await apiRequest('PATCH', `/api/pledges/${editingPledge.id}`, {
        donorId: parseInt(formData.donorId),
        fundId: formData.fundId && formData.fundId !== "none" ? parseInt(formData.fundId) : null,
        amount: formData.amount,
        pledgeDate: new Date(formData.pledgeDate),
        dueDate: new Date(formData.dueDate),
        status: formData.status,
        notes: formData.notes,
        paymentSchedule: formData.paymentSchedule,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pledges`, currentOrganization.id] });
      toast({
        title: "Pledge updated",
        description: "Pledge information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingPledge(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pledge. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePledgeMutation = useMutation({
    mutationFn: async (pledgeId: number) => {
      return await apiRequest('DELETE', `/api/pledges/${pledgeId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pledges`, currentOrganization.id] });
      toast({
        title: "Pledge deleted",
        description: "The pledge has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete pledge.",
        variant: "destructive",
      });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!recordingPaymentFor || !paymentFormData.amount) {
        throw new Error("Payment amount is required");
      }
      return await apiRequest('POST', `/api/pledges/${recordingPaymentFor.id}/payments`, {
        pledgeId: recordingPaymentFor.id,
        amount: paymentFormData.amount,
        paymentDate: new Date(paymentFormData.paymentDate),
        paymentMethod: paymentFormData.paymentMethod,
        transactionReference: paymentFormData.transactionReference,
        notes: paymentFormData.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pledges`, currentOrganization.id] });
      queryClient.invalidateQueries({ queryKey: [`/api/pledges/${recordingPaymentFor?.id}/payments`] });
      toast({
        title: "Payment recorded",
        description: "The payment has been recorded successfully.",
      });
      setIsPaymentDialogOpen(false);
      setRecordingPaymentFor(null);
      resetPaymentForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (pledge: PledgeWithDonor) => {
    setEditingPledge(pledge);
    setFormData({
      donorId: pledge.donorId.toString(),
      fundId: pledge.fundId?.toString() || "",
      amount: pledge.amount,
      pledgeDate: new Date(pledge.pledgeDate).toISOString().split('T')[0],
      dueDate: new Date(pledge.dueDate).toISOString().split('T')[0],
      status: pledge.status as any,
      notes: pledge.notes || "",
      paymentSchedule: pledge.paymentSchedule || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleRecordPayment = (pledge: PledgeWithDonor) => {
    setRecordingPaymentFor(pledge);
    const remainingAmount = (parseFloat(pledge.amount) - parseFloat(pledge.amountPaid)).toFixed(2);
    setPaymentFormData({
      amount: remainingAmount,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: "",
      transactionReference: "",
      notes: "",
    });
    setIsPaymentDialogOpen(true);
  };

  const handleViewPaymentHistory = (pledgeId: number) => {
    setViewingPaymentsFor(pledgeId);
    setIsPaymentHistoryDialogOpen(true);
  };

  const getStatusColor = (status: string, dueDate: Date) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== 'fulfilled' && status !== 'cancelled';
    
    if (isOverdue) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    }
    
    switch (status) {
      case "fulfilled":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "partial":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "pending":
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const getStatusIcon = (status: string, dueDate: Date) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== 'fulfilled' && status !== 'cancelled';
    
    if (isOverdue) return <AlertCircle className="h-4 w-4" />;
    if (status === "fulfilled") return <CheckCircle2 className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getStatusLabel = (status: string, dueDate: Date) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== 'fulfilled' && status !== 'cancelled';
    if (isOverdue) return "Overdue";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Calculate statistics
  const totalPledged = pledges.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalReceived = pledges.reduce((sum, p) => sum + parseFloat(p.amountPaid), 0);
  const totalOutstanding = totalPledged - totalReceived;
  const overduePledges = pledges.filter(p => 
    new Date(p.dueDate) < new Date() && 
    p.status !== 'fulfilled' && 
    p.status !== 'cancelled'
  ).length;

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-pledges">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-pledges">Pledge Management</h1>
          <p className="text-muted-foreground">
            Track donor commitments and record payments
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-pledge">
              <Plus className="mr-2 h-4 w-4" />
              Create Pledge
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Pledge</DialogTitle>
              <DialogDescription>
                Record a new donor commitment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="donorId">Donor *</Label>
                <Select 
                  value={formData.donorId} 
                  onValueChange={(value) => setFormData({ ...formData, donorId: value })}
                >
                  <SelectTrigger id="donorId" data-testid="select-donor">
                    <SelectValue placeholder="Select donor" />
                  </SelectTrigger>
                  <SelectContent>
                    {donors.map((donor) => (
                      <SelectItem key={donor.id} value={donor.id.toString()}>
                        {donor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fundId">Fund (Optional)</Label>
                <Select 
                  value={formData.fundId} 
                  onValueChange={(value) => setFormData({ ...formData, fundId: value })}
                >
                  <SelectTrigger id="fundId" data-testid="select-fund">
                    <SelectValue placeholder="Select fund (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {funds.map((fund) => (
                      <SelectItem key={fund.id} value={fund.id.toString()}>
                        {fund.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Pledge Amount *</Label>
                <Input
                  id="amount"
                  data-testid="input-pledge-amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="1000.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pledgeDate">Pledge Date *</Label>
                  <Input
                    id="pledgeDate"
                    data-testid="input-pledge-date"
                    type="date"
                    value={formData.pledgeDate}
                    onChange={(e) => setFormData({ ...formData, pledgeDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    data-testid="input-due-date"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="paymentSchedule">Payment Schedule</Label>
                <Input
                  id="paymentSchedule"
                  data-testid="input-payment-schedule"
                  value={formData.paymentSchedule}
                  onChange={(e) => setFormData({ ...formData, paymentSchedule: e.target.value })}
                  placeholder="e.g., Monthly, Quarterly"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  data-testid="input-pledge-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this pledge"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => createPledgeMutation.mutate()}
                  disabled={createPledgeMutation.isPending}
                  data-testid="button-submit-create-pledge"
                >
                  {createPledgeMutation.isPending ? "Creating..." : "Create Pledge"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pledged</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-pledged">
              {formatCurrency(totalPledged, currentOrganization.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-received">
              {formatCurrency(totalReceived, currentOrganization.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-outstanding">
              {formatCurrency(totalOutstanding, currentOrganization.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-overdue-count">
              {overduePledges}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pledges List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading pledges...</p>
        </div>
      ) : pledges.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pledges Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first pledge to start tracking donor commitments.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-pledge">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Pledge
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pledges.map((pledge) => {
            const percentPaid = (parseFloat(pledge.amountPaid) / parseFloat(pledge.amount)) * 100;
            const remainingAmount = parseFloat(pledge.amount) - parseFloat(pledge.amountPaid);
            
            return (
              <Card key={pledge.id} className="hover-elevate" data-testid={`card-pledge-${pledge.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg" data-testid={`text-donor-name-${pledge.id}`}>
                          {pledge.donorName}
                        </CardTitle>
                        <Badge className={getStatusColor(pledge.status, pledge.dueDate)} data-testid={`badge-status-${pledge.id}`}>
                          <span className="mr-1">
                            {getStatusIcon(pledge.status, pledge.dueDate)}
                          </span>
                          {getStatusLabel(pledge.status, pledge.dueDate)}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        Due: {new Date(pledge.dueDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Pledge Amount</p>
                        <p className="text-lg font-bold" data-testid={`text-pledge-amount-${pledge.id}`}>
                          {formatCurrency(parseFloat(pledge.amount), currentOrganization.currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount Paid</p>
                        <p className="text-lg font-bold text-green-600" data-testid={`text-amount-paid-${pledge.id}`}>
                          {formatCurrency(parseFloat(pledge.amountPaid), currentOrganization.currency)}
                        </p>
                      </div>
                    </div>
                    
                    {pledge.status !== 'fulfilled' && pledge.status !== 'cancelled' && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{Math.round(percentPaid)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(percentPaid, 100)}%` }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Remaining: {formatCurrency(remainingAmount, currentOrganization.currency)}
                        </p>
                      </div>
                    )}

                    {pledge.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm" data-testid={`text-pledge-notes-${pledge.id}`}>
                          {pledge.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {pledge.status !== 'fulfilled' && pledge.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          onClick={() => handleRecordPayment(pledge)}
                          data-testid={`button-record-payment-${pledge.id}`}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Record Payment
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPaymentHistory(pledge.id)}
                        data-testid={`button-view-payments-${pledge.id}`}
                      >
                        <Receipt className="h-4 w-4 mr-1" />
                        View Payments
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(pledge)}
                        data-testid={`button-edit-pledge-${pledge.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete this pledge from ${pledge.donorName}?`)) {
                            deletePledgeMutation.mutate(pledge.id);
                          }
                        }}
                        data-testid={`button-delete-pledge-${pledge.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pledge</DialogTitle>
            <DialogDescription>
              Update pledge information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-donorId">Donor *</Label>
              <Select 
                value={formData.donorId} 
                onValueChange={(value) => setFormData({ ...formData, donorId: value })}
              >
                <SelectTrigger id="edit-donorId" data-testid="select-edit-donor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {donors.map((donor) => (
                    <SelectItem key={donor.id} value={donor.id.toString()}>
                      {donor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-fundId">Fund (Optional)</Label>
              <Select 
                value={formData.fundId} 
                onValueChange={(value) => setFormData({ ...formData, fundId: value })}
              >
                <SelectTrigger id="edit-fundId" data-testid="select-edit-fund">
                  <SelectValue placeholder="Select fund (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id.toString()}>
                      {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-amount">Pledge Amount *</Label>
              <Input
                id="edit-amount"
                data-testid="input-edit-pledge-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-pledgeDate">Pledge Date *</Label>
                <Input
                  id="edit-pledgeDate"
                  data-testid="input-edit-pledge-date"
                  type="date"
                  value={formData.pledgeDate}
                  onChange={(e) => setFormData({ ...formData, pledgeDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-dueDate">Due Date *</Label>
                <Input
                  id="edit-dueDate"
                  data-testid="input-edit-due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="edit-status" data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-paymentSchedule">Payment Schedule</Label>
              <Input
                id="edit-paymentSchedule"
                data-testid="input-edit-payment-schedule"
                value={formData.paymentSchedule}
                onChange={(e) => setFormData({ ...formData, paymentSchedule: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                data-testid="input-edit-pledge-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingPledge(null);
                  resetForm();
                }}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => updatePledgeMutation.mutate()}
                disabled={updatePledgeMutation.isPending}
                data-testid="button-submit-edit-pledge"
              >
                {updatePledgeMutation.isPending ? "Updating..." : "Update Pledge"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for this pledge from {recordingPaymentFor?.donorName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-amount">Payment Amount *</Label>
              <Input
                id="payment-amount"
                data-testid="input-payment-amount"
                type="number"
                step="0.01"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="payment-date">Payment Date *</Label>
              <Input
                id="payment-date"
                data-testid="input-payment-date"
                type="date"
                value={paymentFormData.paymentDate}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Input
                id="payment-method"
                data-testid="input-payment-method"
                value={paymentFormData.paymentMethod}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                placeholder="e.g., Check, Cash, Credit Card"
              />
            </div>
            <div>
              <Label htmlFor="transaction-reference">Transaction Reference</Label>
              <Input
                id="transaction-reference"
                data-testid="input-transaction-reference"
                value={paymentFormData.transactionReference}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, transactionReference: e.target.value })}
                placeholder="e.g., Check #123"
              />
            </div>
            <div>
              <Label htmlFor="payment-notes">Notes</Label>
              <Textarea
                id="payment-notes"
                data-testid="input-payment-notes"
                value={paymentFormData.notes}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsPaymentDialogOpen(false);
                  setRecordingPaymentFor(null);
                  resetPaymentForm();
                }}
                data-testid="button-cancel-payment"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => recordPaymentMutation.mutate()}
                disabled={recordPaymentMutation.isPending}
                data-testid="button-submit-payment"
              >
                {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={isPaymentHistoryDialogOpen} onOpenChange={setIsPaymentHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              All payments recorded for this pledge.
            </DialogDescription>
          </DialogHeader>
          {isLoadingPayments ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading payments...</p>
            </div>
          ) : pledgePayments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payments recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pledgePayments.map((payment) => (
                <Card key={payment.id} data-testid={`payment-${payment.id}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-lg" data-testid={`payment-amount-${payment.id}`}>
                          {formatCurrency(parseFloat(payment.amount), currentOrganization.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </p>
                        {payment.paymentMethod && (
                          <p className="text-sm" data-testid={`payment-method-${payment.id}`}>
                            Method: {payment.paymentMethod}
                          </p>
                        )}
                        {payment.transactionReference && (
                          <p className="text-sm" data-testid={`payment-reference-${payment.id}`}>
                            Ref: {payment.transactionReference}
                          </p>
                        )}
                        {payment.notes && (
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`payment-notes-${payment.id}`}>
                            {payment.notes}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Received
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
