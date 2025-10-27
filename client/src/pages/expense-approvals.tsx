import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { CheckCircle, XCircle, Clock, Plus, AlertCircle } from "lucide-react";
import type { Organization, ExpenseApproval, Category, Vendor, InsertExpenseApproval } from "@shared/schema";
import { insertExpenseApprovalSchema } from "@shared/schema";
import { format } from "date-fns";

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

  const form = useForm<InsertExpenseApproval>({
    resolver: zodResolver(insertExpenseApprovalSchema.omit({ organizationId: true, requestedBy: true })),
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
      return await apiRequest('POST', `/api/expense-approvals/${currentOrganization.id}`, data);
    },
    onSuccess: () => {
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
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            {categories?.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Expense requests awaiting review</CardDescription>
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
                      <div className="flex items-start justify-between">
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
                          {approval.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{approval.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(approval)}
                          data-testid={`button-review-${approval.id}`}
                        >
                          Review
                        </Button>
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
