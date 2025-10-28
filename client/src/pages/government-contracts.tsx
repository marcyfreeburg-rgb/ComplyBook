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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock, CheckCircle2, AlertCircle, DollarSign, Calendar, Edit2, FileText, PlayCircle, StopCircle, Target, TrendingUp, Receipt } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Contract, ContractMilestone, Project, TimeEntry, IndirectCostRate, Organization } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";

interface GovernmentContractsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function GovernmentContracts({ currentOrganization, userId }: GovernmentContractsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("contracts");
  
  // Contract Management Tab
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

  const {data: contracts = [], isLoading: loadingContracts } = useQuery<Contract[]>({
    queryKey: [`/api/contracts/${currentOrganization.id}`],
  });

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
      fundedAmount: contract.fundedAmount || "0",
      contractType: contract.contractType || "",
      primeContractor: contract.primeContractor || "",
      contractOfficer: contract.contractOfficer || "",
      contactEmail: contract.contactEmail || "",
      contactPhone: contract.contactPhone || "",
      notes: contract.notes || "",
      status: contract.status,
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "completed": return "secondary";
      case "pending": return "outline";
      case "on_hold": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  if (currentOrganization.type !== 'forprofit') {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Government Contracts</CardTitle>
            <CardDescription>
              This feature is only available for for-profit organizations.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Government Contracts</h1>
        <p className="text-muted-foreground mt-1">
          DCAA-compliant time keeping, job costing, and contract management
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="contracts" data-testid="tab-contracts">
            <FileText className="h-4 w-4 mr-2" />
            Contracts
          </TabsTrigger>
          <TabsTrigger value="timekeeping" data-testid="tab-timekeeping">
            <Clock className="h-4 w-4 mr-2" />
            Time Keeping
          </TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">
            <Target className="h-4 w-4 mr-2" />
            Job Costing
          </TabsTrigger>
          <TabsTrigger value="rates" data-testid="tab-rates">
            <TrendingUp className="h-4 w-4 mr-2" />
            Cost Rates
          </TabsTrigger>
          <TabsTrigger value="invoicing" data-testid="tab-invoicing">
            <Receipt className="h-4 w-4 mr-2" />
            E-Invoicing
          </TabsTrigger>
        </TabsList>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Contract Management</CardTitle>
                <CardDescription>
                  Manage government contracts, funding, and milestones
                </CardDescription>
              </div>
              <Dialog open={isCreateContractOpen || !!editingContract} onOpenChange={(open) => {
                if (!open) {
                  setIsCreateContractOpen(false);
                  setEditingContract(null);
                  resetContractForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setIsCreateContractOpen(true)} data-testid="button-create-contract">
                    <Plus className="h-4 w-4 mr-2" />
                    New Contract
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingContract ? "Edit Contract" : "Create New Contract"}</DialogTitle>
                    <DialogDescription>
                      {editingContract ? "Update contract information" : "Add a new government contract to track"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contractNumber">Contract Number *</Label>
                        <Input
                          id="contractNumber"
                          data-testid="input-contract-number"
                          value={contractFormData.contractNumber}
                          onChange={(e) => setContractFormData({ ...contractFormData, contractNumber: e.target.value })}
                          placeholder="e.g., N00178-22-C-1234"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contractName">Contract Name *</Label>
                        <Input
                          id="contractName"
                          data-testid="input-contract-name"
                          value={contractFormData.contractName}
                          onChange={(e) => setContractFormData({ ...contractFormData, contractName: e.target.value })}
                          placeholder="Project title"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientName">Client/Agency *</Label>
                        <Input
                          id="clientName"
                          data-testid="input-client-name"
                          value={contractFormData.clientName}
                          onChange={(e) => setContractFormData({ ...contractFormData, clientName: e.target.value })}
                          placeholder="e.g., Department of Defense"
                        />
                      </div>
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        data-testid="input-description"
                        value={contractFormData.description}
                        onChange={(e) => setContractFormData({ ...contractFormData, description: e.target.value })}
                        placeholder="Contract scope and deliverables"
                        rows={3}
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
                          placeholder="0.00"
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
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={contractFormData.status}
                          onValueChange={(value: any) => setContractFormData({ ...contractFormData, status: value })}
                        >
                          <SelectTrigger id="status" data-testid="select-status">
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
                        <Label htmlFor="startDate">Start Date *</Label>
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
                        <Label htmlFor="contractOfficer">Contract Officer</Label>
                        <Input
                          id="contractOfficer"
                          data-testid="input-contract-officer"
                          value={contractFormData.contractOfficer}
                          onChange={(e) => setContractFormData({ ...contractFormData, contractOfficer: e.target.value })}
                          placeholder="Name"
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

        {/* Time Keeping Tab */}
        <TabsContent value="timekeeping">
          <Card>
            <CardHeader>
              <CardTitle>DCAA Time Keeping</CardTitle>
              <CardDescription>
                DCAA-compliant time tracking for government contracts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Time Keeping Feature</p>
                <p className="text-sm">Clock in/out, task tracking, and DCAA-compliant timesheets</p>
                <p className="text-xs mt-4">Coming soon in this implementation</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Costing Tab */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Job/Project Costing</CardTitle>
              <CardDescription>
                Track project costs, labor, materials, and overhead by contract
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Job Costing Feature</p>
                <p className="text-sm">Project cost tracking, budget vs. actuals, and profitability analysis</p>
                <p className="text-xs mt-4">Coming soon in this implementation</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Rates Tab */}
        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <CardTitle>Indirect Cost Rates</CardTitle>
              <CardDescription>
                Configure and track indirect cost rates for overhead allocation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Indirect Cost Rates Feature</p>
                <p className="text-sm">Overhead rates, fringe benefits, and G&A allocation</p>
                <p className="text-xs mt-4">Coming soon in this implementation</p>
              </div>
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
