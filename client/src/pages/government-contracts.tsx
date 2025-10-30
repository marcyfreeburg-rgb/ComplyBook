import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock, Edit2, Receipt, PlayCircle, StopCircle, Target, TrendingUp, Calendar, DollarSign, Briefcase, CheckCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Contract, ContractMilestone, Project, TimeEntry, IndirectCostRate, Organization, ProjectCost } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { format } from "date-fns";

interface GovernmentContractsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function GovernmentContracts({ currentOrganization, userId }: GovernmentContractsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("contracts");
  
  // Contract Management States
  const [isCreateContractOpen, setIsCreateContractOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [contractFormData, setContractFormData] = useState({
    contractNumber: "",
    contractName: "",
    clientName: "",
    description: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    totalValue: "",
    fundedAmount: "",
    contractType: "",
    primeContractor: "",
    contractOfficer: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
    status: "pending" as "active" | "completed" | "pending" | "on_hold" | "cancelled",
  });

  // Time Keeping States
  const [isCreateTimeEntryOpen, setIsCreateTimeEntryOpen] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  const [timeEntryFormData, setTimeEntryFormData] = useState({
    projectId: "",
    contractId: "",
    taskDescription: "",
    clockInTime: new Date().toISOString().slice(0, 16),
    clockOutTime: "",
    hourlyRate: "",
    location: "",
    notes: "",
    status: "draft" as "draft" | "submitted" | "approved" | "billed",
  });

  // Project/Job Costing States
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAddCostOpen, setIsAddCostOpen] = useState(false);
  const [isCloneProjectOpen, setIsCloneProjectOpen] = useState(false);
  const [projectToClone, setProjectToClone] = useState<Project | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [projectNumberError, setProjectNumberError] = useState("");
  const [cloneOptions, setCloneOptions] = useState({
    projectNumber: "",
    projectName: "",
    copyCosts: false,
    copyMilestones: false,
  });
  const [projectFormData, setProjectFormData] = useState({
    contractId: "",
    projectNumber: "",
    projectName: "",
    description: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    budget: "",
    projectManager: "",
    projectType: "",
    billingMethod: "",
    laborRate: "",
    overheadRate: "",
    notes: "",
    status: "active",
  });
  const [costFormData, setCostFormData] = useState({
    projectId: "",
    costDate: new Date().toISOString().split('T')[0],
    costType: "direct_labor" as "direct_labor" | "direct_materials" | "direct_other" | "indirect" | "overhead",
    description: "",
    amount: "",
    quantity: "",
    unitCost: "",
    vendorName: "",
    invoiceNumber: "",
    notes: "",
  });

  // Indirect Cost Rates States
  const [isCreateRateOpen, setIsCreateRateOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<IndirectCostRate | null>(null);
  const [rateFormData, setRateFormData] = useState({
    rateName: "",
    rateType: "",
    ratePercentage: "",
    effectiveStartDate: new Date().toISOString().split('T')[0],
    effectiveEndDate: "",
    description: "",
    baseType: "",
    notes: "",
    isActive: 1,
  });

  // Contract Milestones States
  const [isCreateMilestoneOpen, setIsCreateMilestoneOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ContractMilestone | null>(null);
  const [selectedContractForMilestone, setSelectedContractForMilestone] = useState<number | null>(null);
  const [milestoneFormData, setMilestoneFormData] = useState({
    contractId: "",
    milestoneName: "",
    description: "",
    milestoneAmount: "",
    dueDate: new Date().toISOString().split('T')[0],
    status: "pending" as "pending" | "in_progress" | "completed" | "overdue",
    completedDate: "",
    notes: "",
    createdBy: userId,
  });

  // Queries
  const {data: contracts = [], isLoading: loadingContracts } = useQuery<Contract[]>({
    queryKey: [`/api/contracts/${currentOrganization.id}`],
  });

  const {data: timeEntries = [], isLoading: loadingTimeEntries } = useQuery<TimeEntry[]>({
    queryKey: [`/api/time-entries/${currentOrganization.id}`],
  });

  const {data: projects = [], isLoading: loadingProjects } = useQuery<Project[]>({
    queryKey: [`/api/projects/${currentOrganization.id}`],
  });

  const {data: projectCosts = [], isLoading: loadingProjectCosts } = useQuery<ProjectCost[]>({
    queryKey: [`/api/project-costs/${currentOrganization.id}`],
    enabled: activeTab === "projects",
  });

  const {data: indirectRates = [], isLoading: loadingRates } = useQuery<IndirectCostRate[]>({
    queryKey: [`/api/indirect-rates/${currentOrganization.id}`],
  });

  const {data: milestones = [], isLoading: loadingMilestones } = useQuery<ContractMilestone[]>({
    queryKey: [`/api/milestones/${currentOrganization.id}`],
  });

  // Contract Mutations
  const createContractMutation = useMutation({
    mutationFn: async () => {
      if (!contractFormData.contractNumber || !contractFormData.contractName || !contractFormData.totalValue) {
        throw new Error("Contract number, name, and total value are required");
      }
      return await apiRequest('POST', '/api/contracts', {
        organizationId: currentOrganization.id,
        ...contractFormData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${currentOrganization.id}`] });
      toast({ title: "Contract created", description: "Contract added successfully." });
      setIsCreateContractOpen(false);
      resetContractForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create contract.", variant: "destructive" });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: async () => {
      if (!editingContract) throw new Error("No contract selected");
      return await apiRequest('PUT', `/api/contracts/${editingContract.id}`, contractFormData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${currentOrganization.id}`] });
      toast({ title: "Contract updated", description: "Contract updated successfully." });
      setEditingContract(null);
      resetContractForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update contract.", variant: "destructive" });
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/contracts/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${currentOrganization.id}`] });
      toast({ title: "Contract deleted", description: "Contract deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete contract.", variant: "destructive" });
    },
  });

  // Time Entry Mutations
  const createTimeEntryMutation = useMutation({
    mutationFn: async () => {
      if (!timeEntryFormData.taskDescription) {
        throw new Error("Task description is required");
      }
      
      const payload = {
        organizationId: currentOrganization.id,
        userId,
        ...timeEntryFormData,
        projectId: timeEntryFormData.projectId === 'none' || !timeEntryFormData.projectId ? null : parseInt(timeEntryFormData.projectId),
        contractId: timeEntryFormData.contractId === 'none' || !timeEntryFormData.contractId ? null : parseInt(timeEntryFormData.contractId),
      };
      
      return await apiRequest('POST', '/api/time-entries', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/time-entries/${currentOrganization.id}`] });
      toast({ title: "Time entry created", description: "Time entry added successfully." });
      setIsCreateTimeEntryOpen(false);
      resetTimeEntryForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create time entry.", variant: "destructive" });
    },
  });

  const updateTimeEntryMutation = useMutation({
    mutationFn: async () => {
      if (!editingTimeEntry) throw new Error("No time entry selected");
      
      const payload = {
        ...timeEntryFormData,
        projectId: timeEntryFormData.projectId === 'none' || !timeEntryFormData.projectId ? null : parseInt(timeEntryFormData.projectId),
        contractId: timeEntryFormData.contractId === 'none' || !timeEntryFormData.contractId ? null : parseInt(timeEntryFormData.contractId),
      };
      
      return await apiRequest('PUT', `/api/time-entries/${editingTimeEntry.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/time-entries/${currentOrganization.id}`] });
      toast({ title: "Time entry updated", description: "Time entry updated successfully." });
      setEditingTimeEntry(null);
      resetTimeEntryForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update time entry.", variant: "destructive" });
    },
  });

  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/time-entries/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/time-entries/${currentOrganization.id}`] });
      toast({ title: "Time entry deleted", description: "Time entry deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete time entry.", variant: "destructive" });
    },
  });

  // Project Mutations
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!projectFormData.projectNumber || !projectFormData.projectName) {
        throw new Error("Project number and name are required");
      }
      return await apiRequest('POST', '/api/projects', {
        organizationId: currentOrganization.id,
        createdBy: userId,
        ...projectFormData,
        contractId: projectFormData.contractId === 'none' || !projectFormData.contractId ? null : parseInt(projectFormData.contractId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${currentOrganization.id}`] });
      toast({ title: "Project created", description: "Project added successfully." });
      setIsCreateProjectOpen(false);
      resetProjectForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create project.", variant: "destructive" });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      if (!editingProject) throw new Error("No project selected");
      return await apiRequest('PUT', `/api/projects/${editingProject.id}`, {
        ...projectFormData,
        contractId: projectFormData.contractId === 'none' || !projectFormData.contractId ? null : parseInt(projectFormData.contractId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${currentOrganization.id}`] });
      toast({ title: "Project updated", description: "Project updated successfully." });
      setEditingProject(null);
      resetProjectForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update project.", variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/projects/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${currentOrganization.id}`] });
      toast({ title: "Project deleted", description: "Project deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete project.", variant: "destructive" });
    },
  });

  const cloneProjectMutation = useMutation({
    mutationFn: async () => {
      if (!projectToClone) throw new Error("No project selected for cloning");
      return await apiRequest('POST', `/api/projects/${projectToClone.id}/clone`, cloneOptions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${currentOrganization.id}`] });
      toast({ title: "Project cloned", description: "Project cloned successfully." });
      setIsCloneProjectOpen(false);
      setProjectToClone(null);
      setCloneOptions({ projectNumber: "", projectName: "", copyCosts: false, copyMilestones: false });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to clone project.", variant: "destructive" });
    },
  });

  // Project Cost Mutations
  const addProjectCostMutation = useMutation({
    mutationFn: async () => {
      if (!costFormData.projectId || !costFormData.description || !costFormData.amount) {
        throw new Error("Project, description, and amount are required");
      }
      return await apiRequest('POST', '/api/project-costs', {
        organizationId: currentOrganization.id,
        createdBy: userId,
        ...costFormData,
        projectId: parseInt(costFormData.projectId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/project-costs/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${currentOrganization.id}`] });
      toast({ title: "Cost added", description: "Project cost added successfully." });
      setIsAddCostOpen(false);
      resetCostForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add project cost.", variant: "destructive" });
    },
  });

  const deleteProjectCostMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/project-costs/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/project-costs/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${currentOrganization.id}`] });
      toast({ title: "Cost deleted", description: "Project cost deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete project cost.", variant: "destructive" });
    },
  });

  // Indirect Rate Mutations
  const createRateMutation = useMutation({
    mutationFn: async () => {
      if (!rateFormData.rateName || !rateFormData.ratePercentage) {
        throw new Error("Rate name and percentage are required");
      }
      return await apiRequest('POST', '/api/indirect-rates', {
        organizationId: currentOrganization.id,
        createdBy: userId,
        ...rateFormData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/indirect-rates/${currentOrganization.id}`] });
      toast({ title: "Rate created", description: "Indirect cost rate added successfully." });
      setIsCreateRateOpen(false);
      resetRateForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create rate.", variant: "destructive" });
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: async () => {
      if (!editingRate) throw new Error("No rate selected");
      return await apiRequest('PUT', `/api/indirect-rates/${editingRate.id}`, rateFormData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/indirect-rates/${currentOrganization.id}`] });
      toast({ title: "Rate updated", description: "Indirect cost rate updated successfully." });
      setEditingRate(null);
      resetRateForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update rate.", variant: "destructive" });
    },
  });

  const deleteRateMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/indirect-rates/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/indirect-rates/${currentOrganization.id}`] });
      toast({ title: "Rate deleted", description: "Indirect cost rate deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete rate.", variant: "destructive" });
    },
  });

  // Milestone Mutations
  const createMilestoneMutation = useMutation({
    mutationFn: async () => {
      if (!milestoneFormData.contractId || !milestoneFormData.milestoneName) {
        throw new Error("Contract and milestone name are required");
      }
      return await apiRequest('POST', '/api/milestones', {
        organizationId: currentOrganization.id,
        ...milestoneFormData,
        contractId: parseInt(milestoneFormData.contractId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/milestones/${currentOrganization.id}`] });
      toast({ title: "Milestone created", description: "Contract milestone added successfully." });
      setIsCreateMilestoneOpen(false);
      resetMilestoneForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create milestone.", variant: "destructive" });
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async () => {
      if (!editingMilestone) throw new Error("No milestone selected");
      return await apiRequest('PUT', `/api/milestones/${editingMilestone.id}`, {
        ...milestoneFormData,
        contractId: parseInt(milestoneFormData.contractId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/milestones/${currentOrganization.id}`] });
      toast({ title: "Milestone updated", description: "Contract milestone updated successfully." });
      setEditingMilestone(null);
      resetMilestoneForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update milestone.", variant: "destructive" });
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/milestones/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/milestones/${currentOrganization.id}`] });
      toast({ title: "Milestone deleted", description: "Contract milestone deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete milestone.", variant: "destructive" });
    },
  });

  // Helper Functions
  const resetContractForm = () => {
    setContractFormData({
      contractNumber: "",
      contractName: "",
      clientName: "",
      description: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      totalValue: "",
      fundedAmount: "",
      contractType: "",
      primeContractor: "",
      contractOfficer: "",
      contactEmail: "",
      contactPhone: "",
      notes: "",
      status: "pending",
    });
  };

  const resetTimeEntryForm = () => {
    setTimeEntryFormData({
      projectId: "",
      contractId: "",
      taskDescription: "",
      clockInTime: new Date().toISOString().slice(0, 16),
      clockOutTime: "",
      hourlyRate: "",
      location: "",
      notes: "",
      status: "draft",
    });
  };

  const resetProjectForm = () => {
    setProjectFormData({
      contractId: "",
      projectNumber: "",
      projectName: "",
      description: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      budget: "",
      projectManager: "",
      projectType: "",
      billingMethod: "",
      laborRate: "",
      overheadRate: "",
      notes: "",
      status: "active",
    });
    setSelectedTemplate("");
    setProjectNumberError("");
  };

  const resetCostForm = () => {
    setCostFormData({
      projectId: "",
      costDate: new Date().toISOString().split('T')[0],
      costType: "direct_labor",
      description: "",
      amount: "",
      quantity: "",
      unitCost: "",
      vendorName: "",
      invoiceNumber: "",
      notes: "",
    });
  };

  const resetRateForm = () => {
    setRateFormData({
      rateName: "",
      rateType: "",
      ratePercentage: "",
      effectiveStartDate: new Date().toISOString().split('T')[0],
      effectiveEndDate: "",
      description: "",
      baseType: "",
      notes: "",
      isActive: 1,
    });
  };

  const resetMilestoneForm = () => {
    setMilestoneFormData({
      contractId: "",
      milestoneName: "",
      description: "",
      milestoneAmount: "",
      dueDate: new Date().toISOString().split('T')[0],
      status: "pending",
      completedDate: "",
      notes: "",
      createdBy: userId,
    });
  };

  const handleEditContract = (contract: Contract) => {
    setEditingContract(contract);
    setContractFormData({
      contractNumber: contract.contractNumber,
      contractName: contract.contractName,
      clientName: contract.clientName,
      description: contract.description || "",
      startDate: new Date(contract.startDate).toISOString().split('T')[0],
      endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : "",
      totalValue: contract.totalValue,
      fundedAmount: contract.fundedAmount || "",
      contractType: contract.contractType || "",
      primeContractor: contract.primeContractor || "",
      contractOfficer: contract.contractOfficer || "",
      contactEmail: contract.contactEmail || "",
      contactPhone: contract.contactPhone || "",
      notes: contract.notes || "",
      status: contract.status,
    });
    setIsCreateContractOpen(true);
  };

  const handleEditTimeEntry = (entry: TimeEntry) => {
    setEditingTimeEntry(entry);
    setTimeEntryFormData({
      projectId: entry.projectId?.toString() || "",
      contractId: entry.contractId?.toString() || "",
      taskDescription: entry.taskDescription,
      clockInTime: new Date(entry.clockInTime).toISOString().slice(0, 16),
      clockOutTime: entry.clockOutTime ? new Date(entry.clockOutTime).toISOString().slice(0, 16) : "",
      hourlyRate: entry.hourlyRate || "",
      location: entry.location || "",
      notes: entry.notes || "",
      status: entry.status,
    });
    setIsCreateTimeEntryOpen(true);
  };

  const handleClockIn = () => {
    setTimeEntryFormData({
      ...timeEntryFormData,
      clockInTime: new Date().toISOString().slice(0, 16),
    });
    setIsCreateTimeEntryOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectFormData({
      contractId: project.contractId?.toString() || "",
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      description: project.description || "",
      startDate: new Date(project.startDate).toISOString().split('T')[0],
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
      budget: project.budget || "",
      projectManager: project.projectManager || "",
      projectType: project.projectType || "",
      billingMethod: project.billingMethod || "",
      laborRate: project.laborRate || "",
      overheadRate: project.overheadRate || "",
      notes: project.notes || "",
      status: project.status,
    });
    setIsCreateProjectOpen(true);
  };

  const applyProjectTemplate = (templateType: string) => {
    setSelectedTemplate(templateType);
    
    const templates: Record<string, Partial<typeof projectFormData>> = {
      ffp: {
        projectType: "Firm Fixed Price",
        billingMethod: "fixed_fee",
        description: "Fixed price contract with predetermined deliverables and payment schedule",
        laborRate: "",
        overheadRate: "",
      },
      cpff: {
        projectType: "Cost Plus Fixed Fee",
        billingMethod: "cost_plus",
        description: "Cost reimbursement contract with fixed fee component",
        laborRate: "75.00",
        overheadRate: "35.00",
      },
      tm: {
        projectType: "Time & Materials",
        billingMethod: "time_and_materials",
        description: "Hourly billing with materials reimbursement",
        laborRate: "85.00",
        overheadRate: "25.00",
      },
      cpif: {
        projectType: "Cost Plus Incentive Fee",
        billingMethod: "cost_plus",
        description: "Cost reimbursement with performance-based incentive fees",
        laborRate: "75.00",
        overheadRate: "40.00",
      },
    };

    if (templates[templateType]) {
      setProjectFormData(prev => ({
        ...prev,
        ...templates[templateType],
      }));
    }
  };

  const handleContractSelection = (contractId: string) => {
    setProjectFormData(prev => ({ ...prev, contractId }));
    
    if (contractId && contractId !== "none") {
      const contract = contracts.find(c => c.id.toString() === contractId);
      if (contract) {
        const contractStart = new Date(contract.startDate);
        const contractEnd = contract.endDate ? new Date(contract.endDate) : null;
        
        setProjectFormData(prev => ({
          ...prev,
          startDate: contractStart.toISOString().split('T')[0],
          endDate: contractEnd ? contractEnd.toISOString().split('T')[0] : "",
          description: prev.description || `Project under ${contract.contractName}`,
        }));
      }
    }
  };

  // Debounce timer ref for validation
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validateProjectNumber = (projectNumber: string) => {
    if (!projectNumber) {
      setProjectNumberError("");
      return;
    }
    
    // Clear previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    // Set new timeout for debounced validation
    validationTimeoutRef.current = setTimeout(async () => {
      try {
        const response: any = await apiRequest('POST', '/api/projects/validate-number', {
          organizationId: currentOrganization.id,
          projectNumber,
          excludeProjectId: editingProject?.id,
        });
        
        if (response.exists) {
          setProjectNumberError("This project number already exists");
        } else {
          setProjectNumberError("");
        }
      } catch (error) {
        console.error("Error validating project number:", error);
        setProjectNumberError("");
      }
    }, 500); // 500ms debounce
  };

  const handleCloneProject = (project: Project) => {
    setProjectToClone(project);
    setCloneOptions({
      projectNumber: `${project.projectNumber}-COPY`,
      projectName: `${project.projectName} (Copy)`,
      copyCosts: false,
      copyMilestones: false,
    });
    setIsCloneProjectOpen(true);
  };

  const handleEditRate = (rate: IndirectCostRate) => {
    setEditingRate(rate);
    setRateFormData({
      rateName: rate.rateName,
      rateType: rate.rateType,
      ratePercentage: rate.ratePercentage,
      effectiveStartDate: new Date(rate.effectiveStartDate).toISOString().split('T')[0],
      effectiveEndDate: rate.effectiveEndDate ? new Date(rate.effectiveEndDate).toISOString().split('T')[0] : "",
      description: rate.description || "",
      baseType: rate.baseType || "",
      notes: rate.notes || "",
      isActive: rate.isActive,
    });
    setIsCreateRateOpen(true);
  };

  const handleEditMilestone = (milestone: ContractMilestone) => {
    setEditingMilestone(milestone);
    setMilestoneFormData({
      contractId: milestone.contractId.toString(),
      milestoneName: milestone.milestoneName,
      description: milestone.description || "",
      milestoneAmount: milestone.milestoneAmount || "",
      dueDate: new Date(milestone.dueDate).toISOString().split('T')[0],
      status: milestone.status,
      completedDate: milestone.completedDate ? new Date(milestone.completedDate).toISOString().split('T')[0] : "",
      notes: milestone.notes || "",
      createdBy: userId,
    });
    setIsCreateMilestoneOpen(true);
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "on_hold":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getTimeEntryStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case "approved":
        return "default";
      case "submitted":
        return "secondary";
      case "billed":
        return "default";
      default:
        return "outline";
    }
  };

  const calculateHours = (clockIn: string, clockOut: string): number => {
    if (!clockIn || !clockOut) return 0;
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
  };

  const getCostTypeLabel = (costType: string): string => {
    const labels: Record<string, string> = {
      direct_labor: "Direct Labor",
      direct_materials: "Direct Materials",
      direct_other: "Direct Other",
      indirect: "Indirect",
      overhead: "Overhead",
    };
    return labels[costType] || costType;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Government Contracts</h1>
        <p className="text-muted-foreground">
          Manage government contracts, DCAA time tracking, and job costing
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contracts" data-testid="tab-contracts">Contracts</TabsTrigger>
          <TabsTrigger value="timekeeping" data-testid="tab-timekeeping">Time Keeping</TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">Job Costing</TabsTrigger>
          <TabsTrigger value="milestones" data-testid="tab-milestones">Milestones</TabsTrigger>
          <TabsTrigger value="rates" data-testid="tab-rates">Cost Rates</TabsTrigger>
          <TabsTrigger value="invoicing" data-testid="tab-invoicing">E-Invoicing</TabsTrigger>
        </TabsList>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Government Contracts</CardTitle>
                  <CardDescription>Track and manage your government contracts</CardDescription>
                </div>
                <Dialog open={isCreateContractOpen} onOpenChange={(open) => {
                  setIsCreateContractOpen(open);
                  if (!open) {
                    setEditingContract(null);
                    resetContractForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-contract">
                      <Plus className="h-4 w-4 mr-2" />
                      New Contract
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingContract ? "Edit Contract" : "Create New Contract"}</DialogTitle>
                      <DialogDescription>
                        {editingContract ? "Update contract information" : "Add a new government contract"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contractNumber">Contract Number *</Label>
                          <Input
                            id="contractNumber"
                            data-testid="input-contract-number"
                            value={contractFormData.contractNumber}
                            onChange={(e) => setContractFormData({ ...contractFormData, contractNumber: e.target.value })}
                            placeholder="N00178-25-C-1234"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contractName">Contract Name *</Label>
                          <Input
                            id="contractName"
                            data-testid="input-contract-name"
                            value={contractFormData.contractName}
                            onChange={(e) => setContractFormData({ ...contractFormData, contractName: e.target.value })}
                            placeholder="Software Development Services"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clientName">Client/Agency *</Label>
                        <Input
                          id="clientName"
                          data-testid="input-client-name"
                          value={contractFormData.clientName}
                          onChange={(e) => setContractFormData({ ...contractFormData, clientName: e.target.value })}
                          placeholder="Department of Defense"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          data-testid="input-description"
                          value={contractFormData.description}
                          onChange={(e) => setContractFormData({ ...contractFormData, description: e.target.value })}
                          placeholder="Contract description"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="totalValue">Total Value *</Label>
                          <Input
                            id="totalValue"
                            data-testid="input-total-value"
                            type="number"
                            step="0.01"
                            value={contractFormData.totalValue}
                            onChange={(e) => setContractFormData({ ...contractFormData, totalValue: e.target.value })}
                            placeholder="500000.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fundedAmount">Funded Amount</Label>
                          <Input
                            id="fundedAmount"
                            data-testid="input-funded-amount"
                            type="number"
                            step="0.01"
                            value={contractFormData.fundedAmount}
                            onChange={(e) => setContractFormData({ ...contractFormData, fundedAmount: e.target.value })}
                            placeholder="250000.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select value={contractFormData.status} onValueChange={(value) => setContractFormData({ ...contractFormData, status: value as any })}>
                            <SelectTrigger id="status" data-testid="input-status">
                              <SelectValue />
                            </SelectTrigger>
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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate">Start Date</Label>
                          <Input
                            id="startDate"
                            data-testid="input-start-date"
                            type="date"
                            value={contractFormData.startDate}
                            onChange={(e) => setContractFormData({ ...contractFormData, startDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endDate">End Date</Label>
                          <Input
                            id="endDate"
                            data-testid="input-end-date"
                            type="date"
                            value={contractFormData.endDate}
                            onChange={(e) => setContractFormData({ ...contractFormData, endDate: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contractType">Contract Type</Label>
                          <Input
                            id="contractType"
                            data-testid="input-contract-type"
                            value={contractFormData.contractType}
                            onChange={(e) => setContractFormData({ ...contractFormData, contractType: e.target.value })}
                            placeholder="e.g., Firm Fixed Price, Cost Plus"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="primeContractor">Prime Contractor</Label>
                          <Input
                            id="primeContractor"
                            data-testid="input-prime-contractor"
                            value={contractFormData.primeContractor}
                            onChange={(e) => setContractFormData({ ...contractFormData, primeContractor: e.target.value })}
                            placeholder="Prime contractor name (if subcontract)"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contractOfficer">Contract Officer</Label>
                          <Input
                            id="contractOfficer"
                            data-testid="input-contract-officer"
                            value={contractFormData.contractOfficer}
                            onChange={(e) => setContractFormData({ ...contractFormData, contractOfficer: e.target.value })}
                            placeholder="Officer name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactEmail">Contact Email</Label>
                          <Input
                            id="contactEmail"
                            data-testid="input-contact-email"
                            type="email"
                            value={contractFormData.contactEmail}
                            onChange={(e) => setContractFormData({ ...contractFormData, contactEmail: e.target.value })}
                            placeholder="email@agency.gov"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          data-testid="input-notes"
                          value={contractFormData.notes}
                          onChange={(e) => setContractFormData({ ...contractFormData, notes: e.target.value })}
                          placeholder="Additional notes"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreateContractOpen(false);
                          setEditingContract(null);
                          resetContractForm();
                        }}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => editingContract ? updateContractMutation.mutate() : createContractMutation.mutate()}
                        disabled={createContractMutation.isPending || updateContractMutation.isPending}
                        data-testid="button-save-contract"
                      >
                        {(createContractMutation.isPending || updateContractMutation.isPending) ? "Saving..." : (editingContract ? "Update Contract" : "Create Contract")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingContracts ? (
                <div className="text-center py-8 text-muted-foreground">Loading contracts...</div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No contracts yet. Click "New Contract" to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <Card key={contract.id} className="hover-elevate" data-testid={`contract-card-${contract.id}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-lg">{contract.contractName}</h3>
                                  <Badge variant={getStatusBadgeVariant(contract.status)} data-testid={`status-${contract.id}`}>
                                    {contract.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{contract.contractNumber}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Client</p>
                                <p className="font-medium">{contract.clientName}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total Value</p>
                                <p className="font-medium">{formatCurrency(parseFloat(contract.totalValue))}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Funded</p>
                                <p className="font-medium">{formatCurrency(parseFloat(contract.fundedAmount || "0"))}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Billed</p>
                                <p className="font-medium">{formatCurrency(parseFloat(contract.billedAmount || "0"))}</p>
                              </div>
                            </div>

                            {contract.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{contract.description}</p>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditContract(contract)}
                              data-testid={`button-edit-${contract.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this contract?")) {
                                  deleteContractMutation.mutate(contract.id);
                                }
                              }}
                              data-testid={`button-delete-${contract.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* Time Keeping Tab - DCAA Compliant */}
        <TabsContent value="timekeeping">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>DCAA Time Keeping</CardTitle>
                  <CardDescription>DCAA-compliant time tracking for government contracts</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleClockIn} data-testid="button-clock-in">
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Clock In
                  </Button>
                  <Dialog open={isCreateTimeEntryOpen} onOpenChange={(open) => {
                    setIsCreateTimeEntryOpen(open);
                    if (!open) {
                      setEditingTimeEntry(null);
                      resetTimeEntryForm();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-create-time-entry">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Time Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingTimeEntry ? "Edit Time Entry" : "Create Time Entry"}</DialogTitle>
                        <DialogDescription>
                          {editingTimeEntry ? "Update time entry information" : "Log time for a project or contract"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="timeEntryProject">Project</Label>
                            <Select 
                              value={timeEntryFormData.projectId} 
                              onValueChange={(value) => setTimeEntryFormData({ ...timeEntryFormData, projectId: value })}
                            >
                              <SelectTrigger id="timeEntryProject" data-testid="select-project">
                                <SelectValue placeholder="Select project" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Project</SelectItem>
                                {projects.map((p) => (
                                  <SelectItem key={p.id} value={p.id.toString()}>
                                    {p.projectName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="timeEntryContract">Contract</Label>
                            <Select 
                              value={timeEntryFormData.contractId} 
                              onValueChange={(value) => setTimeEntryFormData({ ...timeEntryFormData, contractId: value })}
                            >
                              <SelectTrigger id="timeEntryContract" data-testid="select-contract">
                                <SelectValue placeholder="Select contract" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Contract</SelectItem>
                                {contracts.map((c) => (
                                  <SelectItem key={c.id} value={c.id.toString()}>
                                    {c.contractName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="taskDescription">Task Description *</Label>
                          <Textarea
                            id="taskDescription"
                            data-testid="input-task-description"
                            value={timeEntryFormData.taskDescription}
                            onChange={(e) => setTimeEntryFormData({ ...timeEntryFormData, taskDescription: e.target.value })}
                            placeholder="Describe the work performed"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="clockInTime">Clock In Time *</Label>
                            <Input
                              id="clockInTime"
                              data-testid="input-clock-in-time"
                              type="datetime-local"
                              value={timeEntryFormData.clockInTime}
                              onChange={(e) => setTimeEntryFormData({ ...timeEntryFormData, clockInTime: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="clockOutTime">Clock Out Time</Label>
                            <Input
                              id="clockOutTime"
                              data-testid="input-clock-out-time"
                              type="datetime-local"
                              value={timeEntryFormData.clockOutTime}
                              onChange={(e) => setTimeEntryFormData({ ...timeEntryFormData, clockOutTime: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="hourlyRate">Hourly Rate</Label>
                            <Input
                              id="hourlyRate"
                              data-testid="input-hourly-rate"
                              type="number"
                              step="0.01"
                              value={timeEntryFormData.hourlyRate}
                              onChange={(e) => setTimeEntryFormData({ ...timeEntryFormData, hourlyRate: e.target.value })}
                              placeholder="75.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                              id="location"
                              data-testid="input-location"
                              value={timeEntryFormData.location}
                              onChange={(e) => setTimeEntryFormData({ ...timeEntryFormData, location: e.target.value })}
                              placeholder="Office, Remote, Client Site"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="timeEntryStatus">Status</Label>
                            <Select 
                              value={timeEntryFormData.status} 
                              onValueChange={(value) => setTimeEntryFormData({ ...timeEntryFormData, status: value as any })}
                            >
                              <SelectTrigger id="timeEntryStatus" data-testid="select-time-status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="submitted">Submitted</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="billed">Billed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="timeNotes">Notes</Label>
                          <Textarea
                            id="timeNotes"
                            data-testid="input-time-notes"
                            value={timeEntryFormData.notes}
                            onChange={(e) => setTimeEntryFormData({ ...timeEntryFormData, notes: e.target.value })}
                            placeholder="Additional notes"
                            rows={2}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsCreateTimeEntryOpen(false);
                            setEditingTimeEntry(null);
                            resetTimeEntryForm();
                          }}
                          data-testid="button-cancel-time-entry"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => editingTimeEntry ? updateTimeEntryMutation.mutate() : createTimeEntryMutation.mutate()}
                          disabled={createTimeEntryMutation.isPending || updateTimeEntryMutation.isPending}
                          data-testid="button-save-time-entry"
                        >
                          {(createTimeEntryMutation.isPending || updateTimeEntryMutation.isPending) ? "Saving..." : (editingTimeEntry ? "Update Entry" : "Create Entry")}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTimeEntries ? (
                <div className="text-center py-8 text-muted-foreground">Loading time entries...</div>
              ) : timeEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No time entries yet</p>
                  <p className="text-sm">Click "Clock In" or "Add Time Entry" to start tracking time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timeEntries.map((entry) => {
                    const hours = entry.totalHours ? parseFloat(entry.totalHours) : calculateHours(entry.clockInTime.toString(), entry.clockOutTime?.toString() || "");
                    const laborCost = entry.laborCost ? parseFloat(entry.laborCost) : (hours && entry.hourlyRate ? hours * parseFloat(entry.hourlyRate) : 0);
                    const project = projects.find(p => p.id === entry.projectId);
                    const contract = contracts.find(c => c.id === entry.contractId);
                    
                    return (
                      <Card key={entry.id} className="hover-elevate" data-testid={`time-entry-card-${entry.id}`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{format(new Date(entry.clockInTime), "MMM d, yyyy")}</span>
                                    <Badge variant={getTimeEntryStatusVariant(entry.status)} data-testid={`time-status-${entry.id}`}>
                                      {entry.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">{entry.taskDescription}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-5 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Project</p>
                                  <p className="font-medium" data-testid={`text-time-project-${entry.id}`}>{project?.projectName || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Contract</p>
                                  <p className="font-medium" data-testid={`text-time-contract-${entry.id}`}>{contract?.contractName || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Hours</p>
                                  <p className="font-medium" data-testid={`text-time-hours-${entry.id}`}>{hours.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Rate</p>
                                  <p className="font-medium" data-testid={`text-time-rate-${entry.id}`}>{entry.hourlyRate ? formatCurrency(parseFloat(entry.hourlyRate)) : "—"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Labor Cost</p>
                                  <p className="font-medium" data-testid={`text-time-labor-cost-${entry.id}`}>{laborCost ? formatCurrency(laborCost) : "—"}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditTimeEntry(entry)}
                                data-testid={`button-edit-time-${entry.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this time entry?")) {
                                    deleteTimeEntryMutation.mutate(entry.id);
                                  }
                                }}
                                data-testid={`button-delete-time-${entry.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job/Project Costing Tab */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Job/Project Costing</CardTitle>
                  <CardDescription>Track project costs and compare to budgets</CardDescription>
                </div>
                <Dialog open={isCreateProjectOpen} onOpenChange={(open) => {
                  setIsCreateProjectOpen(open);
                  if (!open) {
                    setEditingProject(null);
                    resetProjectForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-project">
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
                      <DialogDescription>
                        {editingProject ? "Update project information" : "Add a new job or project for cost tracking"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {!editingProject && (
                        <div className="space-y-2">
                          <Label htmlFor="projectTemplate">Quick Start Template</Label>
                          <Select 
                            value={selectedTemplate} 
                            onValueChange={applyProjectTemplate}
                          >
                            <SelectTrigger id="projectTemplate" data-testid="select-project-template">
                              <SelectValue placeholder="Select a template (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ffp">Firm Fixed Price (FFP)</SelectItem>
                              <SelectItem value="cpff">Cost Plus Fixed Fee (CPFF)</SelectItem>
                              <SelectItem value="tm">Time & Materials (T&M)</SelectItem>
                              <SelectItem value="cpif">Cost Plus Incentive Fee (CPIF)</SelectItem>
                            </SelectContent>
                          </Select>
                          {selectedTemplate && (
                            <p className="text-sm text-muted-foreground">Template applied. You can modify any field below.</p>
                          )}
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="projectContract">Parent Contract</Label>
                        <Select 
                          value={projectFormData.contractId} 
                          onValueChange={handleContractSelection}
                        >
                          <SelectTrigger id="projectContract" data-testid="select-project-contract">
                            <SelectValue placeholder="Select contract (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Contract</SelectItem>
                            {contracts.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.contractName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {projectFormData.contractId && projectFormData.contractId !== "none" && (
                          <p className="text-sm text-muted-foreground">Contract dates auto-populated from parent contract</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="projectNumber">Project Number *</Label>
                          <Input
                            id="projectNumber"
                            data-testid="input-project-number"
                            value={projectFormData.projectNumber}
                            onChange={(e) => {
                              setProjectFormData({ ...projectFormData, projectNumber: e.target.value });
                              validateProjectNumber(e.target.value);
                            }}
                            onBlur={(e) => validateProjectNumber(e.target.value)}
                            placeholder="PROJ-001"
                            className={projectNumberError ? "border-destructive" : ""}
                          />
                          {projectNumberError && (
                            <p className="text-sm text-destructive">{projectNumberError}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="projectName">Project Name *</Label>
                          <Input
                            id="projectName"
                            data-testid="input-project-name"
                            value={projectFormData.projectName}
                            onChange={(e) => setProjectFormData({ ...projectFormData, projectName: e.target.value })}
                            placeholder="Project name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="projectDescription">Description</Label>
                        <Textarea
                          id="projectDescription"
                          data-testid="input-project-description"
                          value={projectFormData.description}
                          onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                          placeholder="Project description"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="projectStartDate">Start Date</Label>
                          <Input
                            id="projectStartDate"
                            data-testid="input-project-start-date"
                            type="date"
                            value={projectFormData.startDate}
                            onChange={(e) => setProjectFormData({ ...projectFormData, startDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="projectEndDate">End Date</Label>
                          <Input
                            id="projectEndDate"
                            data-testid="input-project-end-date"
                            type="date"
                            value={projectFormData.endDate}
                            onChange={(e) => setProjectFormData({ ...projectFormData, endDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="projectBudget">Budget</Label>
                          <Input
                            id="projectBudget"
                            data-testid="input-project-budget"
                            type="number"
                            step="0.01"
                            value={projectFormData.budget}
                            onChange={(e) => setProjectFormData({ ...projectFormData, budget: e.target.value })}
                            placeholder="100000.00"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="projectType">Project Type</Label>
                          <Input
                            id="projectType"
                            data-testid="input-project-type"
                            value={projectFormData.projectType}
                            onChange={(e) => setProjectFormData({ ...projectFormData, projectType: e.target.value })}
                            placeholder="FFP, CPFF, T&M, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="billingMethod">Billing Method</Label>
                          <Select 
                            value={projectFormData.billingMethod} 
                            onValueChange={(value) => setProjectFormData({ ...projectFormData, billingMethod: value })}
                          >
                            <SelectTrigger id="billingMethod" data-testid="select-billing-method">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="fixed_fee">Fixed Fee</SelectItem>
                              <SelectItem value="cost_plus">Cost Plus</SelectItem>
                              <SelectItem value="time_and_materials">Time & Materials</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="laborRate">Labor Rate ($/hr)</Label>
                          <Input
                            id="laborRate"
                            data-testid="input-labor-rate"
                            type="number"
                            step="0.01"
                            value={projectFormData.laborRate}
                            onChange={(e) => setProjectFormData({ ...projectFormData, laborRate: e.target.value })}
                            placeholder="75.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="overheadRate">Overhead Rate (%)</Label>
                          <Input
                            id="overheadRate"
                            data-testid="input-overhead-rate"
                            type="number"
                            step="0.01"
                            value={projectFormData.overheadRate}
                            onChange={(e) => setProjectFormData({ ...projectFormData, overheadRate: e.target.value })}
                            placeholder="35.00"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="projectManager">Project Manager</Label>
                          <Input
                            id="projectManager"
                            data-testid="input-project-manager"
                            value={projectFormData.projectManager}
                            onChange={(e) => setProjectFormData({ ...projectFormData, projectManager: e.target.value })}
                            placeholder="Manager name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="projectStatus">Status</Label>
                          <Select 
                            value={projectFormData.status} 
                            onValueChange={(value) => setProjectFormData({ ...projectFormData, status: value })}
                          >
                            <SelectTrigger id="projectStatus" data-testid="select-project-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="projectNotes">Notes</Label>
                        <Textarea
                          id="projectNotes"
                          data-testid="input-project-notes"
                          value={projectFormData.notes}
                          onChange={(e) => setProjectFormData({ ...projectFormData, notes: e.target.value })}
                          placeholder="Additional notes"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreateProjectOpen(false);
                          setEditingProject(null);
                          resetProjectForm();
                        }}
                        data-testid="button-cancel-project"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => editingProject ? updateProjectMutation.mutate() : createProjectMutation.mutate()}
                        disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
                        data-testid="button-save-project"
                      >
                        {(createProjectMutation.isPending || updateProjectMutation.isPending) ? "Saving..." : (editingProject ? "Update Project" : "Create Project")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Clone Project Dialog */}
                <Dialog open={isCloneProjectOpen} onOpenChange={(open) => {
                  setIsCloneProjectOpen(open);
                  if (!open) {
                    setProjectToClone(null);
                    setCloneOptions({ projectNumber: "", projectName: "", copyCosts: false, copyMilestones: false });
                  }
                }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Clone Project</DialogTitle>
                      <DialogDescription>
                        Create a copy of "{projectToClone?.projectName}"
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cloneProjectNumber">New Project Number *</Label>
                        <Input
                          id="cloneProjectNumber"
                          data-testid="input-clone-project-number"
                          value={cloneOptions.projectNumber}
                          onChange={(e) => setCloneOptions({ ...cloneOptions, projectNumber: e.target.value })}
                          placeholder="PROJ-002"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cloneProjectName">New Project Name *</Label>
                        <Input
                          id="cloneProjectName"
                          data-testid="input-clone-project-name"
                          value={cloneOptions.projectName}
                          onChange={(e) => setCloneOptions({ ...cloneOptions, projectName: e.target.value })}
                          placeholder="Project name"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label>Clone Options</Label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cloneOptions.copyCosts}
                              onChange={(e) => setCloneOptions({ ...cloneOptions, copyCosts: e.target.checked })}
                              className="h-4 w-4"
                              data-testid="checkbox-copy-costs"
                            />
                            <span className="text-sm">Copy project costs</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cloneOptions.copyMilestones}
                              onChange={(e) => setCloneOptions({ ...cloneOptions, copyMilestones: e.target.checked })}
                              className="h-4 w-4"
                              data-testid="checkbox-copy-milestones"
                            />
                            <span className="text-sm">Copy milestones</span>
                          </label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Budget, settings, and configuration will be copied automatically
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCloneProjectOpen(false)}
                        data-testid="button-cancel-clone"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => cloneProjectMutation.mutate()}
                        disabled={cloneProjectMutation.isPending || !cloneOptions.projectNumber || !cloneOptions.projectName}
                        data-testid="button-confirm-clone"
                      >
                        {cloneProjectMutation.isPending ? "Cloning..." : "Clone Project"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingProjects ? (
                <div className="text-center py-8 text-muted-foreground">Loading projects...</div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No projects yet</p>
                  <p className="text-sm">Click "New Project" to start tracking project costs</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {projects.map((project) => {
                    const contract = contracts.find(c => c.id === project.contractId);
                    const costs = projectCosts.filter(c => c.projectId === project.id);
                    const actualCost = parseFloat(project.actualCost);
                    const budget = project.budget ? parseFloat(project.budget) : null;
                    const remaining = budget ? budget - actualCost : null;
                    const percentUsed = budget ? (actualCost / budget) * 100 : null;

                    return (
                      <Card key={project.id} data-testid={`project-card-${project.id}`}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-muted-foreground" />
                                <CardTitle className="text-lg">{project.projectName}</CardTitle>
                                <Badge variant={getStatusBadgeVariant(project.status)} data-testid={`project-status-${project.id}`}>
                                  {project.status}
                                </Badge>
                              </div>
                              <CardDescription>
                                {project.projectNumber} {contract && `• ${contract.contractName}`}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Dialog open={isAddCostOpen && selectedProject?.id === project.id} onOpenChange={(open) => {
                                setIsAddCostOpen(open);
                                if (!open) {
                                  setSelectedProject(null);
                                  resetCostForm();
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedProject(project);
                                      setCostFormData({ ...costFormData, projectId: project.id.toString() });
                                    }}
                                    data-testid={`button-add-cost-${project.id}`}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Cost
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add Project Cost</DialogTitle>
                                    <DialogDescription>
                                      Record a cost for {project.projectName}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="costDate">Date *</Label>
                                        <Input
                                          id="costDate"
                                          data-testid="input-cost-date"
                                          type="date"
                                          value={costFormData.costDate}
                                          onChange={(e) => setCostFormData({ ...costFormData, costDate: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="costType">Cost Type *</Label>
                                        <Select 
                                          value={costFormData.costType} 
                                          onValueChange={(value) => setCostFormData({ ...costFormData, costType: value as any })}
                                        >
                                          <SelectTrigger id="costType" data-testid="select-cost-type">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="direct_labor">Direct Labor</SelectItem>
                                            <SelectItem value="direct_materials">Direct Materials</SelectItem>
                                            <SelectItem value="direct_other">Direct Other</SelectItem>
                                            <SelectItem value="indirect">Indirect</SelectItem>
                                            <SelectItem value="overhead">Overhead</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="costDescription">Description *</Label>
                                      <Textarea
                                        id="costDescription"
                                        data-testid="input-cost-description"
                                        value={costFormData.description}
                                        onChange={(e) => setCostFormData({ ...costFormData, description: e.target.value })}
                                        placeholder="Describe this cost"
                                        rows={2}
                                      />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="costAmount">Amount *</Label>
                                        <Input
                                          id="costAmount"
                                          data-testid="input-cost-amount"
                                          type="number"
                                          step="0.01"
                                          value={costFormData.amount}
                                          onChange={(e) => setCostFormData({ ...costFormData, amount: e.target.value })}
                                          placeholder="1000.00"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="costQuantity">Quantity</Label>
                                        <Input
                                          id="costQuantity"
                                          data-testid="input-cost-quantity"
                                          type="number"
                                          step="0.01"
                                          value={costFormData.quantity}
                                          onChange={(e) => setCostFormData({ ...costFormData, quantity: e.target.value })}
                                          placeholder="10"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="costUnitCost">Unit Cost</Label>
                                        <Input
                                          id="costUnitCost"
                                          data-testid="input-cost-unit-cost"
                                          type="number"
                                          step="0.01"
                                          value={costFormData.unitCost}
                                          onChange={(e) => setCostFormData({ ...costFormData, unitCost: e.target.value })}
                                          placeholder="100.00"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="vendorName">Vendor</Label>
                                        <Input
                                          id="vendorName"
                                          data-testid="input-vendor-name"
                                          value={costFormData.vendorName}
                                          onChange={(e) => setCostFormData({ ...costFormData, vendorName: e.target.value })}
                                          placeholder="Vendor name"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="invoiceNumber">Invoice #</Label>
                                        <Input
                                          id="invoiceNumber"
                                          data-testid="input-invoice-number"
                                          value={costFormData.invoiceNumber}
                                          onChange={(e) => setCostFormData({ ...costFormData, invoiceNumber: e.target.value })}
                                          placeholder="INV-001"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setIsAddCostOpen(false);
                                        setSelectedProject(null);
                                        resetCostForm();
                                      }}
                                      data-testid="button-cancel-cost"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => addProjectCostMutation.mutate()}
                                      disabled={addProjectCostMutation.isPending}
                                      data-testid="button-save-cost"
                                    >
                                      {addProjectCostMutation.isPending ? "Adding..." : "Add Cost"}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleCloneProject(project)}
                                data-testid={`button-clone-project-${project.id}`}
                                title="Clone project"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditProject(project)}
                                data-testid={`button-edit-project-${project.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this project?")) {
                                    deleteProjectMutation.mutate(project.id);
                                  }
                                }}
                                data-testid={`button-delete-project-${project.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Budget</p>
                              <p className="font-medium text-lg" data-testid={`text-project-budget-${project.id}`}>{budget ? formatCurrency(budget) : "—"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Actual Cost</p>
                              <p className="font-medium text-lg" data-testid={`text-project-actual-${project.id}`}>{formatCurrency(actualCost)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Remaining</p>
                              <p className={`font-medium text-lg ${remaining !== null && remaining < 0 ? 'text-destructive' : ''}`} data-testid={`text-project-remaining-${project.id}`}>
                                {remaining !== null ? formatCurrency(remaining) : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">% Used</p>
                              <p className="font-medium text-lg" data-testid={`text-project-percent-used-${project.id}`}>{percentUsed !== null ? `${percentUsed.toFixed(1)}%` : "—"}</p>
                            </div>
                          </div>

                          {costs.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Cost Register</h4>
                              <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted">
                                    <tr>
                                      <th className="text-left p-2">Date</th>
                                      <th className="text-left p-2">Type</th>
                                      <th className="text-left p-2">Description</th>
                                      <th className="text-right p-2">Amount</th>
                                      <th className="text-right p-2"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {costs.map((cost) => (
                                      <tr key={cost.id} className="border-t" data-testid={`cost-row-${cost.id}`}>
                                        <td className="p-2" data-testid={`text-cost-date-${cost.id}`}>{format(new Date(cost.costDate), "MMM d, yyyy")}</td>
                                        <td className="p-2">
                                          <Badge variant="outline" data-testid={`badge-cost-type-${cost.id}`}>{getCostTypeLabel(cost.costType)}</Badge>
                                        </td>
                                        <td className="p-2" data-testid={`text-cost-description-${cost.id}`}>{cost.description}</td>
                                        <td className="p-2 text-right font-medium" data-testid={`text-cost-amount-${cost.id}`}>{formatCurrency(parseFloat(cost.amount))}</td>
                                        <td className="p-2 text-right">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              if (confirm("Are you sure you want to delete this cost entry?")) {
                                                deleteProjectCostMutation.mutate(cost.id);
                                              }
                                            }}
                                            data-testid={`button-delete-cost-${cost.id}`}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contract Milestones Tab */}
        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Contract Milestones</CardTitle>
                  <CardDescription>Track contract deliverables and milestones</CardDescription>
                </div>
                <Dialog open={isCreateMilestoneOpen} onOpenChange={(open) => {
                  setIsCreateMilestoneOpen(open);
                  if (!open) {
                    setEditingMilestone(null);
                    resetMilestoneForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-milestone">
                      <Plus className="h-4 w-4 mr-2" />
                      New Milestone
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingMilestone ? "Edit Milestone" : "Create New Milestone"}</DialogTitle>
                      <DialogDescription>
                        {editingMilestone ? "Update milestone information" : "Add a new contract milestone"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="milestoneContract">Contract *</Label>
                        <Select 
                          value={milestoneFormData.contractId} 
                          onValueChange={(value) => setMilestoneFormData({ ...milestoneFormData, contractId: value })}
                        >
                          <SelectTrigger id="milestoneContract" data-testid="select-milestone-contract">
                            <SelectValue placeholder="Select contract" />
                          </SelectTrigger>
                          <SelectContent>
                            {contracts.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.contractName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="milestoneName">Milestone Name *</Label>
                        <Input
                          id="milestoneName"
                          data-testid="input-milestone-name"
                          value={milestoneFormData.milestoneName}
                          onChange={(e) => setMilestoneFormData({ ...milestoneFormData, milestoneName: e.target.value })}
                          placeholder="Milestone 1: Requirements Delivery"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="milestoneDescription">Description</Label>
                        <Textarea
                          id="milestoneDescription"
                          data-testid="input-milestone-description"
                          value={milestoneFormData.description}
                          onChange={(e) => setMilestoneFormData({ ...milestoneFormData, description: e.target.value })}
                          placeholder="Deliverable description"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="milestoneAmount">Milestone Amount</Label>
                          <Input
                            id="milestoneAmount"
                            data-testid="input-milestone-amount"
                            type="number"
                            step="0.01"
                            value={milestoneFormData.milestoneAmount}
                            onChange={(e) => setMilestoneFormData({ ...milestoneFormData, milestoneAmount: e.target.value })}
                            placeholder="50000.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="milestoneDueDate">Due Date</Label>
                          <Input
                            id="milestoneDueDate"
                            data-testid="input-milestone-due-date"
                            type="date"
                            value={milestoneFormData.dueDate}
                            onChange={(e) => setMilestoneFormData({ ...milestoneFormData, dueDate: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="milestoneStatus">Milestone Status</Label>
                        <Select 
                          value={milestoneFormData.status} 
                          onValueChange={(value) => setMilestoneFormData({ ...milestoneFormData, status: value as any })}
                        >
                          <SelectTrigger id="milestoneStatus" data-testid="select-milestone-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {milestoneFormData.status === "completed" && (
                        <div className="space-y-2">
                          <Label htmlFor="milestoneCompletedDate">Completed Date</Label>
                          <Input
                            id="milestoneCompletedDate"
                            data-testid="input-milestone-completed-date"
                            type="date"
                            value={milestoneFormData.completedDate}
                            onChange={(e) => setMilestoneFormData({ ...milestoneFormData, completedDate: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreateMilestoneOpen(false);
                          setEditingMilestone(null);
                          resetMilestoneForm();
                        }}
                        data-testid="button-cancel-milestone"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => editingMilestone ? updateMilestoneMutation.mutate() : createMilestoneMutation.mutate()}
                        disabled={createMilestoneMutation.isPending || updateMilestoneMutation.isPending}
                        data-testid="button-save-milestone"
                      >
                        {(createMilestoneMutation.isPending || updateMilestoneMutation.isPending) ? "Saving..." : (editingMilestone ? "Update Milestone" : "Create Milestone")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingMilestones ? (
                <div className="text-center py-8 text-muted-foreground">Loading milestones...</div>
              ) : milestones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No milestones yet</p>
                  <p className="text-sm">Click "New Milestone" to start tracking contract deliverables</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => {
                    const contractMilestones = milestones.filter(m => m.contractId === contract.id);
                    if (contractMilestones.length === 0) return null;

                    return (
                      <div key={contract.id} className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground">{contract.contractName}</h3>
                        <div className="space-y-2">
                          {contractMilestones.map((milestone) => (
                            <Card key={milestone.id} className="hover-elevate" data-testid={`milestone-card-${milestone.id}`}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                      {milestone.status === "completed" ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                      )}
                                      <h4 className="font-medium">{milestone.milestoneName}</h4>
                                      <Badge 
                                        variant={milestone.status === "completed" ? "secondary" : milestone.status === "overdue" ? "destructive" : "outline"}
                                        data-testid={`milestone-status-${milestone.id}`}
                                      >
                                        {milestone.status}
                                      </Badge>
                                    </div>
                                    {milestone.description && (
                                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                                    )}
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <p className="text-muted-foreground">Due Date</p>
                                        <p className="font-medium" data-testid={`text-milestone-due-date-${milestone.id}`}>{format(new Date(milestone.dueDate), "MMM d, yyyy")}</p>
                                      </div>
                                      {milestone.milestoneAmount && (
                                        <div>
                                          <p className="text-muted-foreground">Amount</p>
                                          <p className="font-medium" data-testid={`text-milestone-amount-${milestone.id}`}>{formatCurrency(parseFloat(milestone.milestoneAmount))}</p>
                                        </div>
                                      )}
                                      {milestone.completedDate && (
                                        <div>
                                          <p className="text-muted-foreground">Completed</p>
                                          <p className="font-medium" data-testid={`text-milestone-completed-date-${milestone.id}`}>{format(new Date(milestone.completedDate), "MMM d, yyyy")}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleEditMilestone(milestone)}
                                      data-testid={`button-edit-milestone-${milestone.id}`}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        if (confirm("Are you sure you want to delete this milestone?")) {
                                          deleteMilestoneMutation.mutate(milestone.id);
                                        }
                                      }}
                                      data-testid={`button-delete-milestone-${milestone.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Indirect Cost Rates Tab */}
        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Indirect Cost Rates</CardTitle>
                  <CardDescription>Configure overhead and indirect cost allocation rates</CardDescription>
                </div>
                <Dialog open={isCreateRateOpen} onOpenChange={(open) => {
                  setIsCreateRateOpen(open);
                  if (!open) {
                    setEditingRate(null);
                    resetRateForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-rate">
                      <Plus className="h-4 w-4 mr-2" />
                      New Rate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingRate ? "Edit Cost Rate" : "Create New Cost Rate"}</DialogTitle>
                      <DialogDescription>
                        {editingRate ? "Update indirect cost rate information" : "Add a new indirect cost rate"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rateName">Rate Name *</Label>
                          <Input
                            id="rateName"
                            data-testid="input-rate-name"
                            value={rateFormData.rateName}
                            onChange={(e) => setRateFormData({ ...rateFormData, rateName: e.target.value })}
                            placeholder="Overhead Rate"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rateType">Rate Type</Label>
                          <Input
                            id="rateType"
                            data-testid="input-rate-type"
                            value={rateFormData.rateType}
                            onChange={(e) => setRateFormData({ ...rateFormData, rateType: e.target.value })}
                            placeholder="e.g., Overhead, Fringe, G&A"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ratePercentage">Rate Percentage *</Label>
                          <Input
                            id="ratePercentage"
                            data-testid="input-rate-percentage"
                            type="number"
                            step="0.01"
                            value={rateFormData.ratePercentage}
                            onChange={(e) => setRateFormData({ ...rateFormData, ratePercentage: e.target.value })}
                            placeholder="15.50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="baseType">Base Type</Label>
                          <Input
                            id="baseType"
                            data-testid="input-base-type"
                            value={rateFormData.baseType}
                            onChange={(e) => setRateFormData({ ...rateFormData, baseType: e.target.value })}
                            placeholder="e.g., Direct Labor, Total Direct"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="effectiveStartDate">Effective Start Date</Label>
                          <Input
                            id="effectiveStartDate"
                            data-testid="input-effective-start-date"
                            type="date"
                            value={rateFormData.effectiveStartDate}
                            onChange={(e) => setRateFormData({ ...rateFormData, effectiveStartDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="effectiveEndDate">Effective End Date</Label>
                          <Input
                            id="effectiveEndDate"
                            data-testid="input-effective-end-date"
                            type="date"
                            value={rateFormData.effectiveEndDate}
                            onChange={(e) => setRateFormData({ ...rateFormData, effectiveEndDate: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rateDescription">Description</Label>
                        <Textarea
                          id="rateDescription"
                          data-testid="input-rate-description"
                          value={rateFormData.description}
                          onChange={(e) => setRateFormData({ ...rateFormData, description: e.target.value })}
                          placeholder="Rate description and methodology"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="isActive">Status</Label>
                        <Select 
                          value={rateFormData.isActive.toString()} 
                          onValueChange={(value) => setRateFormData({ ...rateFormData, isActive: parseInt(value) })}
                        >
                          <SelectTrigger id="isActive" data-testid="select-rate-active">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Active</SelectItem>
                            <SelectItem value="0">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreateRateOpen(false);
                          setEditingRate(null);
                          resetRateForm();
                        }}
                        data-testid="button-cancel-rate"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => editingRate ? updateRateMutation.mutate() : createRateMutation.mutate()}
                        disabled={createRateMutation.isPending || updateRateMutation.isPending}
                        data-testid="button-save-rate"
                      >
                        {(createRateMutation.isPending || updateRateMutation.isPending) ? "Saving..." : (editingRate ? "Update Rate" : "Create Rate")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRates ? (
                <div className="text-center py-8 text-muted-foreground">Loading rates...</div>
              ) : indirectRates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No indirect cost rates yet</p>
                  <p className="text-sm">Click "New Rate" to configure overhead and indirect cost rates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {indirectRates.map((rate) => (
                    <Card key={rate.id} className="hover-elevate" data-testid={`rate-card-${rate.id}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{rate.rateName}</h4>
                              {rate.isActive ? (
                                <Badge variant="default" data-testid={`rate-status-${rate.id}`}>Active</Badge>
                              ) : (
                                <Badge variant="outline" data-testid={`rate-status-${rate.id}`}>Inactive</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Rate</p>
                                <p className="font-medium text-lg" data-testid={`text-rate-percentage-${rate.id}`}>{parseFloat(rate.ratePercentage).toFixed(2)}%</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Type</p>
                                <p className="font-medium" data-testid={`text-rate-type-${rate.id}`}>{rate.rateType || "—"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Base</p>
                                <p className="font-medium" data-testid={`text-rate-base-${rate.id}`}>{rate.baseType || "—"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Effective Period</p>
                                <p className="font-medium" data-testid={`text-rate-period-${rate.id}`}>
                                  {format(new Date(rate.effectiveStartDate), "MMM yyyy")}
                                  {rate.effectiveEndDate && ` - ${format(new Date(rate.effectiveEndDate), "MMM yyyy")}`}
                                </p>
                              </div>
                            </div>
                            {rate.description && (
                              <p className="text-sm text-muted-foreground">{rate.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditRate(rate)}
                              data-testid={`button-edit-rate-${rate.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this rate?")) {
                                  deleteRateMutation.mutate(rate.id);
                                }
                              }}
                              data-testid={`button-delete-rate-${rate.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* E-Invoicing Tab */}
        <TabsContent value="invoicing">
          <Card>
            <CardHeader>
              <CardTitle>Electronic Invoicing</CardTitle>
              <CardDescription>
                Generate and submit electronic invoices for government contracts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-6 text-center">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Invoice Management</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use the existing Invoice Management system to create and track invoices for your government contracts.
                  </p>
                  <Link href="/invoices">
                    <Button data-testid="button-go-to-invoices">
                      Go to Invoice Management
                    </Button>
                  </Link>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Invoice Management includes:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Create detailed invoices with line items</li>
                    <li>Track invoice status (draft, sent, paid, overdue)</li>
                    <li>Link invoices to clients and projects</li>
                    <li>Generate PDF invoices with company branding</li>
                    <li>Monitor payment status and outstanding balances</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
