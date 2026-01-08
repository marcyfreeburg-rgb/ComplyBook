import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, TrendingUp, Trash2, ArrowLeft, Edit } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertBudgetSchema, insertBudgetItemSchema, type Budget, type BudgetItem, type Category, type Grant } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { CategoryCombobox } from "@/components/category-combobox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Budgets() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteBudgetId, setDeleteBudgetId] = useState<number | null>(null);

  const organizationId = parseInt(localStorage.getItem("currentOrganizationId") || "0");
  if (!organizationId) {
    setLocation("/");
    return null;
  }

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery<Budget[]>({
    queryKey: ["/api/budgets", organizationId],
    enabled: organizationId > 0,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", organizationId],
    enabled: organizationId > 0,
  });

  const { data: grants = [] } = useQuery<Grant[]>({
    queryKey: ["/api/grants", organizationId],
    enabled: organizationId > 0,
  });

  const { data: budgetItems = [] } = useQuery<Array<BudgetItem & { categoryName: string }>>({
    queryKey: ["/api/budgets", selectedBudgetId, "items"],
    enabled: selectedBudgetId !== null,
  });

  const { data: vsActual = [] } = useQuery<Array<{
    categoryId: number;
    categoryName: string;
    budgeted: string;
    actual: string;
    difference: string;
    percentUsed: number;
  }>>({
    queryKey: ["/api/budgets", selectedBudgetId, "vs-actual"],
    enabled: selectedBudgetId !== null,
  });

  const createBudgetMutation = useMutation({
    mutationFn: (data: z.infer<typeof insertBudgetSchema>) =>
      apiRequest('POST', '/api/budgets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", organizationId] });
      handleCloseDialog();
      toast({ title: "Budget created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create budget", variant: "destructive" });
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest('PATCH', `/api/budgets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", organizationId] });
      handleCloseDialog();
      toast({ title: "Budget updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update budget", variant: "destructive" });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (budgetId: number) =>
      apiRequest('DELETE', `/api/budgets/${budgetId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", organizationId] });
      setSelectedBudgetId(null);
      setDeleteBudgetId(null);
      toast({ title: "Budget deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete budget", variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (data: z.infer<typeof insertBudgetItemSchema>) =>
      apiRequest('POST', `/api/budgets/${selectedBudgetId}/items`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", selectedBudgetId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", selectedBudgetId, "vs-actual"] });
      setIsAddItemOpen(false);
      itemForm.reset({
        budgetId: selectedBudgetId || 0,
        categoryId: 0,
        amount: "",
      });
      toast({ title: "Budget item added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add budget item", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) =>
      apiRequest('DELETE', `/api/budget-items/${itemId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", selectedBudgetId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", selectedBudgetId, "vs-actual"] });
      toast({ title: "Budget item deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete budget", variant: "destructive" });
    },
  });

  // Form schema with Date objects for easier handling
  const budgetFormSchema = z.object({
    organizationId: z.number(),
    grantId: z.number().nullable().optional(),
    name: z.string().min(1, "Budget name is required"),
    period: z.enum(["monthly", "quarterly", "yearly"]),
    startDate: z.date(),
    endDate: z.date(),
    createdBy: z.string().optional(),
  });

  const budgetForm = useForm<z.infer<typeof budgetFormSchema>>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      organizationId,
      grantId: null,
      name: "",
      period: "monthly" as const,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    },
  });

  const itemFormSchema = z.object({
    budgetId: z.number(),
    categoryId: z.number().min(1, "Category is required"),
    amount: z.string().min(1, "Amount is required"),
  });

  const itemForm = useForm<z.infer<typeof itemFormSchema>>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      budgetId: selectedBudgetId || 0,
      categoryId: 0,
      amount: "",
    },
  });

  const handleCloseDialog = () => {
    setIsCreateBudgetOpen(false);
    setEditingBudget(null);
    budgetForm.reset({
      organizationId,
      grantId: null,
      name: "",
      period: "monthly" as const,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    });
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    budgetForm.reset({
      organizationId: budget.organizationId,
      grantId: budget.grantId || null,
      name: budget.name,
      period: budget.period,
      startDate: new Date(budget.startDate),
      endDate: new Date(budget.endDate),
    });
    setIsCreateBudgetOpen(true);
  };

  // When a grant is selected, prefill dates and name with grant info
  const handleGrantChange = (grantId: number | null) => {
    budgetForm.setValue("grantId", grantId);
    if (grantId) {
      const selectedGrant = grants.find(g => g.id === grantId);
      if (selectedGrant) {
        budgetForm.setValue("name", `${selectedGrant.name} Budget`);
        if (selectedGrant.startDate) {
          budgetForm.setValue("startDate", new Date(selectedGrant.startDate));
        }
        if (selectedGrant.endDate) {
          budgetForm.setValue("endDate", new Date(selectedGrant.endDate));
        }
      }
    }
  };

  const handleDeleteBudget = (id: number) => {
    setDeleteBudgetId(id);
  };

  const confirmDelete = () => {
    if (deleteBudgetId) {
      deleteBudgetMutation.mutate(deleteBudgetId);
    }
  };

  const onCreateBudget = (data: z.infer<typeof budgetFormSchema>) => {
    if (editingBudget) {
      updateBudgetMutation.mutate({ id: editingBudget.id, data });
    } else {
      createBudgetMutation.mutate(data as any);
    }
  };

  const onAddItem = (data: z.infer<typeof itemFormSchema>) => {
    if (!selectedBudgetId) return;
    // insertBudgetItemSchema already includes budgetId, categoryId, and amount
    addItemMutation.mutate(data as any);
  };

  const selectedBudget = budgets.find(b => b.id === selectedBudgetId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Budgets</h1>
          <p className="text-muted-foreground">Plan and track your spending against budgets</p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm" data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <Dialog open={isCreateBudgetOpen} onOpenChange={(open) => {
          if (!open) handleCloseDialog();
          else setIsCreateBudgetOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-budget">
              <Plus className="w-4 h-4 mr-2" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBudget ? 'Edit Budget' : 'Create New Budget'}</DialogTitle>
              <DialogDescription>
                {editingBudget 
                  ? 'Update budget details and period.'
                  : 'Set up a budget period to track your spending'
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...budgetForm}>
              <form onSubmit={budgetForm.handleSubmit(onCreateBudget)} className="space-y-4">
                <FormField
                  control={budgetForm.control}
                  name="grantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Grant (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => handleGrantChange(value === "none" ? null : parseInt(value))} 
                        value={field.value ? String(field.value) : "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-budget-grant">
                            <SelectValue placeholder="Select a grant (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No linked grant</SelectItem>
                          {grants.filter(g => g.status === 'active').map((grant) => (
                            <SelectItem key={grant.id} value={String(grant.id)}>
                              {grant.name} (${Number(grant.amount).toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Linking to a grant will prefill dates and track spending against the grant amount
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={budgetForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Q1 2025 Budget" data-testid="input-budget-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={budgetForm.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-budget-period">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={budgetForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-budget-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={budgetForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-budget-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createBudgetMutation.isPending || updateBudgetMutation.isPending} data-testid="button-submit-budget">
                  {editingBudget 
                    ? (updateBudgetMutation.isPending ? "Updating..." : "Update")
                    : (createBudgetMutation.isPending ? "Creating..." : "Create")
                  }
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {budgetsLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No budgets yet</h3>
            <p className="text-muted-foreground mb-4">Create your first budget to start planning your spending</p>
            <Button onClick={() => setIsCreateBudgetOpen(true)} data-testid="button-create-first-budget">
              <Plus className="w-4 h-4 mr-2" />
              Create Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Budgets</h2>
            {budgets.map((budget) => {
              const linkedGrant = budget.grantId ? grants.find(g => g.id === budget.grantId) : null;
              return (
              <Card
                key={budget.id}
                className={`hover-elevate ${selectedBudgetId === budget.id ? 'ring-2 ring-primary' : ''}`}
                data-testid={`card-budget-${budget.id}`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <div className="cursor-pointer flex-1" onClick={() => setSelectedBudgetId(budget.id)}>
                    <CardTitle className="text-base">{budget.name}</CardTitle>
                    <CardDescription>
                      {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} • 
                      {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                    </CardDescription>
                    {linkedGrant && (
                      <p className="text-xs text-primary mt-1" data-testid={`grant-link-${budget.id}`}>
                        Grant: {linkedGrant.name} (${Number(linkedGrant.amount).toLocaleString()})
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditBudget(budget);
                      }}
                      data-testid={`button-edit-${budget.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBudget(budget.id);
                      }}
                      data-testid={`button-delete-${budget.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
              );
            })}
          </div>

          {selectedBudget && (
            <div className="lg:col-span-2 space-y-6">
              {selectedBudget.grantId && (() => {
                const linkedGrant = grants.find(g => g.id === selectedBudget.grantId);
                const totalBudgeted = vsActual.reduce((sum, item) => sum + parseFloat(item.budgeted || "0"), 0);
                const totalSpent = vsActual.reduce((sum, item) => sum + parseFloat(item.actual || "0"), 0);
                const grantAmount = linkedGrant ? Number(linkedGrant.amount) : 0;
                const remainingGrant = grantAmount - totalSpent;
                
                return linkedGrant ? (
                  <Card data-testid="card-grant-summary">
                    <CardHeader>
                      <CardTitle className="text-lg">Linked Grant: {linkedGrant.name}</CardTitle>
                      <CardDescription>
                        {linkedGrant.status === 'active' ? 'Active grant' : linkedGrant.status} • 
                        {linkedGrant.startDate && linkedGrant.endDate && (
                          ` ${new Date(linkedGrant.startDate).toLocaleDateString()} - ${new Date(linkedGrant.endDate).toLocaleDateString()}`
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Grant Amount</p>
                          <p className="text-xl font-semibold text-primary" data-testid="text-grant-amount">
                            ${grantAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Budgeted</p>
                          <p className="text-xl font-semibold" data-testid="text-total-budgeted">
                            ${totalBudgeted.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Spent</p>
                          <p className="text-xl font-semibold" data-testid="text-total-spent">
                            ${totalSpent.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Grant Remaining</p>
                          <p className={`text-xl font-semibold ${remainingGrant < 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="text-grant-remaining">
                            ${remainingGrant.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {linkedGrant.restrictions && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium">Grant Restrictions</p>
                          <p className="text-sm text-muted-foreground">{linkedGrant.restrictions}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null;
              })()}
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>{selectedBudget.name}</CardTitle>
                    <CardDescription>Budget Details & Performance</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Budget Items</h3>
                    <Dialog open={isAddItemOpen} onOpenChange={(open) => {
                      if (open && selectedBudgetId) {
                        itemForm.reset({
                          budgetId: selectedBudgetId,
                          categoryId: 0,
                          amount: "",
                        });
                      }
                      setIsAddItemOpen(open);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-budget-item">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Budget Item</DialogTitle>
                          <DialogDescription>
                            Assign a budget amount to a category
                          </DialogDescription>
                        </DialogHeader>
                        {categories.length === 0 ? (
                          <div className="text-center py-6 space-y-4">
                            <p className="text-muted-foreground">
                              No categories available. Please create expense categories first to add budget items.
                            </p>
                            <Link href="/categories">
                              <Button variant="outline" data-testid="button-go-to-categories">
                                Go to Categories
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <Form {...itemForm}>
                            <form onSubmit={itemForm.handleSubmit(onAddItem)} className="space-y-4">
                              <FormField
                                control={itemForm.control}
                                name="categoryId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <CategoryCombobox
                                      categories={categories}
                                      value={field.value}
                                      onValueChange={(value) => field.onChange(value)}
                                      placeholder="Select a category"
                                      allowNone={false}
                                      noneSentinel={null}
                                      className="w-full"
                                      testId="select-budget-category"
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={itemForm.control}
                                name="amount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Budget Amount</FormLabel>
                                    <FormControl>
                                      <Input {...field} type="number" step="0.01" placeholder="1000.00" data-testid="input-budget-amount" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" className="w-full" disabled={addItemMutation.isPending} data-testid="button-submit-budget-item">
                                Add Budget Item
                              </Button>
                            </form>
                          </Form>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>

                  {budgetItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No budget items yet. Add categories and amounts to start tracking.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {vsActual.map((item) => {
                        const isOverBudget = item.percentUsed > 100;
                        return (
                          <div key={item.categoryId} className="space-y-2" data-testid={`budget-item-${item.categoryId}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{item.categoryName}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground">
                                  ${parseFloat(item.actual).toFixed(2)} / ${parseFloat(item.budgeted).toFixed(2)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const budgetItem = budgetItems.find(bi => bi.categoryId === item.categoryId);
                                    if (budgetItem) deleteItemMutation.mutate(budgetItem.id);
                                  }}
                                  disabled={deleteItemMutation.isPending}
                                  data-testid={`button-delete-item-${item.categoryId}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <Progress value={Math.min(item.percentUsed, 100)} className={isOverBudget ? 'bg-red-200' : ''} />
                            <div className="flex items-center justify-between text-sm">
                              <span className={isOverBudget ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                                {item.percentUsed}% used
                              </span>
                              {parseFloat(item.difference) < 0 ? (
                                <span className="text-red-600 font-semibold">
                                  ${Math.abs(parseFloat(item.difference)).toFixed(2)} over budget
                                </span>
                              ) : (
                                <span className="text-green-600">
                                  ${parseFloat(item.difference).toFixed(2)} remaining
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={deleteBudgetId !== null} onOpenChange={(open) => !open && setDeleteBudgetId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this budget? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteBudgetMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteBudgetMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
