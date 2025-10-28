import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, DollarSign, Percent } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Deduction, Organization } from "@shared/schema";

interface DeductionsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Deductions({ currentOrganization, userId }: DeductionsProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<Deduction | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "tax" as "tax" | "insurance" | "retirement" | "garnishment" | "other",
    calculationType: "percentage" as "percentage" | "fixed_amount",
    amount: "",
    isActive: 1,
  });

  const { data: deductions = [], isLoading } = useQuery<Deduction[]>({
    queryKey: [`/api/deductions/${currentOrganization.id}`],
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "tax",
      calculationType: "percentage",
      amount: "",
      isActive: 1,
    });
  };

  const createDeductionMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) {
        throw new Error("Name is required");
      }
      if (!formData.amount) {
        throw new Error("Amount is required");
      }
      return await apiRequest('POST', '/api/deductions', {
        organizationId: currentOrganization.id,
        ...formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deductions/${currentOrganization.id}`] });
      toast({
        title: "Deduction created",
        description: `${formData.name} has been added successfully.`,
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create deduction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateDeductionMutation = useMutation({
    mutationFn: async () => {
      if (!editingDeduction) return;
      if (!formData.name.trim()) {
        throw new Error("Name is required");
      }
      if (!formData.amount) {
        throw new Error("Amount is required");
      }
      return await apiRequest('PATCH', `/api/deductions/${editingDeduction.id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deductions/${currentOrganization.id}`] });
      toast({
        title: "Deduction updated",
        description: "Deduction has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingDeduction(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update deduction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteDeductionMutation = useMutation({
    mutationFn: async (deductionId: number) => {
      return await apiRequest('DELETE', `/api/deductions/${deductionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/deductions/${currentOrganization.id}`] });
      toast({
        title: "Deduction deleted",
        description: "Deduction has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete deduction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDeductionMutation.mutate();
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDeductionMutation.mutate();
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      deleteDeductionMutation.mutate(id);
    }
  };

  const handleEdit = (deduction: Deduction) => {
    setEditingDeduction(deduction);
    setFormData({
      name: deduction.name,
      description: deduction.description || "",
      type: deduction.type,
      calculationType: deduction.calculationType,
      amount: deduction.amount,
      isActive: deduction.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const formatDeductionType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatAmount = (calculationType: string, amount: string) => {
    if (calculationType === 'percentage') {
      return `${parseFloat(amount).toFixed(2)}%`;
    } else {
      return `$${parseFloat(amount).toFixed(2)}`;
    }
  };

  const DeductionForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit-' : ''}name`}>Name *</Label>
        <Input
          id={`${isEdit ? 'edit-' : ''}name`}
          placeholder="e.g., Federal Income Tax, 401(k)"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          data-testid={`input-${isEdit ? 'edit-' : ''}name`}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit-' : ''}description`}>Description</Label>
        <Textarea
          id={`${isEdit ? 'edit-' : ''}description`}
          placeholder="Optional description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          data-testid={`input-${isEdit ? 'edit-' : ''}description`}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}type`}>Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value: any) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger id={`${isEdit ? 'edit-' : ''}type`} data-testid={`select-${isEdit ? 'edit-' : ''}type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tax">Tax</SelectItem>
              <SelectItem value="insurance">Insurance</SelectItem>
              <SelectItem value="retirement">Retirement</SelectItem>
              <SelectItem value="garnishment">Garnishment</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${isEdit ? 'edit-' : ''}calculation-type`}>Calculation Type *</Label>
          <Select
            value={formData.calculationType}
            onValueChange={(value: any) => setFormData({ ...formData, calculationType: value })}
          >
            <SelectTrigger id={`${isEdit ? 'edit-' : ''}calculation-type`} data-testid={`select-${isEdit ? 'edit-' : ''}calculation-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit-' : ''}amount`}>
          {formData.calculationType === 'percentage' ? 'Percentage *' : 'Amount *'}
        </Label>
        <Input
          id={`${isEdit ? 'edit-' : ''}amount`}
          type="number"
          step="0.01"
          placeholder={formData.calculationType === 'percentage' ? '15.00' : '100.00'}
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          data-testid={`input-${isEdit ? 'edit-' : ''}amount`}
        />
        <p className="text-xs text-muted-foreground">
          {formData.calculationType === 'percentage' 
            ? 'Enter the percentage (e.g., 15 for 15%)' 
            : 'Enter the fixed dollar amount'}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${isEdit ? 'edit-' : ''}status`}>Status</Label>
        <Select
          value={formData.isActive.toString()}
          onValueChange={(value) => setFormData({ ...formData, isActive: parseInt(value) })}
        >
          <SelectTrigger id={`${isEdit ? 'edit-' : ''}status`} data-testid={`select-${isEdit ? 'edit-' : ''}status`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Active</SelectItem>
            <SelectItem value="0">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeDeductions = deductions.filter(d => d.isActive === 1);
  const inactiveDeductions = deductions.filter(d => d.isActive === 0);

  return (
    <div className="container py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Deductions</h1>
          <p className="text-muted-foreground mt-2">
            Manage payroll deductions for {currentOrganization.name}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-deduction">
              <Plus className="mr-2 h-4 w-4" />
              Add Deduction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Deduction</DialogTitle>
              <DialogDescription>
                Create a new payroll deduction. This can be applied to employee pay runs.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <DeductionForm />
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createDeductionMutation.isPending}
                  data-testid="button-submit"
                >
                  {createDeductionMutation.isPending ? "Creating..." : "Create Deduction"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Deduction</DialogTitle>
            <DialogDescription>
              Update deduction information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit}>
            <DeductionForm isEdit={true} />
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingDeduction(null);
                  resetForm();
                }}
                data-testid="button-edit-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateDeductionMutation.isPending}
                data-testid="button-edit-submit"
              >
                {updateDeductionMutation.isPending ? "Updating..." : "Update Deduction"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {activeDeductions.length === 0 && inactiveDeductions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No deductions yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first payroll deduction.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-first-deduction">
              <Plus className="mr-2 h-4 w-4" />
              Add First Deduction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeDeductions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Active Deductions</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeDeductions.map((deduction) => (
                  <Card key={deduction.id} className="hover-elevate" data-testid={`card-deduction-${deduction.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg" data-testid={`text-deduction-name-${deduction.id}`}>
                            {deduction.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {formatDeductionType(deduction.type)}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(deduction)}
                            data-testid={`button-edit-${deduction.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(deduction.id, deduction.name)}
                            data-testid={`button-delete-${deduction.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Amount</span>
                          <span className="font-semibold flex items-center" data-testid={`text-amount-${deduction.id}`}>
                            {deduction.calculationType === 'percentage' ? (
                              <Percent className="h-4 w-4 mr-1" />
                            ) : (
                              <DollarSign className="h-4 w-4 mr-1" />
                            )}
                            {formatAmount(deduction.calculationType, deduction.amount)}
                          </span>
                        </div>
                        {deduction.description && (
                          <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground">{deduction.description}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {inactiveDeductions.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Inactive Deductions</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inactiveDeductions.map((deduction) => (
                  <Card key={deduction.id} className="opacity-60 hover-elevate" data-testid={`card-deduction-${deduction.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg" data-testid={`text-deduction-name-${deduction.id}`}>
                            {deduction.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {formatDeductionType(deduction.type)}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(deduction)}
                            data-testid={`button-edit-${deduction.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(deduction.id, deduction.name)}
                            data-testid={`button-delete-${deduction.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Amount</span>
                          <span className="font-semibold flex items-center" data-testid={`text-amount-${deduction.id}`}>
                            {deduction.calculationType === 'percentage' ? (
                              <Percent className="h-4 w-4 mr-1" />
                            ) : (
                              <DollarSign className="h-4 w-4 mr-1" />
                            )}
                            {formatAmount(deduction.calculationType, deduction.amount)}
                          </span>
                        </div>
                        {deduction.description && (
                          <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground">{deduction.description}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
