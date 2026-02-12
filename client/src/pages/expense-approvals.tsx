import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Plus, AlertCircle, Check, X, Upload, FileText, Link2, Unlink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Organization, ExpenseApproval, Category, Vendor, InsertExpenseApproval, Transaction } from "@shared/schema";
import { insertExpenseApprovalSchema } from "@shared/schema";
import { format } from "date-fns";
import { CategoryCombobox } from "@/components/category-combobox";

interface ExpenseApprovalsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function ExpenseApprovals({ currentOrganization, userId }: ExpenseApprovalsProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ExpenseApproval & { requestedByName: string } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedApprovalIds, setSelectedApprovalIds] = useState<Set<number>>(new Set());
  const [bulkReviewNotes, setBulkReviewNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkApprovalId, setLinkApprovalId] = useState<number | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>("");
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const formSchema = insertExpenseApprovalSchema.omit({ organizationId: true, requestedBy: true }).extend({
    amount: z.string().min(1, "Amount is required").refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Amount must be a positive number"
    ),
  });
  
  const form = useForm<InsertExpenseApproval>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: "",
      requestDate: new Date(),
      status: "pending",
      notes: "",
    },
  });

  const { data: approvals, isLoading } = useQuery<Array<ExpenseApproval & { requestedByName: string; categoryName: string | null; vendorName: string | null }>>({
    queryKey: ['/api/expense-approvals', currentOrganization.id],
    enabled: !!currentOrganization.id,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories', currentOrganization.id],
    enabled: !!currentOrganization.id,
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors', currentOrganization.id],
    enabled: !!currentOrganization.id,
  });

  const createApprovalMutation = useMutation({
    mutationFn: async (data: InsertExpenseApproval) => {
      const res = await apiRequest('POST', `/api/expense-approvals/${currentOrganization.id}`, data);
      return await res.json();
    },
    onSuccess: async (result: any) => {
      if (receiptFile && result?.id) {
        uploadReceiptMutation.mutate({ approvalId: result.id, file: receiptFile });
        setReceiptFile(null);
        if (receiptInputRef.current) receiptInputRef.current.value = '';
      }
      queryClient.invalidateQueries({ queryKey: ['/api/expense-approvals', currentOrganization.id] });
      toast({ title: "Expense approval request submitted successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to submit expense approval request", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      return await apiRequest('POST', `/api/expense-approvals/${id}/approve`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-approvals', currentOrganization.id] });
      toast({ title: "Expense approved successfully" });
      setReviewDialogOpen(false);
      setSelectedApproval(null);
      setReviewNotes("");
    },
    onError: () => {
      toast({ title: "Failed to approve expense", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      return await apiRequest('POST', `/api/expense-approvals/${id}/reject`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-approvals', currentOrganization.id] });
      toast({ title: "Expense rejected successfully" });
      setReviewDialogOpen(false);
      setSelectedApproval(null);
      setReviewNotes("");
    },
    onError: () => {
      toast({ title: "Failed to reject expense", variant: "destructive" });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/expense-approvals/bulk-action', {
        approvalIds: Array.from(selectedApprovalIds),
        action: 'approve',
        note: bulkReviewNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-approvals', currentOrganization.id] });
      setSelectedApprovalIds(new Set());
      setBulkReviewNotes("");
      toast({ title: "Bulk approval completed", description: `${selectedApprovalIds.size} expenses approved` });
    },
    onError: (error: any) => {
      toast({ title: "Bulk approval failed", description: error.message, variant: "destructive" });
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/expense-approvals/bulk-action', {
        approvalIds: Array.from(selectedApprovalIds),
        action: 'reject',
        note: bulkReviewNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-approvals', currentOrganization.id] });
      setSelectedApprovalIds(new Set());
      setBulkReviewNotes("");
      toast({ title: "Bulk rejection completed", description: `${selectedApprovalIds.size} expenses rejected` });
    },
    onError: (error: any) => {
      toast({ title: "Bulk rejection failed", description: error.message, variant: "destructive" });
    },
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions', currentOrganization.id],
    enabled: !!currentOrganization.id && linkDialogOpen,
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: async ({ approvalId, file }: { approvalId: number; file: File }) => {
      const formData = new FormData();
      formData.append('receipt', file);
      const csrfToken = document.cookie.split(';').find(c => c.trim().startsWith('csrf_token='))?.split('=')[1];
      const res = await fetch(`/api/expense-approvals/${approvalId}/upload-receipt`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-approvals', currentOrganization.id] });
      toast({ title: "Receipt uploaded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to upload receipt", description: error.message, variant: "destructive" });
    },
  });

  const linkTransactionMutation = useMutation({
    mutationFn: async ({ approvalId, transactionId }: { approvalId: number; transactionId: number | null }) => {
      return await apiRequest('POST', `/api/expense-approvals/${approvalId}/link-transaction`, { transactionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-approvals', currentOrganization.id] });
      setLinkDialogOpen(false);
      setLinkApprovalId(null);
      setSelectedTransactionId("");
      toast({ title: "Transaction link updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to link transaction", variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertExpenseApproval) => {
    createApprovalMutation.mutate(data);
  };

  const handleReview = (approval: ExpenseApproval & { requestedByName: string }) => {
    setSelectedApproval(approval);
    setReviewDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedApproval) {
      approveMutation.mutate({ id: selectedApproval.id, notes: reviewNotes });
    }
  };

  const handleReject = () => {
    if (selectedApproval) {
      rejectMutation.mutate({ id: selectedApproval.id, notes: reviewNotes });
    }
  };

  const toggleSelectAll = () => {
    if (selectedApprovalIds.size === pendingApprovals.length) {
      setSelectedApprovalIds(new Set());
    } else {
      setSelectedApprovalIds(new Set(pendingApprovals.map(a => a.id)));
    }
  };

  const toggleSelectApproval = (id: number) => {
    const newSet = new Set(selectedApprovalIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedApprovalIds(newSet);
  };

  const pendingApprovals = approvals?.filter(a => a.status === 'pending') || [];
  const myRequests = approvals?.filter(a => a.requestedBy === userId) || [];
  const reviewedApprovals = approvals?.filter(a => a.status !== 'pending') || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Approvals</h1>
          <p className="text-muted-foreground">
            Submit expense requests and review pending approvals
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-request">
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit Expense Approval Request</DialogTitle>
              <DialogDescription>
                Request approval for an expense before making the purchase
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., New laptop for development" data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            placeholder="0.00"
                            data-testid="input-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requestDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-request-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category (Optional)</FormLabel>
                        <CategoryCombobox
                          categories={categories || []}
                          value={field.value}
                          onValueChange={(value) => field.onChange(value)}
                          placeholder="Select category"
                          allowNone={true}
                          noneSentinel={null}
                          className="w-full"
                          testId="select-category"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vendorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor (Optional)</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-vendor">
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            {vendors?.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ''}
                          placeholder="Add any additional details..." 
                          data-testid="input-notes" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <label className="text-sm font-medium">Receipt (Optional)</label>
                  <div className="mt-2">
                    <input
                      ref={receiptInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
                      data-testid="input-receipt-file"
                    />
                    {receiptFile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Selected: {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createApprovalMutation.isPending} data-testid="button-submit-request">
                    {createApprovalMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-count">
              {pendingApprovals.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-my-requests-count">
              {myRequests.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-reviewed-count">
              {reviewedApprovals.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending Approval ({pendingApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="my-requests" data-testid="tab-my-requests">
            My Requests ({myRequests.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed" data-testid="tab-reviewed">
            Reviewed ({reviewedApprovals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {selectedApprovalIds.size > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" data-testid="badge-selected-approval-count">
                      {selectedApprovalIds.size} selected
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedApprovalIds(new Set())}
                      data-testid="button-clear-approval-selection"
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Optional notes for all..."
                      value={bulkReviewNotes}
                      onChange={(e) => setBulkReviewNotes(e.target.value)}
                      className="w-48"
                      data-testid="input-bulk-notes"
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => bulkApproveMutation.mutate()}
                      disabled={bulkApproveMutation.isPending}
                      data-testid="button-bulk-approve"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {bulkApproveMutation.isPending ? "Approving..." : "Approve All"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bulkRejectMutation.mutate()}
                      disabled={bulkRejectMutation.isPending}
                      data-testid="button-bulk-reject"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {bulkRejectMutation.isPending ? "Rejecting..." : "Reject All"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <div>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Expense requests awaiting review</CardDescription>
              </div>
              {pendingApprovals.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  data-testid="button-select-all-approvals"
                >
                  {selectedApprovalIds.size === pendingApprovals.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading approvals...</div>
                ) : pendingApprovals.length > 0 ? (
                  pendingApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="p-4 border rounded-md"
                      data-testid={`approval-card-${approval.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedApprovalIds.has(approval.id)}
                          onCheckedChange={() => toggleSelectApproval(approval.id)}
                          data-testid={`checkbox-approval-${approval.id}`}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{approval.description}</h3>
                            {getStatusBadge(approval.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                            <div>
                              <span className="text-muted-foreground">Amount:</span>{" "}
                              <span className="font-semibold">${parseFloat(approval.amount).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Requested By:</span>{" "}
                              <span className="font-semibold">{approval.requestedByName}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Date:</span>{" "}
                              <span>{format(new Date(approval.requestDate), 'MMM d, yyyy')}</span>
                            </div>
                            {approval.categoryName && (
                              <div>
                                <span className="text-muted-foreground">Category:</span>{" "}
                                <span>{approval.categoryName}</span>
                              </div>
                            )}
                          </div>
                          {approval.receiptUrl && (
                            <div className="mt-2">
                              <a
                                href={approval.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                data-testid={`link-receipt-${approval.id}`}
                              >
                                <FileText className="h-3 w-3" />
                                View Receipt
                              </a>
                            </div>
                          )}
                          {approval.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{approval.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReview(approval)}
                            data-testid={`button-review-${approval.id}`}
                          >
                            Review
                          </Button>
                          {!approval.receiptUrl && (
                            <>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                id={`pending-receipt-${approval.id}`}
                                data-testid={`input-upload-receipt-${approval.id}`}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    uploadReceiptMutation.mutate({ approvalId: approval.id, file });
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => document.getElementById(`pending-receipt-${approval.id}`)?.click()}
                                disabled={uploadReceiptMutation.isPending}
                                data-testid={`button-upload-receipt-${approval.id}`}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                Receipt
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No pending approvals</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Requests</CardTitle>
              <CardDescription>Expense requests you've submitted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myRequests.length > 0 ? (
                  myRequests.map((approval) => (
                    <div
                      key={approval.id}
                      className="p-4 border rounded-md"
                      data-testid={`my-request-card-${approval.id}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{approval.description}</h3>
                        {getStatusBadge(approval.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>{" "}
                          <span className="font-semibold">${parseFloat(approval.amount).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>{" "}
                          <span>{format(new Date(approval.requestDate), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {approval.receiptUrl ? (
                          <a
                            href={approval.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            data-testid={`my-link-receipt-${approval.id}`}
                          >
                            <FileText className="h-3 w-3" />
                            View Receipt
                          </a>
                        ) : approval.status === 'pending' ? (
                          <>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              id={`my-receipt-${approval.id}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  uploadReceiptMutation.mutate({ approvalId: approval.id, file });
                                  e.target.value = '';
                                }
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => document.getElementById(`my-receipt-${approval.id}`)?.click()}
                              disabled={uploadReceiptMutation.isPending}
                              data-testid={`button-my-upload-receipt-${approval.id}`}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Add Receipt
                            </Button>
                          </>
                        ) : null}
                        {approval.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLinkApprovalId(approval.id);
                              setSelectedTransactionId(approval.transactionId?.toString() || "");
                              setLinkDialogOpen(true);
                            }}
                            data-testid={`button-link-transaction-${approval.id}`}
                          >
                            {approval.transactionId ? (
                              <>
                                <Link2 className="h-4 w-4 mr-1" />
                                Linked
                              </>
                            ) : (
                              <>
                                <Unlink className="h-4 w-4 mr-1" />
                                Link Transaction
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      {approval.reviewNotes && (
                        <div className="mt-3 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium">Review Notes:</p>
                          <p className="text-sm text-muted-foreground mt-1">{approval.reviewNotes}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">You haven't submitted any requests yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reviewed Approvals</CardTitle>
              <CardDescription>Previously reviewed expense requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviewedApprovals.length > 0 ? (
                  reviewedApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="p-4 border rounded-md"
                      data-testid={`reviewed-card-${approval.id}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{approval.description}</h3>
                        {getStatusBadge(approval.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>{" "}
                          <span className="font-semibold">${parseFloat(approval.amount).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Requested By:</span>{" "}
                          <span>{approval.requestedByName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>{" "}
                          <span>{format(new Date(approval.requestDate), 'MMM d, yyyy')}</span>
                        </div>
                        {approval.reviewedAt && (
                          <div>
                            <span className="text-muted-foreground">Reviewed:</span>{" "}
                            <span>{format(new Date(approval.reviewedAt), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {approval.receiptUrl && (
                          <a
                            href={approval.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            data-testid={`reviewed-link-receipt-${approval.id}`}
                          >
                            <FileText className="h-3 w-3" />
                            View Receipt
                          </a>
                        )}
                        {approval.transactionId && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            Linked to Transaction
                          </Badge>
                        )}
                      </div>
                      {approval.reviewNotes && (
                        <div className="mt-3 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium">Review Notes:</p>
                          <p className="text-sm text-muted-foreground mt-1">{approval.reviewNotes}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No reviewed approvals yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={linkDialogOpen} onOpenChange={(open) => {
        setLinkDialogOpen(open);
        if (!open) {
          setLinkApprovalId(null);
          setSelectedTransactionId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Transaction</DialogTitle>
            <DialogDescription>
              Link this approved expense to an existing transaction for tracking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={selectedTransactionId}
              onValueChange={setSelectedTransactionId}
            >
              <SelectTrigger data-testid="select-link-transaction">
                <SelectValue placeholder="Select a transaction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No transaction</SelectItem>
                {transactions?.filter(t => t.type === 'expense').map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.description} - ${parseFloat(t.amount).toFixed(2)} ({format(new Date(t.date), 'MMM d, yyyy')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (linkApprovalId) {
                    const txId = selectedTransactionId && selectedTransactionId !== "none" ? parseInt(selectedTransactionId) : null;
                    linkTransactionMutation.mutate({ approvalId: linkApprovalId, transactionId: txId });
                  }
                }}
                disabled={linkTransactionMutation.isPending}
                data-testid="button-confirm-link"
              >
                {linkTransactionMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Expense Request</DialogTitle>
            <DialogDescription>
              Approve or reject this expense request
            </DialogDescription>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Description:</span>
                  <p className="text-sm text-muted-foreground">{selectedApproval.description}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Amount:</span>
                  <p className="text-sm text-muted-foreground">${parseFloat(selectedApproval.amount).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Requested By:</span>
                  <p className="text-sm text-muted-foreground">{selectedApproval.requestedByName}</p>
                </div>
                {selectedApproval.receiptUrl && (
                  <div>
                    <span className="text-sm font-medium">Receipt:</span>
                    <a
                      href={selectedApproval.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                      data-testid="review-link-receipt"
                    >
                      <FileText className="h-3 w-3" />
                      View Receipt
                    </a>
                  </div>
                )}
                {selectedApproval.notes && (
                  <div>
                    <span className="text-sm font-medium">Notes:</span>
                    <p className="text-sm text-muted-foreground">{selectedApproval.notes}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  className="mt-2"
                  data-testid="input-review-notes"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReviewDialogOpen(false);
                    setSelectedApproval(null);
                    setReviewNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                  data-testid="button-reject"
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  data-testid="button-approve"
                >
                  {approveMutation.isPending ? "Approving..." : "Approve"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
