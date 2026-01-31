import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Users, TrendingUp, AlertTriangle, CheckCircle, Clock, Trash2, Loader2, Plus, Edit, Briefcase, FolderKanban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Organization, Proposal, Subcontractor, ChangeOrder, Contract, Project } from "@shared/schema";
import { EntityDocumentUploader } from "@/components/EntityDocumentUploader";

interface GovernmentContractsHubProps {
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
  isGovernmentContract: boolean;
  primeContractor: string;
  contractOfficer: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  proposalId: string;
};

type ProjectFormData = {
  projectNumber: string;
  projectName: string;
  contractId: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: string;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
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
  isGovernmentContract: true,
  primeContractor: "",
  contractOfficer: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
  proposalId: "",
};

const emptyProjectForm: ProjectFormData = {
  projectNumber: "",
  projectName: "",
  contractId: "",
  description: "",
  startDate: "",
  endDate: "",
  budget: "",
  status: "planning",
  notes: "",
};

export default function GovernmentContractsHub({ currentOrganization, userId }: GovernmentContractsHubProps) {
  const [activeTab, setActiveTab] = useState("contracts");
  const { toast } = useToast();
  
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [contractForm, setContractForm] = useState<ContractFormData>(emptyContractForm);
  const [projectForm, setProjectForm] = useState<ProjectFormData>(emptyProjectForm);

  // Queries
  const { data: contracts = [], isLoading: loadingContracts } = useQuery<Contract[]>({
    queryKey: [`/api/contracts/${currentOrganization.id}`],
  });

  const { data: proposals = [], isLoading: loadingProposals } = useQuery<Proposal[]>({
    queryKey: ['/api/proposals', currentOrganization.id],
  });

  const { data: subcontractors = [], isLoading: loadingSubcontractors } = useQuery<Subcontractor[]>({
    queryKey: ['/api/subcontractors', currentOrganization.id],
  });

  const { data: changeOrders = [], isLoading: loadingChangeOrders } = useQuery<ChangeOrder[]>({
    queryKey: ['/api/change-orders', currentOrganization.id],
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: [`/api/projects/${currentOrganization.id}`],
  });

  // Filter to show only government contracts
  const governmentContracts = contracts.filter(c => c.isGovernmentContract === true);

  // Contract mutations
  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      return await apiRequest("POST", "/api/contracts", {
        ...data,
        organizationId: currentOrganization.id,
        createdBy: userId,
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
      toast({ title: "Government contract created successfully" });
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
      await apiRequest("DELETE", `/api/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${currentOrganization.id}`] });
      toast({ title: "Contract deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete contract", variant: "destructive" });
    },
  });

  // Project mutations
  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      return await apiRequest("POST", "/api/projects", {
        ...data,
        organizationId: currentOrganization.id,
        createdBy: userId,
        contractId: data.contractId ? parseInt(data.contractId) : null,
        budget: parseFloat(data.budget) || 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${currentOrganization.id}`] });
      toast({ title: "Project created successfully" });
      setProjectDialogOpen(false);
      setProjectForm(emptyProjectForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create project", variant: "destructive" });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProjectFormData }) => {
      return await apiRequest("PUT", `/api/projects/${id}`, {
        ...data,
        contractId: data.contractId ? parseInt(data.contractId) : null,
        budget: parseFloat(data.budget) || 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${currentOrganization.id}`] });
      toast({ title: "Project updated successfully" });
      setProjectDialogOpen(false);
      setEditingProject(null);
      setProjectForm(emptyProjectForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update project", variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${currentOrganization.id}`] });
      toast({ title: "Project deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete project", variant: "destructive" });
    },
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
        isGovernmentContract: contract.isGovernmentContract ?? true,
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

  const openProjectDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        projectNumber: project.projectNumber || "",
        projectName: project.projectName,
        contractId: project.contractId ? String(project.contractId) : "",
        description: project.description || "",
        startDate: project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
        endDate: project.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "",
        budget: String(project.budget || "0"),
        status: project.status as any || "planning",
        notes: project.notes || "",
      });
    } else {
      setEditingProject(null);
      setProjectForm(emptyProjectForm);
    }
    setProjectDialogOpen(true);
  };

  const openProjectDialogForContract = (contractId: number) => {
    setEditingProject(null);
    setProjectForm({
      ...emptyProjectForm,
      contractId: String(contractId),
    });
    setProjectDialogOpen(true);
  };

  const handleSaveContract = () => {
    if (!contractForm.contractNumber || !contractForm.contractName || !contractForm.clientName || !contractForm.totalValue) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (editingContract) {
      updateContractMutation.mutate({ id: editingContract.id, data: contractForm });
    } else {
      createContractMutation.mutate(contractForm);
    }
  };

  const handleSaveProject = () => {
    if (!projectForm.projectName || !projectForm.contractId) {
      toast({ title: "Error", description: "Please fill in all required fields (Project Name and Contract)", variant: "destructive" });
      return;
    }
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data: projectForm });
    } else {
      createProjectMutation.mutate(projectForm);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "won": case "approved": case "compliant": case "active": case "completed": return "default";
      case "submitted": case "under_review": case "expiring_soon": case "pending": case "planning": return "secondary";
      case "lost": case "rejected": case "non_compliant": case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const wonProposals = proposals.filter(p => p.status === "won");
  const expiringSubcontractors = subcontractors.filter(s => s.complianceStatus === "expiring_soon" || s.complianceStatus === "non_compliant").length;
  const activeContracts = governmentContracts.filter(c => c.status === "active");
  const totalContractValue = governmentContracts.reduce((sum, c) => sum + (parseFloat(String(c.totalValue)) || 0), 0);

  // Filter change orders to only show those for government contracts
  const governmentChangeOrders = changeOrders.filter(co => {
    const contract = governmentContracts.find(c => c.id === co.contractId);
    return contract !== undefined;
  });

  // Filter projects to only show those for government contracts
  const governmentProjects = projects.filter(p => {
    const contract = governmentContracts.find(c => c.id === p.contractId);
    return contract !== undefined;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Government Contracts Hub</h1>
          <p className="text-muted-foreground">Manage government contracts, proposals, projects, subcontractors, and change orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gov Contracts</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts.length}</div>
            <p className="text-xs text-muted-foreground">
              Total value: ${(totalContractValue / 1000000).toFixed(1)}M
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proposals.length}</div>
            <p className="text-xs text-muted-foreground">
              Pipeline: ${((proposals.reduce((sum, p) => sum + Number(p.proposedValue || 0), 0)) / 1000000).toFixed(1)}M
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{governmentProjects.length}</div>
            <p className="text-xs text-muted-foreground">Active projects</p>
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
          <TabsTrigger value="contracts" data-testid="tab-gov-contracts">
            <Briefcase className="h-4 w-4 mr-2" />
            Contracts
          </TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-gov-projects">
            <FolderKanban className="h-4 w-4 mr-2" />
            Projects
          </TabsTrigger>
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

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Government Contracts</h2>
          </div>

          {loadingContracts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : governmentContracts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No government contracts found. To create a government contract, go to Commercial Contracts and check the "Government Contract" checkbox when creating a new contract.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {governmentContracts.map((contract) => (
                <Card key={contract.id} data-testid={`card-gov-contract-${contract.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <CardTitle data-testid={`text-gov-contract-title-${contract.id}`}>{contract.contractName}</CardTitle>
                        <CardDescription>
                          {contract.contractNumber} • {contract.clientName}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusColor(contract.status)} data-testid={`badge-gov-contract-status-${contract.id}`}>
                        {contract.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="text-lg font-semibold">${parseFloat(String(contract.totalValue || 0)).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Funded</p>
                        <p className="text-lg font-semibold">${parseFloat(String(contract.fundedAmount || 0)).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Billed</p>
                        <p className="text-lg font-semibold">${parseFloat(String(contract.billedAmount || 0)).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">End Date</p>
                        <p className="text-lg font-semibold">{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "Ongoing"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="default" size="sm" onClick={() => openProjectDialogForContract(contract.id)} data-testid={`button-new-project-${contract.id}`}>
                        <Plus className="h-4 w-4 mr-1" />
                        New Project
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openContractDialog(contract)} data-testid={`button-edit-gov-contract-${contract.id}`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-gov-contract-${contract.id}`}>
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
                            <AlertDialogAction
                              onClick={() => deleteContractMutation.mutate(contract.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deleteContractMutation.isPending}
                            >
                              {deleteContractMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
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

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Projects</h2>
            <Button onClick={() => openProjectDialog()} disabled={governmentContracts.length === 0} data-testid="button-create-project">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>

          {governmentContracts.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Create a government contract first before adding projects.
              </CardContent>
            </Card>
          )}

          {governmentContracts.length > 0 && loadingProjects ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : governmentContracts.length > 0 && governmentProjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No projects found. Create your first project to get started.
              </CardContent>
            </Card>
          ) : governmentContracts.length > 0 ? (
            <div className="grid gap-4">
              {governmentProjects.map((project) => {
                const contract = governmentContracts.find(c => c.id === project.contractId);
                return (
                  <Card key={project.id} data-testid={`card-project-${project.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="space-y-1">
                          <CardTitle data-testid={`text-project-title-${project.id}`}>{project.projectName}</CardTitle>
                          <CardDescription>
                            {project.projectNumber} • Contract: {contract?.contractName || "Unknown"}
                          </CardDescription>
                        </div>
                        <Badge variant={getStatusColor(project.status || "planning")} data-testid={`badge-project-status-${project.id}`}>
                          {project.status || "planning"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Budget</p>
                          <p className="text-lg font-semibold">${parseFloat(String(project.budget || 0)).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Start Date</p>
                          <p className="text-lg font-semibold">{project.startDate ? new Date(project.startDate).toLocaleDateString() : "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">End Date</p>
                          <p className="text-lg font-semibold">{project.endDate ? new Date(project.endDate).toLocaleDateString() : "Ongoing"}</p>
                        </div>
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => openProjectDialog(project)} data-testid={`button-edit-project-${project.id}`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-project-${project.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Project</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{project.projectName}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteProjectMutation.mutate(project.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deleteProjectMutation.isPending}
                              >
                                {deleteProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
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
          ) : null}
        </TabsContent>

        {/* Proposals Tab */}
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

        {/* Subcontractors Tab */}
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

        {/* Change Orders Tab */}
        <TabsContent value="changes" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Change Orders</h2>
            <Button disabled={governmentContracts.length === 0} data-testid="button-create-changeorder">
              <TrendingUp className="h-4 w-4 mr-2" />
              Submit Change Order
            </Button>
          </div>

          {governmentContracts.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Create a government contract first before adding change orders.
              </CardContent>
            </Card>
          )}

          {governmentContracts.length > 0 && loadingChangeOrders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : governmentContracts.length > 0 && governmentChangeOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No change orders found. Submit your first change order to get started.
              </CardContent>
            </Card>
          ) : governmentContracts.length > 0 ? (
            <div className="grid gap-4">
              {governmentChangeOrders.map((co) => {
                const contract = governmentContracts.find(c => c.id === co.contractId);
                return (
                  <Card key={co.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <CardTitle>{co.changeOrderNumber}: {co.title}</CardTitle>
                          <CardDescription>Contract: {contract?.contractName || "Unknown"}</CardDescription>
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
                );
              })}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      {/* Contract Dialog */}
      <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? "Edit Government Contract" : "Create New Government Contract"}</DialogTitle>
            <DialogDescription>
              {editingContract ? "Update the contract details below." : "Fill in the details to create a new government contract."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractNumber">Contract Number *</Label>
                <Input id="contractNumber" value={contractForm.contractNumber} onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })} placeholder="GC-2024-001" data-testid="input-gov-contract-number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractName">Contract Name *</Label>
                <Input id="contractName" value={contractForm.contractName} onChange={(e) => setContractForm({ ...contractForm, contractName: e.target.value })} placeholder="IT Services Contract" data-testid="input-gov-contract-name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Agency/Client *</Label>
                <Input id="clientName" value={contractForm.clientName} onChange={(e) => setContractForm({ ...contractForm, clientName: e.target.value })} placeholder="Department of Defense" data-testid="input-gov-contract-client" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposalId">Linked Proposal</Label>
                <Select value={contractForm.proposalId || "none"} onValueChange={(value) => setContractForm({ ...contractForm, proposalId: value === "none" ? "" : value })}>
                  <SelectTrigger data-testid="select-gov-contract-proposal"><SelectValue placeholder="Select a proposal" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {wonProposals.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.rfpNumber} - {p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={contractForm.description} onChange={(e) => setContractForm({ ...contractForm, description: e.target.value })} placeholder="Contract description..." data-testid="input-gov-contract-description" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalValue">Total Value *</Label>
                <Input id="totalValue" type="number" value={contractForm.totalValue} onChange={(e) => setContractForm({ ...contractForm, totalValue: e.target.value })} placeholder="1000000" data-testid="input-gov-contract-value" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fundedAmount">Funded Amount</Label>
                <Input id="fundedAmount" type="number" value={contractForm.fundedAmount} onChange={(e) => setContractForm({ ...contractForm, fundedAmount: e.target.value })} placeholder="500000" data-testid="input-gov-contract-funded" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billedAmount">Billed Amount</Label>
                <Input id="billedAmount" type="number" value={contractForm.billedAmount} onChange={(e) => setContractForm({ ...contractForm, billedAmount: e.target.value })} placeholder="250000" data-testid="input-gov-contract-billed" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} data-testid="input-gov-contract-start" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} data-testid="input-gov-contract-end" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={contractForm.status} onValueChange={(value: any) => setContractForm({ ...contractForm, status: value })}>
                  <SelectTrigger data-testid="select-gov-contract-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractType">Contract Type</Label>
                <Input id="contractType" value={contractForm.contractType} onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value })} placeholder="FFP, T&M, CPFF, etc." data-testid="input-gov-contract-type" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primeContractor">Prime Contractor</Label>
                <Input id="primeContractor" value={contractForm.primeContractor} onChange={(e) => setContractForm({ ...contractForm, primeContractor: e.target.value })} placeholder="Prime contractor name" data-testid="input-gov-contract-prime" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractOfficer">Contracting Officer</Label>
                <Input id="contractOfficer" value={contractForm.contractOfficer} onChange={(e) => setContractForm({ ...contractForm, contractOfficer: e.target.value })} placeholder="CO Name" data-testid="input-gov-contract-officer" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isGovernmentContract" 
                checked={contractForm.isGovernmentContract} 
                onCheckedChange={(checked) => setContractForm({ ...contractForm, isGovernmentContract: checked === true })} 
                data-testid="checkbox-gov-contract"
              />
              <Label htmlFor="isGovernmentContract" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Government Contract (uncheck to move to Commercial Contracts)
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} placeholder="Additional notes..." data-testid="input-gov-contract-notes" />
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
            <Button onClick={handleSaveContract} disabled={createContractMutation.isPending || updateContractMutation.isPending} data-testid="button-save-gov-contract">
              {createContractMutation.isPending || updateContractMutation.isPending ? "Saving..." : "Save Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
            <DialogDescription>
              {editingProject ? "Update the project details below." : "Fill in the details to create a new project under a government contract."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectContract">Contract *</Label>
              <Select value={projectForm.contractId} onValueChange={(value) => setProjectForm({ ...projectForm, contractId: value })}>
                <SelectTrigger data-testid="select-project-contract"><SelectValue placeholder="Select a contract" /></SelectTrigger>
                <SelectContent>
                  {governmentContracts.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.contractNumber} - {c.contractName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectNumber">Project Number</Label>
                <Input id="projectNumber" value={projectForm.projectNumber} onChange={(e) => setProjectForm({ ...projectForm, projectNumber: e.target.value })} placeholder="PRJ-001" data-testid="input-project-number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input id="projectName" value={projectForm.projectName} onChange={(e) => setProjectForm({ ...projectForm, projectName: e.target.value })} placeholder="Phase 1 Implementation" data-testid="input-project-name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDescription">Description</Label>
              <Textarea id="projectDescription" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="Project description..." data-testid="input-project-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectBudget">Budget</Label>
                <Input id="projectBudget" type="number" value={projectForm.budget} onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })} placeholder="100000" data-testid="input-project-budget" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectStatus">Status</Label>
                <Select value={projectForm.status} onValueChange={(value: any) => setProjectForm({ ...projectForm, status: value })}>
                  <SelectTrigger data-testid="select-project-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectStartDate">Start Date</Label>
                <Input id="projectStartDate" type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} data-testid="input-project-start" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectEndDate">End Date</Label>
                <Input id="projectEndDate" type="date" value={projectForm.endDate} onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })} data-testid="input-project-end" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectNotes">Notes</Label>
              <Textarea id="projectNotes" value={projectForm.notes} onChange={(e) => setProjectForm({ ...projectForm, notes: e.target.value })} placeholder="Additional notes..." data-testid="input-project-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProject} disabled={createProjectMutation.isPending || updateProjectMutation.isPending} data-testid="button-save-project">
              {createProjectMutation.isPending || updateProjectMutation.isPending ? "Saving..." : "Save Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
