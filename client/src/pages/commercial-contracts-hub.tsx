import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Briefcase, TrendingUp, DollarSign, CheckCircle, Clock, Trash2, Edit, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Organization } from "@shared/schema";

interface CommercialContractsHubProps {
  currentOrganization: Organization;
  userId: string;
}

interface CommercialContract {
  id: number;
  contractNumber: string;
  title: string;
  clientName: string;
  status: "active" | "completed" | "on_hold" | "terminated";
  value: number;
  startDate: string;
  endDate: string;
  revenueRecognized: number;
}

interface CommercialProposal {
  id: number;
  proposalNumber: string;
  title: string;
  clientName: string;
  status: "draft" | "submitted" | "negotiating" | "won" | "lost";
  proposedValue: number;
  submissionDate: string | null;
  expectedCloseDate: string;
}

interface CommercialChangeOrder {
  id: number;
  changeOrderNumber: string;
  contractId: number;
  contractNumber: string;
  title: string;
  status: "pending" | "approved" | "rejected" | "implemented";
  changeAmount: number;
  requestDate: string;
  description: string;
}

const mockContracts: CommercialContract[] = [
  {
    id: 1,
    contractNumber: "CC-2026-001",
    title: "Enterprise Software License Agreement",
    clientName: "Acme Corporation",
    status: "active",
    value: 450000,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    revenueRecognized: 112500,
  },
  {
    id: 2,
    contractNumber: "CC-2026-002",
    title: "Cloud Infrastructure Services",
    clientName: "TechStart Inc.",
    status: "active",
    value: 275000,
    startDate: "2026-01-15",
    endDate: "2027-01-14",
    revenueRecognized: 22917,
  },
  {
    id: 3,
    contractNumber: "CC-2025-015",
    title: "Annual Maintenance & Support",
    clientName: "Global Retail Partners",
    status: "active",
    value: 180000,
    startDate: "2025-07-01",
    endDate: "2026-06-30",
    revenueRecognized: 105000,
  },
  {
    id: 4,
    contractNumber: "CC-2025-012",
    title: "Data Analytics Platform",
    clientName: "FinanceFirst LLC",
    status: "completed",
    value: 320000,
    startDate: "2025-03-01",
    endDate: "2025-12-31",
    revenueRecognized: 320000,
  },
];

const mockProposals: CommercialProposal[] = [
  {
    id: 1,
    proposalNumber: "CP-2026-008",
    title: "Digital Transformation Initiative",
    clientName: "Metropolitan Bank",
    status: "negotiating",
    proposedValue: 850000,
    submissionDate: "2026-01-10",
    expectedCloseDate: "2026-02-15",
  },
  {
    id: 2,
    proposalNumber: "CP-2026-009",
    title: "ERP Implementation Services",
    clientName: "Manufacturing Plus",
    status: "submitted",
    proposedValue: 425000,
    submissionDate: "2026-01-20",
    expectedCloseDate: "2026-03-01",
  },
  {
    id: 3,
    proposalNumber: "CP-2026-010",
    title: "Cybersecurity Assessment",
    clientName: "Healthcare Systems Inc.",
    status: "draft",
    proposedValue: 95000,
    submissionDate: null,
    expectedCloseDate: "2026-02-28",
  },
  {
    id: 4,
    proposalNumber: "CP-2026-005",
    title: "Mobile App Development",
    clientName: "RetailMax",
    status: "won",
    proposedValue: 210000,
    submissionDate: "2025-12-15",
    expectedCloseDate: "2026-01-15",
  },
  {
    id: 5,
    proposalNumber: "CP-2026-003",
    title: "Network Infrastructure Upgrade",
    clientName: "City Logistics",
    status: "lost",
    proposedValue: 175000,
    submissionDate: "2025-12-01",
    expectedCloseDate: "2026-01-10",
  },
];

const mockChangeOrders: CommercialChangeOrder[] = [
  {
    id: 1,
    changeOrderNumber: "CO-2026-001",
    contractId: 1,
    contractNumber: "CC-2026-001",
    title: "Additional User Licenses",
    status: "pending",
    changeAmount: 45000,
    requestDate: "2026-01-25",
    description: "Client requests 50 additional user licenses for new department",
  },
  {
    id: 2,
    changeOrderNumber: "CO-2026-002",
    contractId: 2,
    contractNumber: "CC-2026-002",
    title: "Extended Storage Capacity",
    status: "approved",
    changeAmount: 18000,
    requestDate: "2026-01-18",
    description: "Increase cloud storage allocation by 2TB",
  },
  {
    id: 3,
    changeOrderNumber: "CO-2026-003",
    contractId: 3,
    contractNumber: "CC-2025-015",
    title: "Scope Reduction - Q2",
    status: "pending",
    changeAmount: -15000,
    requestDate: "2026-01-22",
    description: "Remove legacy system support from scope",
  },
];

export default function CommercialContractsHub({ currentOrganization, userId }: CommercialContractsHubProps) {
  const [activeTab, setActiveTab] = useState("contracts");
  const [contracts, setContracts] = useState<CommercialContract[]>(mockContracts);
  const [proposals, setProposals] = useState<CommercialProposal[]>(mockProposals);
  const [changeOrders, setChangeOrders] = useState<CommercialChangeOrder[]>(mockChangeOrders);
  const { toast } = useToast();

  const handleDeleteContract = (id: number) => {
    setContracts(contracts.filter(c => c.id !== id));
    toast({ title: "Contract deleted successfully" });
  };

  const handleDeleteProposal = (id: number) => {
    setProposals(proposals.filter(p => p.id !== id));
    toast({ title: "Proposal deleted successfully" });
  };

  const handleDeleteChangeOrder = (id: number) => {
    setChangeOrders(changeOrders.filter(co => co.id !== id));
    toast({ title: "Change order deleted successfully" });
  };

  const getContractStatusColor = (status: CommercialContract["status"]) => {
    switch (status) {
      case "active": return "default";
      case "completed": return "secondary";
      case "on_hold": return "outline";
      case "terminated": return "destructive";
      default: return "outline";
    }
  };

  const getProposalStatusColor = (status: CommercialProposal["status"]) => {
    switch (status) {
      case "won": return "default";
      case "submitted": case "negotiating": return "secondary";
      case "draft": return "outline";
      case "lost": return "destructive";
      default: return "outline";
    }
  };

  const getChangeOrderStatusColor = (status: CommercialChangeOrder["status"]) => {
    switch (status) {
      case "approved": case "implemented": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  const activeContracts = contracts.filter(c => c.status === "active");
  const totalActiveValue = activeContracts.reduce((sum, c) => sum + c.value, 0);
  const proposalsInPipeline = proposals.filter(p => ["draft", "submitted", "negotiating"].includes(p.status)).length;
  const pendingChangeOrders = changeOrders.filter(co => co.status === "pending").length;
  const revenueThisMonth = activeContracts.reduce((sum, c) => sum + (c.revenueRecognized / 12), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Commercial Contracts Hub</h1>
          <p className="text-muted-foreground">Manage commercial contracts, proposals, and change orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-active-contracts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-contracts-count">{activeContracts.length}</div>
            <p className="text-xs text-muted-foreground" data-testid="text-active-contracts-value">
              Total value: ${(totalActiveValue / 1000).toFixed(0)}K
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-proposals-pipeline">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proposals in Pipeline</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-proposals-count">{proposalsInPipeline}</div>
            <p className="text-xs text-muted-foreground">
              Active opportunities
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-changes">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Change Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-changes-count">{pendingChangeOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card data-testid="card-revenue-month">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-revenue-month">${(revenueThisMonth / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">From active contracts</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="contracts" data-testid="tab-contracts">
            <Briefcase className="h-4 w-4 mr-2" />
            Contracts
          </TabsTrigger>
          <TabsTrigger value="proposals" data-testid="tab-proposals">
            <FileText className="h-4 w-4 mr-2" />
            Proposals
          </TabsTrigger>
          <TabsTrigger value="changes" data-testid="tab-changeorders">
            <TrendingUp className="h-4 w-4 mr-2" />
            Change Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Commercial Contracts</h2>
            <Button data-testid="button-create-contract">
              <Briefcase className="h-4 w-4 mr-2" />
              New Contract
            </Button>
          </div>

          {contracts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No contracts found. Create your first commercial contract to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {contracts.map((contract) => (
                <Card key={contract.id} data-testid={`card-contract-${contract.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <CardTitle data-testid={`text-contract-title-${contract.id}`}>{contract.title}</CardTitle>
                        <CardDescription>
                          {contract.contractNumber} • {contract.clientName}
                        </CardDescription>
                      </div>
                      <Badge variant={getContractStatusColor(contract.status)} data-testid={`badge-contract-status-${contract.id}`}>
                        {contract.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Contract Value</p>
                        <p className="text-lg font-semibold" data-testid={`text-contract-value-${contract.id}`}>
                          ${contract.value.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue Recognized</p>
                        <p className="text-lg font-semibold">
                          ${contract.revenueRecognized.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Start Date</p>
                        <p className="text-sm font-medium">{new Date(contract.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">End Date</p>
                        <p className="text-sm font-medium">{new Date(contract.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" data-testid={`button-view-contract-${contract.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm" data-testid={`button-edit-contract-${contract.id}`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-contract-${contract.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Contract</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{contract.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-contract-${contract.id}`}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteContract(contract.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`button-confirm-delete-contract-${contract.id}`}
                            >
                              Delete
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

        <TabsContent value="proposals" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Proposal Pipeline</h2>
            <Button data-testid="button-create-proposal">
              <FileText className="h-4 w-4 mr-2" />
              New Proposal
            </Button>
          </div>

          {proposals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No proposals found. Create your first proposal to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {proposals.map((proposal) => (
                <Card key={proposal.id} data-testid={`card-proposal-${proposal.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <CardTitle data-testid={`text-proposal-title-${proposal.id}`}>{proposal.title}</CardTitle>
                        <CardDescription>
                          {proposal.proposalNumber} • {proposal.clientName}
                        </CardDescription>
                      </div>
                      <Badge variant={getProposalStatusColor(proposal.status)} data-testid={`badge-proposal-status-${proposal.id}`}>
                        {proposal.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Proposed Value</p>
                        <p className="text-lg font-semibold" data-testid={`text-proposal-value-${proposal.id}`}>
                          ${proposal.proposedValue.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submission Date</p>
                        <p className="text-sm font-medium">
                          {proposal.submissionDate ? new Date(proposal.submissionDate).toLocaleDateString() : 'Not submitted'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Close</p>
                        <p className="text-sm font-medium">{new Date(proposal.expectedCloseDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {proposal.status === "draft" && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Draft - Ready to submit</span>
                        </div>
                      )}
                      {proposal.status === "negotiating" && (
                        <div className="flex items-center gap-1 text-sm text-yellow-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>In active negotiations</span>
                        </div>
                      )}
                      {proposal.status === "won" && (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Won - Convert to contract</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" data-testid={`button-view-proposal-${proposal.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm" data-testid={`button-edit-proposal-${proposal.id}`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {proposal.status === "draft" && (
                        <Button variant="outline" size="sm" data-testid={`button-submit-proposal-${proposal.id}`}>
                          Submit Proposal
                        </Button>
                      )}
                      {proposal.status === "won" && (
                        <Button size="sm" data-testid={`button-convert-proposal-${proposal.id}`}>
                          Convert to Contract
                        </Button>
                      )}
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
                            <AlertDialogCancel data-testid={`button-cancel-delete-proposal-${proposal.id}`}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteProposal(proposal.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`button-confirm-delete-proposal-${proposal.id}`}
                            >
                              Delete
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
              New Change Order
            </Button>
          </div>

          {changeOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No change orders found. Create your first change order to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {changeOrders.map((co) => (
                <Card key={co.id} data-testid={`card-changeorder-${co.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <CardTitle data-testid={`text-changeorder-title-${co.id}`}>{co.changeOrderNumber}: {co.title}</CardTitle>
                        <CardDescription>
                          Contract: {co.contractNumber}
                        </CardDescription>
                      </div>
                      <Badge variant={getChangeOrderStatusColor(co.status)} data-testid={`badge-changeorder-status-${co.id}`}>
                        {co.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Change Amount</p>
                        <p className={`text-lg font-semibold ${co.changeAmount < 0 ? 'text-destructive' : ''}`} data-testid={`text-changeorder-amount-${co.id}`}>
                          {co.changeAmount < 0 ? '-' : '+'}${Math.abs(co.changeAmount).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Request Date</p>
                        <p className="text-sm font-medium">{new Date(co.requestDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <div className="flex items-center gap-2">
                          {co.status === "approved" || co.status === "implemented" ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          )}
                          <p className="text-sm font-medium capitalize">{co.status}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{co.description}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" data-testid={`button-view-changeorder-${co.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      {co.status === "pending" && (
                        <>
                          <Button variant="outline" size="sm" data-testid={`button-approve-changeorder-${co.id}`}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`button-reject-changeorder-${co.id}`}>
                            Reject
                          </Button>
                        </>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-changeorder-${co.id}`}>
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
                            <AlertDialogCancel data-testid={`button-cancel-delete-changeorder-${co.id}`}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteChangeOrder(co.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`button-confirm-delete-changeorder-${co.id}`}
                            >
                              Delete
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
