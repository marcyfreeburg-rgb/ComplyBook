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
import { Plus, TrendingUp, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertBudgetSchema, insertBudgetItemSchema, type Budget, type BudgetItem, type Category } from "@shared/schema";
import { Progress } from "@/components/ui/progress";

export default function Budgets() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

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
      setIsCreateBudgetOpen(false);
      toast({ title: "Budget created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create budget", variant: "destructive" });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (budgetId: number) =>
      apiRequest('DELETE', `/api/budgets/${budgetId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", organizationId] });
      setSelectedBudgetId(null);
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

  const onCreateBudget = (data: z.infer<typeof budgetFormSchema>) => {
    // insertBudgetSchema uses z.coerce.date() so it can accept Date objects
    createBudgetMutation.mutate(data as any);
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
        <Dialog open={isCreateBudgetOpen} onOpenChange={setIsCreateBudgetOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-budget">
              <Plus className="w-4 h-4 mr-2" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>
                Set up a budget period to track your spending
              </DialogDescription>
            </DialogHeader>
            <Form {...budgetForm}>
              <form onSubmit={budgetForm.handleSubmit(onCreateBudget)} className="space-y-4">
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
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
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
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-budget-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createBudgetMutation.isPending} data-testid="button-submit-budget">
                  Create Budget
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
            {budgets.map((budget) => (
              <Card
                key={budget.id}
                className={`cursor-pointer hover-elevate ${selectedBudgetId === budget.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedBudgetId(budget.id)}
                data-testid={`card-budget-${budget.id}`}
              >
                <CardHeader>
                  <CardTitle className="text-base">{budget.name}</CardTitle>
                  <CardDescription>
                    {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} • 
                    {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {selectedBudget && (
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>{selectedBudget.name}</CardTitle>
                    <CardDescription>Budget Details & Performance</CardDescription>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteBudgetMutation.mutate(selectedBudget.id)}
                    disabled={deleteBudgetMutation.isPending}
                    data-testid="button-delete-budget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Budget Items</h3>
                    <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
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
                        <Form {...itemForm}>
                          <form onSubmit={itemForm.handleSubmit(onAddItem)} className="space-y-4">
                            <FormField
                              control={itemForm.control}
                              name="categoryId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value?.toString()}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-budget-category">
                                        <SelectValue placeholder="Select a category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id.toString()}>
                                          {category.name} ({category.type})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
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
    </div>
  );
}
