import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, ArrowUpRight, ArrowDownRight, Edit, Trash2, RefreshCw, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Organization, Category } from "@shared/schema";

interface RecurringTransaction {
  id: number;
  organizationId: number;
  description: string;
  amount: string;
  type: "income" | "expense";
  categoryId: number | null;
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  startDate: Date | string;
  endDate: Date | string | null;
  lastGeneratedDate: Date | string | null;
  dayOfMonth: number | null;
  isActive: number;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface RecurringTransactionsProps {
  currentOrganization: Organization;
  userId: string;
}

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export default function RecurringTransactions({ currentOrganization, userId }: RecurringTransactionsProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);
  const [formData, setFormData] = useState({
    organizationId: currentOrganization.id,
    type: 'expense' as 'income' | 'expense',
    description: '',
    amount: '',
    categoryId: undefined as number | undefined,
    frequency: 'monthly' as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    dayOfMonth: undefined as number | undefined,
    isActive: 1,
  });

  const { data: recurringTransactions, isLoading: transactionsLoading } = useQuery<RecurringTransaction[]>({
    queryKey: [`/api/recurring-transactions/${currentOrganization.id}`],
    retry: false,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: [`/api/categories/${currentOrganization.id}`],
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/recurring-transactions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/recurring-transactions/${currentOrganization.id}`] });
      toast({
        title: "Recurring transaction created",
        description: "Your recurring transaction has been set up successfully.",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create recurring transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return await apiRequest('PATCH', `/api/recurring-transactions/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/recurring-transactions/${currentOrganization.id}`] });
      toast({
        title: "Recurring transaction updated",
        description: "Your recurring transaction has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingTransaction(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update recurring transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/recurring-transactions/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/recurring-transactions/${currentOrganization.id}`] });
      toast({
        title: "Recurring transaction deleted",
        description: "The recurring transaction has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete recurring transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/recurring-transactions/generate/${currentOrganization.id}`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/recurring-transactions/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${currentOrganization.id}`] });
      toast({
        title: "Transactions generated",
        description: `Generated ${data.count} transaction(s) from recurring templates.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate transactions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: number }) => {
      return await apiRequest('PATCH', `/api/recurring-transactions/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/recurring-transactions/${currentOrganization.id}`] });
    },
  });

  const resetForm = () => {
    setFormData({
      organizationId: currentOrganization.id,
      type: 'expense',
      description: '',
      amount: '',
      categoryId: undefined,
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      dayOfMonth: undefined,
      isActive: 1,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: any = {
      ...formData,
      amount: parseFloat(formData.amount).toFixed(2),
      endDate: formData.endDate || null,
      dayOfMonth: formData.dayOfMonth || null,
    };
    createMutation.mutate(submitData);
  };

  const handleEdit = (transaction: RecurringTransaction) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    
    const updates = {
      description: editingTransaction.description,
      amount: parseFloat(editingTransaction.amount.toString()).toFixed(2),
      type: editingTransaction.type,
      categoryId: editingTransaction.categoryId,
      frequency: editingTransaction.frequency,
      startDate: editingTransaction.startDate,
      endDate: editingTransaction.endDate || null,
      dayOfMonth: editingTransaction.dayOfMonth || null,
      isActive: editingTransaction.isActive,
    };
    
    updateMutation.mutate({ id: editingTransaction.id, updates });
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId || !categories) return "Uncategorized";
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Uncategorized";
  };

  if (transactionsLoading || categoriesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" data-testid="heading-recurring-transactions">Recurring Transactions</h2>
          <p className="text-muted-foreground">Set up automatic recurring income and expenses</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => generateMutation.mutate()}
            variant="outline"
            disabled={generateMutation.isPending}
            data-testid="button-generate-transactions"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {generateMutation.isPending ? "Generating..." : "Generate Now"}
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-recurring">
            <Plus className="h-4 w-4 mr-2" />
            Add Recurring Transaction
          </Button>
        </div>
      </div>

      {/* Recurring Transactions List */}
      <div className="grid gap-4">
        {!recurringTransactions || recurringTransactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No recurring transactions set up yet.</p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Recurring Transaction
              </Button>
            </CardContent>
          </Card>
        ) : (
          recurringTransactions.map((transaction) => (
            <Card key={transaction.id} className="hover-elevate" data-testid={`recurring-transaction-${transaction.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {transaction.type === "income" ? (
                        <ArrowDownRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-600" />
                      )}
                      <h3 className="font-semibold text-lg" data-testid={`text-description-${transaction.id}`}>
                        {transaction.description}
                      </h3>
                      <Badge variant={transaction.isActive === 1 ? "default" : "secondary"}>
                        {transaction.isActive === 1 ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-foreground" data-testid={`text-amount-${transaction.id}`}>
                          ${parseFloat(transaction.amount).toFixed(2)}
                        </span>
                        <span>•</span>
                        <span data-testid={`text-frequency-${transaction.id}`}>{frequencyLabels[transaction.frequency]}</span>
                      </div>
                      <div>
                        <Badge variant="outline">{getCategoryName(transaction.categoryId)}</Badge>
                      </div>
                      <div>
                        Starts: {format(new Date(transaction.startDate), "MMM d, yyyy")}
                      </div>
                      {transaction.endDate && (
                        <div>
                          Ends: {format(new Date(transaction.endDate), "MMM d, yyyy")}
                        </div>
                      )}
                      {transaction.lastGeneratedDate && (
                        <div>
                          Last: {format(new Date(transaction.lastGeneratedDate), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${transaction.id}`} className="text-sm">Active</Label>
                      <Switch
                        id={`active-${transaction.id}`}
                        checked={transaction.isActive === 1}
                        onCheckedChange={(checked) => {
                          toggleActiveMutation.mutate({ id: transaction.id, isActive: checked ? 1 : 0 });
                        }}
                        data-testid={`switch-active-${transaction.id}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(transaction)}
                      data-testid={`button-edit-${transaction.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this recurring transaction?")) {
                          deleteMutation.mutate(transaction.id);
                        }
                      }}
                      data-testid={`button-delete-${transaction.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Recurring Transaction</DialogTitle>
            <DialogDescription>
              Set up a transaction that repeats automatically on a schedule.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type" data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  data-testid="input-amount"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                data-testid="input-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.categoryId?.toString() || ""}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value ? parseInt(value) : undefined })}
              >
                <SelectTrigger id="category" data-testid="select-category">
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger id="frequency" data-testid="select-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="dayOfMonth">Day of Month (optional)</Label>
                  <Input
                    id="dayOfMonth"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayOfMonth || ''}
                    onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Leave blank for current day"
                    data-testid="input-day-of-month"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                {createMutation.isPending ? "Creating..." : "Create Recurring Transaction"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingTransaction && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Recurring Transaction</DialogTitle>
              <DialogDescription>
                Update the recurring transaction details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select
                    value={editingTransaction.type}
                    onValueChange={(value: 'income' | 'expense') => 
                      setEditingTransaction({ ...editingTransaction, type: value })
                    }
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    value={editingTransaction.amount}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingTransaction.description}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editingTransaction.categoryId?.toString() || ""}
                  onValueChange={(value) => 
                    setEditingTransaction({ ...editingTransaction, categoryId: value ? parseInt(value) : null })
                  }
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-frequency">Frequency</Label>
                  <Select
                    value={editingTransaction.frequency}
                    onValueChange={(value: any) => 
                      setEditingTransaction({ ...editingTransaction, frequency: value })
                    }
                  >
                    <SelectTrigger id="edit-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editingTransaction.frequency === 'monthly' && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-dayOfMonth">Day of Month (optional)</Label>
                    <Input
                      id="edit-dayOfMonth"
                      type="number"
                      min="1"
                      max="31"
                      value={editingTransaction.dayOfMonth || ''}
                      onChange={(e) => 
                        setEditingTransaction({ 
                          ...editingTransaction, 
                          dayOfMonth: e.target.value ? parseInt(e.target.value) : null 
                        })
                      }
                      placeholder="Leave blank for current day"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Recurring Transaction"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
