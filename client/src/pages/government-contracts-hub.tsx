import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Users, TrendingUp, AlertTriangle, CheckCircle, Clock, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Organization, Proposal, Subcontractor, ChangeOrder } from "@shared/schema";

interface GovernmentContractsHubProps {
  currentOrganization: Organization;
  userId: string;
}

export default function GovernmentContractsHub({ currentOrganization, userId }: GovernmentContractsHubProps) {
  const [activeTab, setActiveTab] = useState("proposals");
  const { toast } = useToast();

  const { data: proposals = [], isLoading: loadingProposals } = useQuery<Proposal[]>({
    queryKey: ['/api/proposals', currentOrganization.id],
  });

  const { data: subcontractors = [], isLoading: loadingSubcontractors } = useQuery<Subcontractor[]>({
    queryKey: ['/api/subcontractors', currentOrganization.id],
  });

  const { data: changeOrders = [], isLoading: loadingChangeOrders } = useQuery<ChangeOrder[]>({
    queryKey: ['/api/change-orders', currentOrganization.id],
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/proposals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/proposals', currentOrganization.id] });
      toast({ title: "Proposal deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete proposal", variant: "destructive" });
    },
  });

  const deleteSubcontractorMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/subcontractors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subcontractors', currentOrganization.id] });
      toast({ title: "Subcontractor deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete subcontractor", variant: "destructive" });
    },
  });

  const deleteChangeOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/change-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/change-orders', currentOrganization.id] });
      toast({ title: "Change order deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete change order", variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case "won": case "approved": case "compliant": return "default";
      case "submitted": case "under_review": case "expiring_soon": return "secondary";
      case "lost": case "rejected": case "non_compliant": return "destructive";
      default: return "outline";
    }
  };

  const expiringSubcontractors = subcontractors.filter(s => s.complianceStatus === "expiring_soon" || s.complianceStatus === "non_compliant").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Government Contracts Hub</h1>
          <p className="text-muted-foreground">Manage proposals, subcontractors, and change orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proposals.length}</div>
            <p className="text-xs text-muted-foreground">
              Total pipeline value: ${((proposals.reduce((sum, p) => sum + Number(p.proposedValue || 0), 0)) / 1000000).toFixed(1)}M
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subcontractors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subcontractors.length}</div>
            <p className="text-xs text-muted-foreground">
              Total paid: ${subcontractors.reduce((sum, s) => sum + Number(s.totalPaid || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Change Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{changeOrders.length}</div>
            <p className="text-xs text-muted-foreground">Contract modifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{expiringSubcontractors}</div>
            <p className="text-xs text-muted-foreground">Expiring certifications</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="proposals" data-testid="tab-proposals">
            <FileText className="h-4 w-4 mr-2" />
            Proposals & Bids
          </TabsTrigger>
          <TabsTrigger value="subcontractors" data-testid="tab-subcontractors">
            <Users className="h-4 w-4 mr-2" />
            Subcontractors
          </TabsTrigger>
          <TabsTrigger value="changes" data-testid="tab-changeorders">
            <TrendingUp className="h-4 w-4 mr-2" />
            Change Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Bid Pipeline</h2>
            <Button data-testid="button-create-proposal">
              <FileText className="h-4 w-4 mr-2" />
              New Proposal
            </Button>
          </div>

          {loadingProposals ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : proposals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No proposals found. Create your first proposal to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {proposals.map((proposal) => (
                <Card key={proposal.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <CardTitle>{proposal.title}</CardTitle>
                        <CardDescription>
                          {proposal.rfpNumber} • {proposal.clientName}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusColor(proposal.status)}>
                        {proposal.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Proposed Value</p>
                        <p className="text-lg font-semibold">${(Number(proposal.proposedValue || 0) / 1000000).toFixed(2)}M</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Win Probability</p>
                        <p className="text-lg font-semibold">{proposal.winProbability || 0}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Deadline</p>
                        <p className="text-lg font-semibold">{proposal.submissionDeadline ? new Date(proposal.submissionDeadline).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" data-testid={`button-view-proposal-${proposal.id}`}>
                        View Details
                      </Button>
                      <Button variant="outline" size="sm" data-testid={`button-edit-proposal-${proposal.id}`}>
                        Edit Proposal
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-proposal-${proposal.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{proposal.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteProposalMutation.mutate(proposal.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deleteProposalMutation.isPending}
                            >
                              {deleteProposalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subcontractors" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Subcontractor Management</h2>
            <Button data-testid="button-add-subcontractor">
              <Users className="h-4 w-4 mr-2" />
              Add Subcontractor
            </Button>
          </div>

          {loadingSubcontractors ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : subcontractors.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No subcontractors found. Add your first subcontractor to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {subcontractors.map((sub) => (
                <Card key={sub.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle>{sub.companyName}</CardTitle>
                        <CardDescription>Contact: {sub.contactName || 'N/A'}</CardDescription>
                      </div>
                      <Badge variant={getStatusColor(sub.complianceStatus || "compliant")}>
                        {(sub.complianceStatus || "compliant").replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Paid</p>
                        <p className="text-lg font-semibold">${Number(sub.totalPaid || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Insurance Exp.</p>
                        <p className="text-sm font-medium">{sub.insuranceExpiration ? new Date(sub.insuranceExpiration).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Certifications Exp.</p>
                        <p className="text-sm font-medium">{sub.certificationsExpiration ? new Date(sub.certificationsExpiration).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                    {sub.complianceStatus === "expiring_soon" && (
                      <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <p className="text-sm text-destructive">Insurance or certifications expire within 30 days</p>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" data-testid={`button-view-sub-${sub.id}`}>
                        View Details
                      </Button>
                      <Button variant="outline" size="sm" data-testid={`button-payments-${sub.id}`}>
                        Payment History
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-sub-${sub.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Subcontractor</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{sub.companyName}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSubcontractorMutation.mutate(sub.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deleteSubcontractorMutation.isPending}
                            >
                              {deleteSubcontractorMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Change Orders</h2>
            <Button data-testid="button-create-changeorder">
              <TrendingUp className="h-4 w-4 mr-2" />
              Submit Change Order
            </Button>
          </div>

          {loadingChangeOrders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : changeOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No change orders found. Submit your first change order to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {changeOrders.map((co) => (
                <Card key={co.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle>{co.changeOrderNumber}: {co.title}</CardTitle>
                        <CardDescription>Contract ID: {co.contractId}</CardDescription>
                      </div>
                      <Badge variant={getStatusColor(co.status)}>
                        {co.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Change Amount</p>
                        <p className="text-lg font-semibold">
                          {Number(co.changeAmount || 0) === 0 ? "No Cost" : `$${Number(co.changeAmount || 0).toLocaleString()}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Request Date</p>
                        <p className="text-sm font-medium">{co.requestDate ? new Date(co.requestDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <div className="flex items-center gap-2">
                          {co.status === "approved" ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          )}
                          <p className="text-sm font-medium capitalize">{co.status.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" data-testid={`button-view-co-${co.id}`}>
                        View Details
                      </Button>
                      {co.status === "under_review" && (
                        <Button variant="outline" size="sm" data-testid={`button-approve-co-${co.id}`}>
                          Approve
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-co-${co.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Change Order</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{co.changeOrderNumber}: {co.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteChangeOrderMutation.mutate(co.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deleteChangeOrderMutation.isPending}
                            >
                              {deleteChangeOrderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
