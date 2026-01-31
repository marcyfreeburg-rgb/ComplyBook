import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Briefcase, TrendingUp, DollarSign, CheckCircle, Clock, Trash2, Edit, Eye, Plus, AlertTriangle, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Organization, Contract, Proposal, ChangeOrder } from "@shared/schema";
import { EntityDocumentUploader } from "@/components/EntityDocumentUploader";

interface CommercialContractsHubProps {
  currentOrganization: Organization;
  userId: string;
}

type ContractFormData = {
  contractNumber: string;
  contractName: string;
  clientName: string;
  description: string;
  startDate: string;
  endDate: string;
  totalValue: string;
  fundedAmount: string;
  billedAmount: string;
  status: "pending" | "active" | "completed" | "cancelled" | "on_hold";
  contractType: string;
  primeContractor: string;
  contractOfficer: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  proposalId: string;
};

type ProposalFormData = {
  rfpNumber: string;
  title: string;
  clientName: string;
  description: string;
  proposedValue: string;
  estimatedCost: string;
  submissionDeadline: string;
  submittedDate: string;
  status: "draft" | "submitted" | "under_review" | "won" | "lost" | "cancelled";
  winProbability: string;
  lossReason: string;
  notes: string;
};

type ChangeOrderFormData = {
  contractId: string;
  changeOrderNumber: string;
  title: string;
  description: string;
  requestedBy: string;
  changeAmount: string;
  requestDate: string;
  status: "requested" | "under_review" | "approved" | "rejected" | "implemented";
  notes: string;
};

const emptyContractForm: ContractFormData = {
  contractNumber: "",
  contractName: "",
  clientName: "",
  description: "",
  startDate: "",
  endDate: "",
  totalValue: "",
  fundedAmount: "0",
  billedAmount: "0",
  status: "pending",
  contractType: "",
  primeContractor: "",
  contractOfficer: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
  proposalId: "",
};

const emptyProposalForm: ProposalFormData = {
  rfpNumber: "",
  title: "",
  clientName: "",
  description: "",
  proposedValue: "",
  estimatedCost: "",
  submissionDeadline: "",
  submittedDate: "",
  status: "draft",
  winProbability: "",
  lossReason: "",
  notes: "",
};

const emptyChangeOrderForm: ChangeOrderFormData = {
  contractId: "",
  changeOrderNumber: "",
  title: "",
  description: "",
  requestedBy: "",
  changeAmount: "",
  requestDate: new Date().toISOString().split("T")[0],
  status: "requested",
  notes: "",
};

export default function CommercialContractsHub({ currentOrganization, userId }: CommercialContractsHubProps) {
  const [activeTab, setActiveTab] = useState("contracts");
  const { toast } = useToast();

  // Dialog states
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [changeOrderDialogOpen, setChangeOrderDialogOpen] = useState(false);
  const [viewContractDialogOpen, setViewContractDialogOpen] = useState(false);
  const [viewProposalDialogOpen, setViewProposalDialogOpen] = useState(false);
  const [viewChangeOrderDialogOpen, setViewChangeOrderDialogOpen] = useState(false);

  // Editing states
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [editingChangeOrder, setEditingChangeOrder] = useState<ChangeOrder | null>(null);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [viewingProposal, setViewingProposal] = useState<Proposal | null>(null);
  const [viewingChangeOrder, setViewingChangeOrder] = useState<ChangeOrder | null>(null);

  // Form states
  const [contractForm, setContractForm] = useState<ContractFormData>(emptyContractForm);
  const [proposalForm, setProposalForm] = useState<ProposalFormData>(emptyProposalForm);
  const [changeOrderForm, setChangeOrderForm] = useState<ChangeOrderFormData>(emptyChangeOrderForm);

  // Queries
  const { data: contracts = [], isLoading: loadingContracts } = useQuery<Contract[]>({
    queryKey: [`/api/contracts/${currentOrganization.id}`],
  });

  const { data: proposals = [], isLoading: loadingProposals } = useQuery<Proposal[]>({
    queryKey: [`/api/proposals/${currentOrganization.id}`],
  });

  const { data: changeOrders = [], isLoading: loadingChangeOrders } = useQuery<ChangeOrder[]>({
    queryKey: [`/api/change-orders/${currentOrganization.id}`],
  });

  // Contract mutations
  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      return await apiRequest("POST", "/api/contracts", {
        ...data,
        organizationId: currentOrganization.id,
        proposalId: data.proposalId ? parseInt(data.proposalId) : null,
        totalValue: parseFloat(data.totalValue) || 0,
        fundedAmount: parseFloat(data.fundedAmount) || 0,
        billedAmount: parseFloat(data.billedAmount) || 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${currentOrganization.id}`] });
      toast({ title: "Contract created successfully" });
      setContractDialogOpen(false);
      setContractForm(emptyContractForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create contract", variant: "destructive" });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ContractFormData }) => {
      return await apiRequest("PUT", `/api/contracts/${id}`, {
        ...data,
        proposalId: data.proposalId ? parseInt(data.proposalId) : null,
        totalValue: parseFloat(data.totalValue) || 0,
        fundedAmount: parseFloat(data.fundedAmount) || 0,
        billedAmount: parseFloat(data.billedAmount) || 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${currentOrganization.id}`] });
      toast({ title: "Contract updated successfully" });
      setContractDialogOpen(false);
      setEditingContract(null);
      setContractForm(emptyContractForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update contract", variant: "destructive" });
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${currentOrganization.id}`] });
      toast({ title: "Contract deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete contract", variant: "destructive" });
    },
  });

  // Proposal mutations
  const createProposalMutation = useMutation({
    mutationFn: async (data: ProposalFormData) => {
      return await apiRequest("POST", "/api/proposals", {
        ...data,
        organizationId: currentOrganization.id,
        createdBy: userId,
        proposedValue: data.proposedValue ? parseFloat(data.proposedValue) : null,
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : null,
        submissionDeadline: data.submissionDeadline ? new Date(data.submissionDeadline) : null,
        submittedDate: data.submittedDate ? new Date(data.submittedDate) : null,
        winProbability: data.winProbability ? parseInt(data.winProbability) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/proposals/${currentOrganization.id}`] });
      toast({ title: "Proposal created successfully" });
      setProposalDialogOpen(false);
      setProposalForm(emptyProposalForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create proposal", variant: "destructive" });
    },
  });

  const updateProposalMutation = useMutation({
    mutationFn: async ({ id, data, createContract }: { id: number; data: ProposalFormData; createContract?: boolean }) => {
      const result = await apiRequest("PUT", `/api/proposals/${id}`, {
        ...data,
        proposedValue: data.proposedValue ? parseFloat(data.proposedValue) : null,
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : null,
        submissionDeadline: data.submissionDeadline ? new Date(data.submissionDeadline) : null,
        submittedDate: data.submittedDate ? new Date(data.submittedDate) : null,
        winProbability: data.winProbability ? parseInt(data.winProbability) : null,
      });

      // Auto-create contract when proposal is won (use form data, not stale query data)
      if (createContract && data.status === "won") {
        // Generate unique contract number using timestamp to avoid collisions
        const timestamp = Date.now();
        const contractNumber = `CC-${new Date().getFullYear()}-${timestamp.toString(36).toUpperCase()}`;
        await apiRequest("POST", "/api/contracts", {
          organizationId: currentOrganization.id,
          proposalId: id, // Link contract to the source proposal
          contractNumber,
          contractName: data.title, // Use form data
          clientName: data.clientName, // Use form data
          description: data.description || "", // Use form data
          startDate: new Date(),
          endDate: null,
          totalValue: parseFloat(data.proposedValue) || 0,
          fundedAmount: 0,
          billedAmount: 0,
          status: "active",
          contractType: "Commercial",
          notes: `Auto-created from proposal ${data.rfpNumber || id}`,
        });
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/proposals/${currentOrganization.id}`] });
      if (variables.createContract) {
        queryClient.invalidateQueries({ queryKey: [`/api/contracts/${currentOrganization.id}`] });
        toast({ title: "Proposal won!", description: "A new contract has been created automatically." });
      } else {
        toast({ title: "Proposal updated successfully" });
      }
      setProposalDialogOpen(false);
      setEditingProposal(null);
      setProposalForm(emptyProposalForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update proposal", variant: "destructive" });
    },
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/proposals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/proposals/${currentOrganization.id}`] });
      toast({ title: "Proposal deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete proposal", variant: "destructive" });
    },
  });

  // Change Order mutations
  const createChangeOrderMutation = useMutation({
    mutationFn: async (data: ChangeOrderFormData) => {
      return await apiRequest("POST", "/api/change-orders", {
        ...data,
        organizationId: currentOrganization.id,
        createdBy: userId,
        contractId: parseInt(data.contractId),
        changeAmount: parseFloat(data.changeAmount) || 0,
        requestDate: data.requestDate ? new Date(data.requestDate) : new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/change-orders/${currentOrganization.id}`] });
      toast({ title: "Change order created successfully" });
      setChangeOrderDialogOpen(false);
      setChangeOrderForm(emptyChangeOrderForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create change order", variant: "destructive" });
    },
  });

  const updateChangeOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ChangeOrderFormData }) => {
      return await apiRequest("PUT", `/api/change-orders/${id}`, {
        ...data,
        contractId: parseInt(data.contractId),
        changeAmount: parseFloat(data.changeAmount) || 0,
        requestDate: data.requestDate ? new Date(data.requestDate) : new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/change-orders/${currentOrganization.id}`] });
      toast({ title: "Change order updated successfully" });
      setChangeOrderDialogOpen(false);
      setEditingChangeOrder(null);
      setChangeOrderForm(emptyChangeOrderForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update change order", variant: "destructive" });
    },
  });

  const deleteChangeOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/change-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/change-orders/${currentOrganization.id}`] });
      toast({ title: "Change order deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete change order", variant: "destructive" });
    },
  });

  // Helper functions
  const openContractDialog = (contract?: Contract) => {
    if (contract) {
      setEditingContract(contract);
      setContractForm({
        contractNumber: contract.contractNumber,
        contractName: contract.contractName,
        clientName: contract.clientName,
        description: contract.description || "",
        startDate: contract.startDate ? new Date(contract.startDate).toISOString().split("T")[0] : "",
        endDate: contract.endDate ? new Date(contract.endDate).toISOString().split("T")[0] : "",
        totalValue: String(contract.totalValue || "0"),
        fundedAmount: String(contract.fundedAmount || "0"),
        billedAmount: String(contract.billedAmount || "0"),
        status: contract.status,
        contractType: contract.contractType || "",
        primeContractor: contract.primeContractor || "",
        contractOfficer: contract.contractOfficer || "",
        contactEmail: contract.contactEmail || "",
        contactPhone: contract.contactPhone || "",
        notes: contract.notes || "",
        proposalId: contract.proposalId ? String(contract.proposalId) : "",
      });
    } else {
      setEditingContract(null);
      setContractForm(emptyContractForm);
    }
    setContractDialogOpen(true);
  };

  const wonProposals = proposals.filter(p => p.status === "won");

  const openProposalDialog = (proposal?: Proposal) => {
    if (proposal) {
      setEditingProposal(proposal);
      setProposalForm({
        rfpNumber: proposal.rfpNumber || "",
        title: proposal.title,
        clientName: proposal.clientName,
        description: proposal.description || "",
        proposedValue: String(proposal.proposedValue || ""),
        estimatedCost: String(proposal.estimatedCost || ""),
        submissionDeadline: proposal.submissionDeadline ? new Date(proposal.submissionDeadline).toISOString().split("T")[0] : "",
        submittedDate: proposal.submittedDate ? new Date(proposal.submittedDate).toISOString().split("T")[0] : "",
        status: proposal.status,
        winProbability: String(proposal.winProbability || ""),
        lossReason: proposal.lossReason || "",
        notes: proposal.notes || "",
      });
    } else {
      setEditingProposal(null);
      setProposalForm(emptyProposalForm);
    }
    setProposalDialogOpen(true);
  };

  const openChangeOrderDialog = (changeOrder?: ChangeOrder) => {
    if (changeOrder) {
      setEditingChangeOrder(changeOrder);
      setChangeOrderForm({
        contractId: String(changeOrder.contractId),
        changeOrderNumber: changeOrder.changeOrderNumber || "",
        title: changeOrder.title,
        description: changeOrder.description || "",
        requestedBy: changeOrder.requestedBy || "",
        changeAmount: String(changeOrder.changeAmount || "0"),
        requestDate: changeOrder.requestDate ? new Date(changeOrder.requestDate).toISOString().split("T")[0] : "",
        status: changeOrder.status,
        notes: changeOrder.notes || "",
      });
    } else {
      setEditingChangeOrder(null);
      setChangeOrderForm(emptyChangeOrderForm);
    }
    setChangeOrderDialogOpen(true);
  };

  const handleSaveContract = () => {
    if (!contractForm.contractNumber || !contractForm.contractName || !contractForm.clientName) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (editingContract) {
      updateContractMutation.mutate({ id: editingContract.id, data: contractForm });
    } else {
      createContractMutation.mutate(contractForm);
    }
  };

  const handleSaveProposal = () => {
    if (!proposalForm.title || !proposalForm.clientName) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (editingProposal) {
      const wasNotWon = editingProposal.status !== "won";
      const isNowWon = proposalForm.status === "won";
      updateProposalMutation.mutate({ 
        id: editingProposal.id, 
        data: proposalForm,
        createContract: wasNotWon && isNowWon
      });
    } else {
      createProposalMutation.mutate(proposalForm);
    }
  };

  const handleSaveChangeOrder = () => {
    if (!changeOrderForm.contractId || !changeOrderForm.changeOrderNumber || !changeOrderForm.title || !changeOrderForm.description || !changeOrderForm.requestedBy || !changeOrderForm.changeAmount) {
      toast({ title: "Error", description: "Please fill in all required fields (Contract, Change Order Number, Title, Description, Requested By, Change Amount)", variant: "destructive" });
      return;
    }
    if (editingChangeOrder) {
      updateChangeOrderMutation.mutate({ id: editingChangeOrder.id, data: changeOrderForm });
    } else {
      createChangeOrderMutation.mutate(changeOrderForm);
    }
  };

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "completed": return "secondary";
      case "pending": return "outline";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const getProposalStatusColor = (status: string) => {
    switch (status) {
      case "won": return "default";
      case "submitted": case "under_review": return "secondary";
      case "draft": return "outline";
      case "lost": case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const getChangeOrderStatusColor = (status: string) => {
    switch (status) {
      case "approved": case "implemented": return "default";
      case "requested": case "under_review": return "secondary";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  // Date calculations for proposal cards
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneWeekFromNow = new Date(today);
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

  // Due this week: today through day 7 (inclusive)
  const proposalsDueThisWeek = proposals.filter(p => {
    if (!p.submissionDeadline || p.status === "won" || p.status === "lost" || p.status === "cancelled") return false;
    const deadline = new Date(p.submissionDeadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline >= today && deadline <= oneWeekFromNow;
  });

  // Due 7-14 days: day 8 through day 14 (inclusive)
  const proposalsDue7to14Days = proposals.filter(p => {
    if (!p.submissionDeadline || p.status === "won" || p.status === "lost" || p.status === "cancelled") return false;
    const deadline = new Date(p.submissionDeadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline > oneWeekFromNow && deadline <= twoWeeksFromNow;
  });

  const activeContracts = contracts.filter(c => c.status === "active");
  const totalActiveValue = activeContracts.reduce((sum, c) => sum + (parseFloat(String(c.totalValue)) || 0), 0);
  const proposalsInPipeline = proposals.filter(p => ["draft", "submitted", "under_review"].includes(p.status)).length;
  const pendingChangeOrders = changeOrders.filter(co => co.status === "requested" || co.status === "under_review").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Commercial Contracts Hub</h1>
          <p className="text-muted-foreground">Manage commercial contracts, proposals, and change orders</p>
        </div>
      </div>

      {/* Summary Cards */}
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
            <p className="text-xs text-muted-foreground">Active opportunities</p>
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

        <Card data-testid="card-proposals-due-week">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proposals Due This Week</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-proposals-due-week">{proposalsDueThisWeek.length}</div>
            <p className="text-xs text-muted-foreground">Urgent attention needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Proposal Due Date Cards */}
      {(proposalsDueThisWeek.length > 0 || proposalsDue7to14Days.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proposalsDueThisWeek.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800" data-testid="card-proposals-due-this-week-list">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="h-5 w-5" />
                  Due This Week
                </CardTitle>
                <CardDescription>Proposals requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {proposalsDueThisWeek.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-background rounded border">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-sm text-muted-foreground">{p.clientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-orange-600">
                        {p.submissionDeadline ? new Date(p.submissionDeadline).toLocaleDateString() : "No date"}
                      </p>
                      <Badge variant={getProposalStatusColor(p.status)}>{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {proposalsDue7to14Days.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800" data-testid="card-proposals-due-7-14-days-list">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <Calendar className="h-5 w-5" />
                  Due in 7-14 Days
                </CardTitle>
                <CardDescription>Proposals to prepare for submission</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {proposalsDue7to14Days.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-background rounded border">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-sm text-muted-foreground">{p.clientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-yellow-600">
                        {p.submissionDeadline ? new Date(p.submissionDeadline).toLocaleDateString() : "No date"}
                      </p>
                      <Badge variant={getProposalStatusColor(p.status)}>{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

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

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Commercial Contracts</h2>
            <Button onClick={() => openContractDialog()} data-testid="button-create-contract">
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
          </div>

          {loadingContracts ? (
            <Card><CardContent className="py-8 text-center">Loading contracts...</CardContent></Card>
          ) : contracts.length === 0 ? (
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
                        <CardTitle data-testid={`text-contract-title-${contract.id}`}>{contract.contractName}</CardTitle>
                        <CardDescription>
                          {contract.contractNumber} • {contract.clientName}
                        </CardDescription>
                      </div>
                      <Badge variant={getContractStatusColor(contract.status)} data-testid={`badge-contract-status-${contract.id}`}>
                        {contract.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Contract Value</p>
                        <p className="text-lg font-semibold" data-testid={`text-contract-value-${contract.id}`}>
                          ${parseFloat(String(contract.totalValue || 0)).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Billed Amount</p>
                        <p className="text-lg font-semibold">
                          ${parseFloat(String(contract.billedAmount || 0)).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Start Date</p>
                        <p className="text-sm font-medium">{contract.startDate ? new Date(contract.startDate).toLocaleDateString() : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">End Date</p>
                        <p className="text-sm font-medium">{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "Ongoing"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => { setViewingContract(contract); setViewContractDialogOpen(true); }} data-testid={`button-view-contract-${contract.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openContractDialog(contract)} data-testid={`button-edit-contract-${contract.id}`}>
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
                              Are you sure you want to delete "{contract.contractName}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteContractMutation.mutate(contract.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Proposal Pipeline</h2>
            <Button onClick={() => openProposalDialog()} data-testid="button-create-proposal">
              <Plus className="h-4 w-4 mr-2" />
              New Proposal
            </Button>
          </div>

          {loadingProposals ? (
            <Card><CardContent className="py-8 text-center">Loading proposals...</CardContent></Card>
          ) : proposals.length === 0 ? (
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
                          {proposal.rfpNumber || `Proposal #${proposal.id}`} • {proposal.clientName}
                        </CardDescription>
                      </div>
                      <Badge variant={getProposalStatusColor(proposal.status)} data-testid={`badge-proposal-status-${proposal.id}`}>
                        {proposal.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Proposed Value</p>
                        <p className="text-lg font-semibold" data-testid={`text-proposal-value-${proposal.id}`}>
                          ${parseFloat(String(proposal.proposedValue || 0)).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Win Probability</p>
                        <p className="text-lg font-semibold">{proposal.winProbability ? `${proposal.winProbability}%` : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submission Deadline</p>
                        <p className="text-sm font-medium">
                          {proposal.submissionDeadline ? new Date(proposal.submissionDeadline).toLocaleDateString() : "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted Date</p>
                        <p className="text-sm font-medium">
                          {proposal.submittedDate ? new Date(proposal.submittedDate).toLocaleDateString() : "Not submitted"}
                        </p>
                      </div>
                    </div>
                    {proposal.status === "lost" && proposal.lossReason && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-400">
                          <strong>Reason Lost:</strong> {proposal.lossReason}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {proposal.status === "draft" && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Draft - Ready to submit</span>
                        </div>
                      )}
                      {proposal.status === "under_review" && (
                        <div className="flex items-center gap-1 text-sm text-yellow-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>Under client review</span>
                        </div>
                      )}
                      {proposal.status === "won" && (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Won - Contract created</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => { setViewingProposal(proposal); setViewProposalDialogOpen(true); }} data-testid={`button-view-proposal-${proposal.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openProposalDialog(proposal)} data-testid={`button-edit-proposal-${proposal.id}`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
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
                            <AlertDialogAction onClick={() => deleteProposalMutation.mutate(proposal.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

        {/* Change Orders Tab */}
        <TabsContent value="changes" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Change Orders</h2>
            <Button onClick={() => openChangeOrderDialog()} disabled={contracts.length === 0} data-testid="button-create-changeorder">
              <Plus className="h-4 w-4 mr-2" />
              New Change Order
            </Button>
          </div>

          {contracts.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Create a contract first before adding change orders.
              </CardContent>
            </Card>
          )}

          {contracts.length > 0 && loadingChangeOrders ? (
            <Card><CardContent className="py-8 text-center">Loading change orders...</CardContent></Card>
          ) : contracts.length > 0 && changeOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No change orders found. Create your first change order to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {changeOrders.map((changeOrder) => {
                const contract = contracts.find(c => c.id === changeOrder.contractId);
                return (
                  <Card key={changeOrder.id} data-testid={`card-changeorder-${changeOrder.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="space-y-1">
                          <CardTitle data-testid={`text-changeorder-title-${changeOrder.id}`}>{changeOrder.title}</CardTitle>
                          <CardDescription>
                            Contract: {contract?.contractNumber || "Unknown"} • {contract?.clientName || "Unknown"}
                          </CardDescription>
                        </div>
                        <Badge variant={getChangeOrderStatusColor(changeOrder.status)} data-testid={`badge-changeorder-status-${changeOrder.id}`}>
                          {changeOrder.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Change Amount</p>
                          <p className={`text-lg font-semibold ${parseFloat(String(changeOrder.changeAmount)) < 0 ? "text-red-600" : "text-green-600"}`}>
                            {parseFloat(String(changeOrder.changeAmount)) >= 0 ? "+" : ""}${parseFloat(String(changeOrder.changeAmount || 0)).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Request Date</p>
                          <p className="text-sm font-medium">
                            {changeOrder.requestDate ? new Date(changeOrder.requestDate).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Description</p>
                          <p className="text-sm">{changeOrder.description || "No description"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => { setViewingChangeOrder(changeOrder); setViewChangeOrderDialogOpen(true); }} data-testid={`button-view-changeorder-${changeOrder.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openChangeOrderDialog(changeOrder)} data-testid={`button-edit-changeorder-${changeOrder.id}`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-changeorder-${changeOrder.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Change Order</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{changeOrder.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteChangeOrderMutation.mutate(changeOrder.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Contract Dialog */}
      <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? "Edit Contract" : "Create New Contract"}</DialogTitle>
            <DialogDescription>
              {editingContract ? "Update the contract details below." : "Fill in the details to create a new commercial contract."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractNumber">Contract Number *</Label>
                <Input id="contractNumber" value={contractForm.contractNumber} onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })} placeholder="CC-2026-001" data-testid="input-contract-number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractName">Contract Name *</Label>
                <Input id="contractName" value={contractForm.contractName} onChange={(e) => setContractForm({ ...contractForm, contractName: e.target.value })} placeholder="Software License Agreement" data-testid="input-contract-name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input id="clientName" value={contractForm.clientName} onChange={(e) => setContractForm({ ...contractForm, clientName: e.target.value })} placeholder="Acme Corporation" data-testid="input-contract-client" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={contractForm.status} onValueChange={(value: any) => setContractForm({ ...contractForm, status: value })}>
                  <SelectTrigger data-testid="select-contract-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {wonProposals.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="proposalId">Link to Proposal (optional)</Label>
                <Select value={contractForm.proposalId} onValueChange={(value) => setContractForm({ ...contractForm, proposalId: value })}>
                  <SelectTrigger data-testid="select-contract-proposal"><SelectValue placeholder="Select a won proposal..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No linked proposal</SelectItem>
                    {wonProposals.map((proposal) => (
                      <SelectItem key={proposal.id} value={String(proposal.id)}>
                        {proposal.title} ({proposal.clientName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalValue">Total Value ($)</Label>
                <Input id="totalValue" type="number" value={contractForm.totalValue} onChange={(e) => setContractForm({ ...contractForm, totalValue: e.target.value })} placeholder="100000" data-testid="input-contract-value" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} data-testid="input-contract-start" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} data-testid="input-contract-end" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={contractForm.description} onChange={(e) => setContractForm({ ...contractForm, description: e.target.value })} placeholder="Contract description..." data-testid="input-contract-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractType">Contract Type</Label>
                <Input id="contractType" value={contractForm.contractType} onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value })} placeholder="Fixed Price, T&M, etc." data-testid="input-contract-type" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractOfficer">Contract Officer</Label>
                <Input id="contractOfficer" value={contractForm.contractOfficer} onChange={(e) => setContractForm({ ...contractForm, contractOfficer: e.target.value })} placeholder="John Smith" data-testid="input-contract-officer" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} placeholder="Additional notes..." data-testid="input-contract-notes" />
            </div>
            {editingContract && (
              <EntityDocumentUploader
                organizationId={currentOrganization.id}
                entityType="contract"
                entityId={editingContract.id}
                documentType="contract"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveContract} disabled={createContractMutation.isPending || updateContractMutation.isPending} data-testid="button-save-contract">
              {createContractMutation.isPending || updateContractMutation.isPending ? "Saving..." : "Save Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proposal Dialog */}
      <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProposal ? "Edit Proposal" : "Create New Proposal"}</DialogTitle>
            <DialogDescription>
              {editingProposal ? "Update the proposal details below." : "Fill in the details to create a new proposal."}
              {editingProposal && editingProposal.status !== "won" && (
                <span className="block mt-1 text-green-600">Tip: Setting status to "Won" will automatically create a contract.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rfpNumber">RFP/Proposal Number</Label>
                <Input id="rfpNumber" value={proposalForm.rfpNumber} onChange={(e) => setProposalForm({ ...proposalForm, rfpNumber: e.target.value })} placeholder="RFP-2026-001" data-testid="input-proposal-rfp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposalTitle">Title *</Label>
                <Input id="proposalTitle" value={proposalForm.title} onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })} placeholder="Digital Transformation Project" data-testid="input-proposal-title" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proposalClient">Client Name *</Label>
                <Input id="proposalClient" value={proposalForm.clientName} onChange={(e) => setProposalForm({ ...proposalForm, clientName: e.target.value })} placeholder="Metropolitan Bank" data-testid="input-proposal-client" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposalStatus">Status</Label>
                <Select value={proposalForm.status} onValueChange={(value: any) => setProposalForm({ ...proposalForm, status: value })}>
                  <SelectTrigger data-testid="select-proposal-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proposedValue">Proposed Value ($)</Label>
                <Input id="proposedValue" type="number" value={proposalForm.proposedValue} onChange={(e) => setProposalForm({ ...proposalForm, proposedValue: e.target.value })} placeholder="500000" data-testid="input-proposal-value" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedCost">Estimated Cost ($)</Label>
                <Input id="estimatedCost" type="number" value={proposalForm.estimatedCost} onChange={(e) => setProposalForm({ ...proposalForm, estimatedCost: e.target.value })} placeholder="350000" data-testid="input-proposal-cost" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="winProbability">Win Probability (%)</Label>
                <Input id="winProbability" type="number" min="0" max="100" value={proposalForm.winProbability} onChange={(e) => setProposalForm({ ...proposalForm, winProbability: e.target.value })} placeholder="75" data-testid="input-proposal-probability" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="submissionDeadline">Submission Deadline</Label>
                <Input id="submissionDeadline" type="date" value={proposalForm.submissionDeadline} onChange={(e) => setProposalForm({ ...proposalForm, submissionDeadline: e.target.value })} data-testid="input-proposal-deadline" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submittedDate">Submitted Date</Label>
                <Input id="submittedDate" type="date" value={proposalForm.submittedDate} onChange={(e) => setProposalForm({ ...proposalForm, submittedDate: e.target.value })} data-testid="input-proposal-submitted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposalDescription">Description</Label>
              <Textarea id="proposalDescription" value={proposalForm.description} onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })} placeholder="Proposal description..." data-testid="input-proposal-description" />
            </div>
            {proposalForm.status === "lost" && (
              <div className="space-y-2">
                <Label htmlFor="lossReason">Reason Lost</Label>
                <Textarea id="lossReason" value={proposalForm.lossReason} onChange={(e) => setProposalForm({ ...proposalForm, lossReason: e.target.value })} placeholder="Why was this proposal lost?" data-testid="input-proposal-loss-reason" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="proposalNotes">Notes</Label>
              <Textarea id="proposalNotes" value={proposalForm.notes} onChange={(e) => setProposalForm({ ...proposalForm, notes: e.target.value })} placeholder="Additional notes..." data-testid="input-proposal-notes" />
            </div>
            {editingProposal && (
              <EntityDocumentUploader
                organizationId={currentOrganization.id}
                entityType="proposal"
                entityId={editingProposal.id}
                documentType="other"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposalDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProposal} disabled={createProposalMutation.isPending || updateProposalMutation.isPending} data-testid="button-save-proposal">
              {createProposalMutation.isPending || updateProposalMutation.isPending ? "Saving..." : "Save Proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Order Dialog */}
      <Dialog open={changeOrderDialogOpen} onOpenChange={setChangeOrderDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChangeOrder ? "Edit Change Order" : "Create New Change Order"}</DialogTitle>
            <DialogDescription>
              {editingChangeOrder ? "Update the change order details below." : "Fill in the details to create a new change order."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="coContractId">Contract *</Label>
              <Select value={changeOrderForm.contractId} onValueChange={(value) => setChangeOrderForm({ ...changeOrderForm, contractId: value })}>
                <SelectTrigger data-testid="select-changeorder-contract"><SelectValue placeholder="Select a contract" /></SelectTrigger>
                <SelectContent>
                  {contracts.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.contractNumber} - {c.contractName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coNumber">Change Order Number *</Label>
                <Input id="coNumber" value={changeOrderForm.changeOrderNumber} onChange={(e) => setChangeOrderForm({ ...changeOrderForm, changeOrderNumber: e.target.value })} placeholder="CO-001" data-testid="input-changeorder-number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coTitle">Title *</Label>
                <Input id="coTitle" value={changeOrderForm.title} onChange={(e) => setChangeOrderForm({ ...changeOrderForm, title: e.target.value })} placeholder="Additional Scope" data-testid="input-changeorder-title" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coRequestedBy">Requested By *</Label>
                <Input id="coRequestedBy" value={changeOrderForm.requestedBy} onChange={(e) => setChangeOrderForm({ ...changeOrderForm, requestedBy: e.target.value })} placeholder="Client Name" data-testid="input-changeorder-requestedby" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coStatus">Status</Label>
                <Select value={changeOrderForm.status} onValueChange={(value: any) => setChangeOrderForm({ ...changeOrderForm, status: value })}>
                  <SelectTrigger data-testid="select-changeorder-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requested">Requested</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="implemented">Implemented</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="changeAmount">Change Amount ($) *</Label>
                <Input id="changeAmount" type="number" value={changeOrderForm.changeAmount} onChange={(e) => setChangeOrderForm({ ...changeOrderForm, changeAmount: e.target.value })} placeholder="15000" data-testid="input-changeorder-amount" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestDate">Request Date *</Label>
                <Input id="requestDate" type="date" value={changeOrderForm.requestDate} onChange={(e) => setChangeOrderForm({ ...changeOrderForm, requestDate: e.target.value })} data-testid="input-changeorder-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coDescription">Description</Label>
              <Textarea id="coDescription" value={changeOrderForm.description} onChange={(e) => setChangeOrderForm({ ...changeOrderForm, description: e.target.value })} placeholder="Describe the change..." data-testid="input-changeorder-description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coNotes">Notes</Label>
              <Textarea id="coNotes" value={changeOrderForm.notes} onChange={(e) => setChangeOrderForm({ ...changeOrderForm, notes: e.target.value })} placeholder="Additional notes..." data-testid="input-changeorder-notes" />
            </div>
            {editingChangeOrder && (
              <EntityDocumentUploader
                organizationId={currentOrganization.id}
                entityType="change_order"
                entityId={editingChangeOrder.id}
                documentType="other"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeOrderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveChangeOrder} disabled={createChangeOrderMutation.isPending || updateChangeOrderMutation.isPending} data-testid="button-save-changeorder">
              {createChangeOrderMutation.isPending || updateChangeOrderMutation.isPending ? "Saving..." : "Save Change Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog open={viewContractDialogOpen} onOpenChange={setViewContractDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contract Details</DialogTitle>
          </DialogHeader>
          {viewingContract && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Contract Number</Label><p className="font-medium">{viewingContract.contractNumber}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><Badge variant={getContractStatusColor(viewingContract.status)}>{viewingContract.status}</Badge></div>
              </div>
              <div><Label className="text-muted-foreground">Contract Name</Label><p className="font-medium">{viewingContract.contractName}</p></div>
              <div><Label className="text-muted-foreground">Client</Label><p className="font-medium">{viewingContract.clientName}</p></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-muted-foreground">Total Value</Label><p className="font-medium">${parseFloat(String(viewingContract.totalValue || 0)).toLocaleString()}</p></div>
                <div><Label className="text-muted-foreground">Funded</Label><p className="font-medium">${parseFloat(String(viewingContract.fundedAmount || 0)).toLocaleString()}</p></div>
                <div><Label className="text-muted-foreground">Billed</Label><p className="font-medium">${parseFloat(String(viewingContract.billedAmount || 0)).toLocaleString()}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Start Date</Label><p className="font-medium">{viewingContract.startDate ? new Date(viewingContract.startDate).toLocaleDateString() : "N/A"}</p></div>
                <div><Label className="text-muted-foreground">End Date</Label><p className="font-medium">{viewingContract.endDate ? new Date(viewingContract.endDate).toLocaleDateString() : "Ongoing"}</p></div>
              </div>
              {viewingContract.description && (<div><Label className="text-muted-foreground">Description</Label><p>{viewingContract.description}</p></div>)}
              {viewingContract.notes && (<div><Label className="text-muted-foreground">Notes</Label><p>{viewingContract.notes}</p></div>)}
              <EntityDocumentUploader
                organizationId={currentOrganization.id}
                entityType="contract"
                entityId={viewingContract.id}
                documentType="contract"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewContractDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setViewContractDialogOpen(false); if (viewingContract) openContractDialog(viewingContract); }}>Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Proposal Dialog */}
      <Dialog open={viewProposalDialogOpen} onOpenChange={setViewProposalDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proposal Details</DialogTitle>
          </DialogHeader>
          {viewingProposal && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">RFP Number</Label><p className="font-medium">{viewingProposal.rfpNumber || "N/A"}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><Badge variant={getProposalStatusColor(viewingProposal.status)}>{viewingProposal.status.replace("_", " ")}</Badge></div>
              </div>
              <div><Label className="text-muted-foreground">Title</Label><p className="font-medium">{viewingProposal.title}</p></div>
              <div><Label className="text-muted-foreground">Client</Label><p className="font-medium">{viewingProposal.clientName}</p></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-muted-foreground">Proposed Value</Label><p className="font-medium">${parseFloat(String(viewingProposal.proposedValue || 0)).toLocaleString()}</p></div>
                <div><Label className="text-muted-foreground">Estimated Cost</Label><p className="font-medium">${parseFloat(String(viewingProposal.estimatedCost || 0)).toLocaleString()}</p></div>
                <div><Label className="text-muted-foreground">Win Probability</Label><p className="font-medium">{viewingProposal.winProbability ? `${viewingProposal.winProbability}%` : "N/A"}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Submission Deadline</Label><p className="font-medium">{viewingProposal.submissionDeadline ? new Date(viewingProposal.submissionDeadline).toLocaleDateString() : "Not set"}</p></div>
                <div><Label className="text-muted-foreground">Submitted Date</Label><p className="font-medium">{viewingProposal.submittedDate ? new Date(viewingProposal.submittedDate).toLocaleDateString() : "Not submitted"}</p></div>
              </div>
              {viewingProposal.status === "lost" && viewingProposal.lossReason && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                  <Label className="text-red-700 dark:text-red-400">Reason Lost</Label>
                  <p className="text-red-600">{viewingProposal.lossReason}</p>
                </div>
              )}
              {viewingProposal.description && (<div><Label className="text-muted-foreground">Description</Label><p>{viewingProposal.description}</p></div>)}
              {viewingProposal.notes && (<div><Label className="text-muted-foreground">Notes</Label><p>{viewingProposal.notes}</p></div>)}
              <EntityDocumentUploader
                organizationId={currentOrganization.id}
                entityType="proposal"
                entityId={viewingProposal.id}
                documentType="other"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewProposalDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setViewProposalDialogOpen(false); if (viewingProposal) openProposalDialog(viewingProposal); }}>Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Change Order Dialog */}
      <Dialog open={viewChangeOrderDialogOpen} onOpenChange={setViewChangeOrderDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Change Order Details</DialogTitle>
          </DialogHeader>
          {viewingChangeOrder && (
            <div className="grid gap-4 py-4">
              {(() => {
                const contract = contracts.find(c => c.id === viewingChangeOrder.contractId);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-muted-foreground">Contract</Label><p className="font-medium">{contract?.contractNumber || "Unknown"}</p></div>
                      <div><Label className="text-muted-foreground">Status</Label><Badge variant={getChangeOrderStatusColor(viewingChangeOrder.status)}>{viewingChangeOrder.status}</Badge></div>
                    </div>
                    <div><Label className="text-muted-foreground">Title</Label><p className="font-medium">{viewingChangeOrder.title}</p></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-muted-foreground">Change Amount</Label><p className={`font-medium ${parseFloat(String(viewingChangeOrder.changeAmount)) < 0 ? "text-red-600" : "text-green-600"}`}>{parseFloat(String(viewingChangeOrder.changeAmount)) >= 0 ? "+" : ""}${parseFloat(String(viewingChangeOrder.changeAmount || 0)).toLocaleString()}</p></div>
                      <div><Label className="text-muted-foreground">Request Date</Label><p className="font-medium">{viewingChangeOrder.requestDate ? new Date(viewingChangeOrder.requestDate).toLocaleDateString() : "N/A"}</p></div>
                    </div>
                    {viewingChangeOrder.description && (<div><Label className="text-muted-foreground">Description</Label><p>{viewingChangeOrder.description}</p></div>)}
                    {viewingChangeOrder.notes && (<div><Label className="text-muted-foreground">Notes</Label><p>{viewingChangeOrder.notes}</p></div>)}
                    <EntityDocumentUploader
                      organizationId={currentOrganization.id}
                      entityType="change_order"
                      entityId={viewingChangeOrder.id}
                      documentType="other"
                    />
                  </>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewChangeOrderDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setViewChangeOrderDialogOpen(false); if (viewingChangeOrder) openChangeOrderDialog(viewingChangeOrder); }}>Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
