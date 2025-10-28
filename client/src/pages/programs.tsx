import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Target, DollarSign, TrendingUp, Calendar, Edit2, BarChart3 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Program, Transaction, Organization } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface ProgramsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Programs({ currentOrganization, userId }: ProgramsProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isExpensesDialogOpen, setIsExpensesDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [viewingProgramId, setViewingProgramId] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    budget: "",
    isActive: true,
  });

  const { data: programs = [], isLoading } = useQuery<Program[]>({
    queryKey: [`/api/programs`, currentOrganization.id],
  });

  const { data: programExpenses = [], isLoading: isLoadingExpenses } = useQuery<Transaction[]>({
    queryKey: [`/api/programs/${viewingProgramId}/expenses`, dateFilter],
    enabled: !!viewingProgramId && isExpensesDialogOpen,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      budget: "",
      isActive: true,
    });
  };

  const createProgramMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) {
        throw new Error("Program name is required");
      }
      return await apiRequest('POST', '/api/programs', {
        organizationId: currentOrganization.id,
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        budget: formData.budget || null,
        isActive: formData.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs`, currentOrganization.id] });
      toast({
        title: "Program created",
        description: `${formData.name} has been added successfully.`,
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create program. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: async () => {
      if (!editingProgram) return;
      if (!formData.name.trim()) {
        throw new Error("Program name is required");
      }
      return await apiRequest('PUT', `/api/programs/${editingProgram.id}`, {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        budget: formData.budget || null,
        isActive: formData.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs`, currentOrganization.id] });
      toast({
        title: "Program updated",
        description: "Program information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingProgram(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update program. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: async (programId: number) => {
      return await apiRequest('DELETE', `/api/programs/${programId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/programs`, currentOrganization.id] });
      toast({
        title: "Program deleted",
        description: "The program has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete program.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (program: Program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      description: program.description || "",
      startDate: program.startDate ? new Date(program.startDate).toISOString().split('T')[0] : "",
      endDate: program.endDate ? new Date(program.endDate).toISOString().split('T')[0] : "",
      budget: program.budget || "",
      isActive: program.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleViewExpenses = (programId: number) => {
    setViewingProgramId(programId);
    setIsExpensesDialogOpen(true);
  };

  const totalExpenses = programExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  
  // Calculate statistics for active programs
  const activePrograms = programs.filter(p => p.isActive).length;
  const totalBudget = programs
    .filter(p => p.isActive && p.budget)
    .reduce((sum, p) => sum + parseFloat(p.budget!), 0);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-programs">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-programs">Programs</h1>
          <p className="text-muted-foreground">
            Define and manage nonprofit programs for expense allocation
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-program">
              <Plus className="mr-2 h-4 w-4" />
              Create Program
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Program</DialogTitle>
              <DialogDescription>
                Add a new program to track specific initiatives and allocate expenses.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Program Name *</Label>
                <Input
                  id="name"
                  data-testid="input-program-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="After School Tutoring"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="input-program-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Purpose and goals of this program"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    data-testid="input-program-start-date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    data-testid="input-program-end-date"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  data-testid="input-program-budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="50000.00"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  data-testid="checkbox-program-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active Program
                </Label>
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
                  onClick={() => createProgramMutation.mutate()}
                  disabled={createProgramMutation.isPending}
                  data-testid="button-submit-create-program"
                >
                  {createProgramMutation.isPending ? "Creating..." : "Create Program"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-programs">
              {activePrograms}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-programs">
              {programs.length}
            </div>
            <p className="text-xs text-muted-foreground">
              All programs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-budget">
              {formatCurrency(totalBudget, currentOrganization.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Active programs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Programs List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading programs...</p>
        </div>
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Programs Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first program to start tracking initiatives and allocating expenses.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-program">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Program
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <Card key={program.id} className="hover-elevate" data-testid={`card-program-${program.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg" data-testid={`text-program-name-${program.id}`}>
                        {program.name}
                      </CardTitle>
                      <Badge variant={program.isActive ? "default" : "secondary"} data-testid={`badge-status-${program.id}`}>
                        {program.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
                {program.description && (
                  <CardDescription className="mt-2" data-testid={`text-program-description-${program.id}`}>
                    {program.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {program.budget && (
                    <div>
                      <p className="text-sm text-muted-foreground">Budget</p>
                      <p className="text-2xl font-bold" data-testid={`text-program-budget-${program.id}`}>
                        {formatCurrency(parseFloat(program.budget), currentOrganization.currency)}
                      </p>
                    </div>
                  )}
                  {(program.startDate || program.endDate) && (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Duration
                      </p>
                      <p className="text-sm" data-testid={`text-program-dates-${program.id}`}>
                        {program.startDate && new Date(program.startDate).toLocaleDateString()}
                        {program.startDate && program.endDate && " - "}
                        {program.endDate && new Date(program.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewExpenses(program.id)}
                      data-testid={`button-view-expenses-${program.id}`}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Expenses
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(program)}
                      data-testid={`button-edit-program-${program.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${program.name}?`)) {
                          deleteProgramMutation.mutate(program.id);
                        }
                      }}
                      data-testid={`button-delete-program-${program.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
            <DialogDescription>
              Update program information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Program Name *</Label>
              <Input
                id="edit-name"
                data-testid="input-edit-program-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                data-testid="input-edit-program-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input
                  id="edit-startDate"
                  data-testid="input-edit-program-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-endDate">End Date</Label>
                <Input
                  id="edit-endDate"
                  data-testid="input-edit-program-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-budget">Budget</Label>
              <Input
                id="edit-budget"
                data-testid="input-edit-program-budget"
                type="number"
                step="0.01"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                data-testid="checkbox-edit-program-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-isActive" className="cursor-pointer">
                Active Program
              </Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingProgram(null);
                  resetForm();
                }}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => updateProgramMutation.mutate()}
                disabled={updateProgramMutation.isPending}
                data-testid="button-submit-edit-program"
              >
                {updateProgramMutation.isPending ? "Updating..." : "Update Program"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expenses Dialog */}
      <Dialog open={isExpensesDialogOpen} onOpenChange={setIsExpensesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Program Expenses</DialogTitle>
            <DialogDescription>
              View all expenses allocated to this program.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filter-start">Start Date</Label>
                <Input
                  id="filter-start"
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                  data-testid="input-filter-start-date"
                />
              </div>
              <div>
                <Label htmlFor="filter-end">End Date</Label>
                <Input
                  id="filter-end"
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                  data-testid="input-filter-end-date"
                />
              </div>
            </div>
            
            {isLoadingExpenses ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading expenses...</p>
              </div>
            ) : programExpenses.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No expenses found for this program in the selected date range.</p>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Total Expenses</CardTitle>
                    <CardDescription>
                      {new Date(dateFilter.startDate).toLocaleDateString()} - {new Date(dateFilter.endDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold" data-testid="text-total-expenses">
                      {formatCurrency(totalExpenses, currentOrganization.currency)}
                    </p>
                  </CardContent>
                </Card>
                
                <div className="space-y-2">
                  {programExpenses.map((expense) => (
                    <Card key={expense.id} data-testid={`expense-${expense.id}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium" data-testid={`expense-description-${expense.id}`}>
                              {expense.description}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(expense.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600" data-testid={`expense-amount-${expense.id}`}>
                              {formatCurrency(parseFloat(expense.amount), currentOrganization.currency)}
                            </p>
                            {expense.functionalCategory && (
                              <Badge variant="outline" data-testid={`expense-category-${expense.id}`}>
                                {expense.functionalCategory}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
