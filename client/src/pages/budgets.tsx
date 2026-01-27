import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, TrendingUp, Trash2, ArrowLeft, Edit, Download, FileText, PieChart as PieChartIcon } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertBudgetSchema, insertBudgetItemSchema, insertBudgetIncomeItemSchema, type Budget, type BudgetItem, type BudgetIncomeItem, type Category, type Grant, type Organization, type Bill, type RecurringTransaction } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { CategoryCombobox } from "@/components/category-combobox";
import { BudgetSuggestionPanel } from "@/components/budget-suggestion";
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
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const EXPENSE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

const INCOME_COLORS = [
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
];

export default function Budgets() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteBudgetId, setDeleteBudgetId] = useState<number | null>(null);
  const [showBudgetSuggestions, setShowBudgetSuggestions] = useState(false);

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

  const { data: organizations = [] } = useQuery<Array<Organization & { userRole: string }>>({
    queryKey: ['/api/organizations'],
  });
  
  const currentOrganization = organizations.find(o => o.id === organizationId);
  const isNonprofit = currentOrganization?.type === 'nonprofit';

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ["/api/bills", organizationId],
    enabled: organizationId > 0,
  });

  const { data: recurringTransactions = [] } = useQuery<RecurringTransaction[]>({
    queryKey: ["/api/recurring-transactions", organizationId],
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

  const { data: incomeItems = [] } = useQuery<BudgetIncomeItem[]>({
    queryKey: ["/api/budgets", selectedBudgetId, "income-items"],
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

  const addIncomeMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('POST', `/api/budgets/${selectedBudgetId}/income-items`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", selectedBudgetId, "income-items"] });
      setIsAddIncomeOpen(false);
      incomeForm.reset({
        sourceName: "",
        amount: "",
        notes: "",
      });
      toast({ title: "Income source added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add income source", variant: "destructive" });
    },
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: (itemId: number) =>
      apiRequest('DELETE', `/api/budget-income-items/${itemId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", selectedBudgetId, "income-items"] });
      toast({ title: "Income source deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete income source", variant: "destructive" });
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
    additionalFunds: z.string().optional(),
    additionalFundsDescription: z.string().optional(),
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
      additionalFunds: "",
      additionalFundsDescription: "",
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

  const incomeFormSchema = z.object({
    sourceName: z.string().min(1, "Source name is required"),
    amount: z.string().min(1, "Amount is required"),
    notes: z.string().optional(),
  });

  const incomeForm = useForm<z.infer<typeof incomeFormSchema>>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      sourceName: "",
      amount: "",
      notes: "",
    },
  });

  const onAddIncome = (data: z.infer<typeof incomeFormSchema>) => {
    if (!selectedBudgetId) return;
    addIncomeMutation.mutate(data);
  };

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
      additionalFunds: "",
      additionalFundsDescription: "",
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
      additionalFunds: budget.additionalFunds || "",
      additionalFundsDescription: budget.additionalFundsDescription || "",
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

  // Calculate suggested budget items from bills and recurring transactions for the selected date range
  const getBudgetSuggestionsForDateRange = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    
    // Track uncategorized bill expenses
    let uncategorizedBillExpenses = 0;
    const billSources: string[] = [];
    
    // Add bills that fall within the date range or are recurring
    bills.forEach(bill => {
      const dueDate = new Date(bill.dueDate);
      const isInRange = dueDate >= start && dueDate <= end;
      const isRecurring = bill.isRecurring && bill.recurringFrequency;
      
      if (isInRange || isRecurring) {
        // Calculate amount based on frequency
        let multiplier = 1;
        if (isRecurring && bill.recurringFrequency) {
          if (bill.recurringFrequency === 'monthly') multiplier = months;
          else if (bill.recurringFrequency === 'quarterly') multiplier = Math.ceil(months / 3);
          else if (bill.recurringFrequency === 'yearly') multiplier = months >= 12 ? 1 : 0;
          else if (bill.recurringFrequency === 'weekly') multiplier = months * 4;
        }
        
        const billAmount = Number(bill.totalAmount) * multiplier;
        uncategorizedBillExpenses += billAmount;
        billSources.push(`Bill #${bill.billNumber}`);
      }
    });
    
    // Group expense suggestions by category from recurring transactions
    const expenseSuggestions: Map<number, { categoryId: number; categoryName: string; amount: number; sources: string[] }> = new Map();
    
    // Add recurring expense transactions
    recurringTransactions.filter(rt => rt.type === 'expense' && rt.categoryId).forEach(rt => {
      const category = categories.find(c => c.id === rt.categoryId);
      const existing = expenseSuggestions.get(rt.categoryId!) || {
        categoryId: rt.categoryId!,
        categoryName: category?.name || 'Unknown',
        amount: 0,
        sources: []
      };
      
      let multiplier = 1;
      if (rt.frequency === 'monthly') multiplier = months;
      else if (rt.frequency === 'quarterly') multiplier = Math.ceil(months / 3);
      else if (rt.frequency === 'yearly') multiplier = months >= 12 ? 1 : 0;
      else if (rt.frequency === 'weekly') multiplier = months * 4;
      
      const amount = Number(rt.amount) * multiplier;
      existing.amount += amount;
      existing.sources.push(rt.description || 'Recurring expense');
      expenseSuggestions.set(rt.categoryId!, existing);
    });
    
    // If we have uncategorized bill expenses, add them as a separate entry
    if (uncategorizedBillExpenses > 0) {
      expenseSuggestions.set(-1, {
        categoryId: -1,
        categoryName: 'Bills',
        amount: uncategorizedBillExpenses,
        sources: billSources.slice(0, 3)
      });
    }
    
    // Calculate income suggestions from recurring income
    const incomeSuggestions: Array<{ sourceName: string; amount: number; frequency: string }> = [];
    
    recurringTransactions.filter(rt => rt.type === 'income').forEach(rt => {
      let multiplier = 1;
      if (rt.frequency === 'monthly') multiplier = months;
      else if (rt.frequency === 'quarterly') multiplier = Math.ceil(months / 3);
      else if (rt.frequency === 'yearly') multiplier = months >= 12 ? 1 : 0;
      else if (rt.frequency === 'weekly') multiplier = months * 4;
      
      const amount = Number(rt.amount) * multiplier;
      incomeSuggestions.push({
        sourceName: rt.description || 'Recurring income',
        amount,
        frequency: rt.frequency
      });
    });
    
    return {
      expenses: Array.from(expenseSuggestions.values()),
      income: incomeSuggestions,
      totalExpenses: Array.from(expenseSuggestions.values()).reduce((sum, e) => sum + e.amount, 0),
      totalIncome: incomeSuggestions.reduce((sum, i) => sum + i.amount, 0)
    };
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

  // Export budget to CSV for grant applications
  const handleExportCSV = () => {
    if (!selectedBudget || vsActual.length === 0) return;
    
    const linkedGrant = selectedBudget.grantId ? grants.find(g => g.id === selectedBudget.grantId) : null;
    const grantAmount = linkedGrant ? Number(linkedGrant.amount) : 0;
    const additionalFunds = selectedBudget.additionalFunds ? Number(selectedBudget.additionalFunds) : 0;
    const incomeTotal = incomeItems.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalFunding = grantAmount + additionalFunds + incomeTotal;
    const totalBudgeted = vsActual.reduce((sum, item) => sum + parseFloat(item.budgeted || "0"), 0);
    const totalSpent = vsActual.reduce((sum, item) => sum + parseFloat(item.actual || "0"), 0);
    
    let csv = "Budget Export for Grant Application\n";
    csv += `Budget Name,${selectedBudget.name}\n`;
    csv += `Period,${new Date(selectedBudget.startDate).toLocaleDateString()} - ${new Date(selectedBudget.endDate).toLocaleDateString()}\n`;
    if (isNonprofit && linkedGrant) {
      csv += `Linked Grant,${linkedGrant.name}\n`;
      csv += `Grant Amount,$${grantAmount.toFixed(2)}\n`;
    }
    if (additionalFunds > 0) {
      csv += `Additional Funds,$${additionalFunds.toFixed(2)}\n`;
      if (selectedBudget.additionalFundsDescription) {
        csv += `Additional Funds Source,"${selectedBudget.additionalFundsDescription}"\n`;
      }
    }
    if (incomeItems.length > 0) {
      csv += `\nIncome Sources\n`;
      csv += `Source,Amount,Notes\n`;
      incomeItems.forEach(item => {
        csv += `"${item.sourceName}",$${Number(item.amount).toFixed(2)},"${item.notes || ''}"\n`;
      });
      csv += `Income Subtotal,$${incomeTotal.toFixed(2)}\n\n`;
    }
    csv += `Total Funding,$${totalFunding.toFixed(2)}\n\n`;
    csv += "Budget Line Items\n";
    csv += "Category,Budgeted Amount,Actual Spent,Remaining,% Used\n";
    
    vsActual.forEach(item => {
      const budgeted = parseFloat(item.budgeted);
      const actual = parseFloat(item.actual);
      const remaining = budgeted - actual;
      csv += `"${item.categoryName}",$${budgeted.toFixed(2)},$${actual.toFixed(2)},$${remaining.toFixed(2)},${item.percentUsed}%\n`;
    });
    
    csv += `\nTotals,$${totalBudgeted.toFixed(2)},$${totalSpent.toFixed(2)},$${(totalBudgeted - totalSpent).toFixed(2)},${totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(1) : 0}%\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedBudget.name.replace(/[^a-z0-9]/gi, '_')}_budget_export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({ title: "Budget exported successfully" });
  };

  // Export budget to PDF-style format for grant applications
  const handleExportPDF = async () => {
    if (!selectedBudget || vsActual.length === 0) return;
    
    const linkedGrant = selectedBudget.grantId ? grants.find(g => g.id === selectedBudget.grantId) : null;
    const grantAmount = linkedGrant ? Number(linkedGrant.amount) : 0;
    const additionalFunds = selectedBudget.additionalFunds ? Number(selectedBudget.additionalFunds) : 0;
    const incomeTotal = incomeItems.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalFunding = grantAmount + additionalFunds + incomeTotal;
    const totalBudgeted = vsActual.reduce((sum, item) => sum + parseFloat(item.budgeted || "0"), 0);
    const totalSpent = vsActual.reduce((sum, item) => sum + parseFloat(item.actual || "0"), 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Budget Export - ${selectedBudget.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px; }
          h2 { color: #4a4a4a; margin-top: 30px; }
          .summary { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 12px; color: #666; }
          .summary-value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
          th { background: #f5f5f5; font-weight: 600; }
          .amount { text-align: right; }
          .total-row { font-weight: bold; background: #f9f9f9; }
          .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Budget Export</h1>
        <h2>${selectedBudget.name}</h2>
        <p>Period: ${new Date(selectedBudget.startDate).toLocaleDateString()} - ${new Date(selectedBudget.endDate).toLocaleDateString()}</p>
        ${isNonprofit && linkedGrant ? `<p>Linked Grant: ${linkedGrant.name}</p>` : ''}
        
        <div class="summary">
          <div class="summary-grid">
            ${isNonprofit && linkedGrant ? `
              <div class="summary-item">
                <div class="summary-label">Grant Amount</div>
                <div class="summary-value">$${grantAmount.toLocaleString()}</div>
              </div>
            ` : ''}
            ${additionalFunds > 0 ? `
              <div class="summary-item">
                <div class="summary-label">Additional Funds</div>
                <div class="summary-value">$${additionalFunds.toLocaleString()}</div>
              </div>
            ` : ''}
            ${incomeTotal > 0 ? `
              <div class="summary-item">
                <div class="summary-label">Income Sources</div>
                <div class="summary-value">$${incomeTotal.toLocaleString()}</div>
              </div>
            ` : ''}
            <div class="summary-item">
              <div class="summary-label">Total Funding</div>
              <div class="summary-value">$${totalFunding.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Budgeted</div>
              <div class="summary-value">$${totalBudgeted.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Spent</div>
              <div class="summary-value">$${totalSpent.toLocaleString()}</div>
            </div>
          </div>
        </div>
        
        ${selectedBudget.additionalFundsDescription ? `
          <p><strong>Additional Funds Source:</strong> ${selectedBudget.additionalFundsDescription}</p>
        ` : ''}
        
        ${incomeItems.length > 0 ? `
          <h2>Income Sources</h2>
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th class="amount">Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${incomeItems.map(item => `
                <tr>
                  <td>${item.sourceName}</td>
                  <td class="amount">$${Number(item.amount).toLocaleString()}</td>
                  <td>${item.notes || ''}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td>Total Income</td>
                <td class="amount">$${incomeTotal.toLocaleString()}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        ` : ''}
        
        <h2>Budget Line Items</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th class="amount">Budgeted</th>
              <th class="amount">Spent</th>
              <th class="amount">Remaining</th>
              <th class="amount">% Used</th>
            </tr>
          </thead>
          <tbody>
            ${vsActual.map(item => {
              const budgeted = parseFloat(item.budgeted);
              const actual = parseFloat(item.actual);
              const remaining = budgeted - actual;
              return `
                <tr>
                  <td>${item.categoryName}</td>
                  <td class="amount">$${budgeted.toLocaleString()}</td>
                  <td class="amount">$${actual.toLocaleString()}</td>
                  <td class="amount">$${remaining.toLocaleString()}</td>
                  <td class="amount">${item.percentUsed}%</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td>Total</td>
              <td class="amount">$${totalBudgeted.toLocaleString()}</td>
              <td class="amount">$${totalSpent.toLocaleString()}</td>
              <td class="amount">$${(totalBudgeted - totalSpent).toLocaleString()}</td>
              <td class="amount">${totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(1) : 0}%</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} | ComplyBook Budget Export</p>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
    
    toast({ title: "Budget export opened for printing" });
  };

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
                {isNonprofit && (
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
                            {grants.filter(g => g.status === 'pending').length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Pending Grants</div>
                                {grants.filter(g => g.status === 'pending').map((grant) => (
                                  <SelectItem key={grant.id} value={String(grant.id)}>
                                    {grant.name} (${Number(grant.amount).toLocaleString()})
                                  </SelectItem>
                                ))}
                              </>
                            )}
                            {grants.filter(g => g.status === 'active').length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Active Grants</div>
                                {grants.filter(g => g.status === 'active').map((grant) => (
                                  <SelectItem key={grant.id} value={String(grant.id)}>
                                    {grant.name} (${Number(grant.amount).toLocaleString()})
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Linking to a grant will prefill dates and track spending against the grant amount
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
                
                {/* Budget Suggestions from Bills/Recurring - Show for all orgs */}
                {!editingBudget && budgetForm.watch("startDate") && budgetForm.watch("endDate") && (
                  (() => {
                    const suggestions = getBudgetSuggestionsForDateRange(
                      budgetForm.watch("startDate"),
                      budgetForm.watch("endDate")
                    );
                    const hasSuggestions = suggestions.expenses.length > 0 || suggestions.income.length > 0;
                    
                    if (!hasSuggestions) return null;
                    
                    return (
                      <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Budget Suggestions</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowBudgetSuggestions(!showBudgetSuggestions)}
                            data-testid="button-toggle-budget-suggestions"
                          >
                            {showBudgetSuggestions ? 'Hide' : 'Show'} Details
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Based on your bills and recurring transactions, we suggest:
                        </p>
                        <div className="flex gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Est. Expenses:</span>{' '}
                            <span className="font-medium text-destructive">${suggestions.totalExpenses.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Est. Income:</span>{' '}
                            <span className="font-medium text-green-600">${suggestions.totalIncome.toLocaleString()}</span>
                          </div>
                        </div>
                        
                        {showBudgetSuggestions && (
                          <div className="space-y-2 text-xs border-t pt-2 mt-2">
                            {suggestions.expenses.length > 0 && (
                              <div>
                                <p className="font-medium mb-1">Expense Categories:</p>
                                <ul className="space-y-1 pl-2">
                                  {suggestions.expenses.slice(0, 5).map((exp) => (
                                    <li key={exp.categoryId} className="flex justify-between">
                                      <span>{exp.categoryName}</span>
                                      <span className="text-muted-foreground">${exp.amount.toLocaleString()}</span>
                                    </li>
                                  ))}
                                  {suggestions.expenses.length > 5 && (
                                    <li className="text-muted-foreground">+{suggestions.expenses.length - 5} more categories</li>
                                  )}
                                </ul>
                              </div>
                            )}
                            {suggestions.income.length > 0 && (
                              <div>
                                <p className="font-medium mb-1">Income Sources:</p>
                                <ul className="space-y-1 pl-2">
                                  {suggestions.income.slice(0, 3).map((inc, idx) => (
                                    <li key={idx} className="flex justify-between">
                                      <span>{inc.sourceName}</span>
                                      <span className="text-muted-foreground">${inc.amount.toLocaleString()}</span>
                                    </li>
                                  ))}
                                  {suggestions.income.length > 3 && (
                                    <li className="text-muted-foreground">+{suggestions.income.length - 3} more sources</li>
                                  )}
                                </ul>
                              </div>
                            )}
                            <p className="text-muted-foreground italic pt-1">
                              These items will be available to add after creating the budget.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
                
                {isNonprofit && budgetForm.watch("grantId") && (
                  <>
                    <FormField
                      control={budgetForm.control}
                      name="additionalFunds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Funds (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              data-testid="input-additional-funds" 
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Add matching funds, cost share, or other funding sources
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={budgetForm.control}
                      name="additionalFundsDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Funds Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="E.g., Matching funds from sponsor, in-kind contributions..."
                              className="resize-none"
                              rows={2}
                              data-testid="input-additional-funds-description" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
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

      {/* AI Budget Suggestions */}
      <BudgetSuggestionPanel organizationId={organizationId} budgets={budgets} />

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
                    {isNonprofit && linkedGrant && (
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
              {isNonprofit && selectedBudget.grantId && (() => {
                const linkedGrant = grants.find(g => g.id === selectedBudget.grantId);
                const totalBudgeted = vsActual.reduce((sum, item) => sum + parseFloat(item.budgeted || "0"), 0);
                const totalSpent = vsActual.reduce((sum, item) => sum + parseFloat(item.actual || "0"), 0);
                const grantAmount = linkedGrant ? Number(linkedGrant.amount) : 0;
                const additionalFunds = selectedBudget.additionalFunds ? Number(selectedBudget.additionalFunds) : 0;
                const incomeTotal = incomeItems.reduce((sum, item) => sum + Number(item.amount), 0);
                const totalFunding = grantAmount + additionalFunds + incomeTotal;
                const remainingFunds = totalFunding - totalSpent;
                
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
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Grant Amount</p>
                          <p className="text-xl font-semibold text-primary" data-testid="text-grant-amount">
                            ${grantAmount.toLocaleString()}
                          </p>
                        </div>
                        {additionalFunds > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground">Additional Funds</p>
                            <p className="text-xl font-semibold text-blue-600" data-testid="text-additional-funds">
                              +${additionalFunds.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {incomeTotal > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground">Income Sources</p>
                            <p className="text-xl font-semibold text-green-600" data-testid="text-income-total">
                              +${incomeTotal.toLocaleString()}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Total Funding</p>
                          <p className="text-xl font-semibold" data-testid="text-total-funding">
                            ${totalFunding.toLocaleString()}
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
                          <p className="text-sm text-muted-foreground">Funds Remaining</p>
                          <p className={`text-xl font-semibold ${remainingFunds < 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="text-grant-remaining">
                            ${remainingFunds.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {selectedBudget.additionalFundsDescription && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                          <p className="text-sm font-medium">Additional Funds Source</p>
                          <p className="text-sm text-muted-foreground">{selectedBudget.additionalFundsDescription}</p>
                        </div>
                      )}
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
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle>{selectedBudget.name}</CardTitle>
                    <CardDescription>Budget Details & Performance</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleExportCSV}
                      disabled={vsActual.length === 0}
                      data-testid="button-export-csv"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleExportPDF}
                      disabled={vsActual.length === 0}
                      data-testid="button-export-pdf"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Print/PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Budget Visualization - Pie Charts */}
                  {(budgetItems.length > 0 || incomeItems.length > 0) && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <PieChartIcon className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Budget Breakdown</h3>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Expected Expenses Pie Chart */}
                        {budgetItems.length > 0 && (
                          <Card className="border-red-200 dark:border-red-800" data-testid="card-expenses-chart">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">Expected Expenses</CardTitle>
                              <CardDescription data-testid="text-expenses-total">
                                Total: ${budgetItems.reduce((sum, item) => sum + parseFloat(item.amount), 0).toLocaleString()}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="h-64" data-testid="chart-expenses-pie">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={budgetItems.map((item, index) => ({
                                        name: item.categoryName,
                                        value: parseFloat(item.amount),
                                        color: EXPENSE_COLORS[index % EXPENSE_COLORS.length],
                                      }))}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={40}
                                      outerRadius={80}
                                      paddingAngle={2}
                                      dataKey="value"
                                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                      labelLine={false}
                                    >
                                      {budgetItems.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <Tooltip 
                                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {budgetItems.map((item, index) => (
                                  <div key={item.categoryId} className="flex items-center gap-1.5 text-xs">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }}
                                    />
                                    <span>{item.categoryName}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* Expected Income Pie Chart */}
                        {incomeItems.length > 0 && (
                          <Card className="border-green-200 dark:border-green-800" data-testid="card-income-chart">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">Expected Income</CardTitle>
                              <CardDescription data-testid="text-income-total">
                                Total: ${incomeItems.reduce((sum, item) => sum + Number(item.amount), 0).toLocaleString()}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="h-64" data-testid="chart-income-pie">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={incomeItems.map((item, index) => ({
                                        name: item.sourceName,
                                        value: Number(item.amount),
                                        color: INCOME_COLORS[index % INCOME_COLORS.length],
                                      }))}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={40}
                                      outerRadius={80}
                                      paddingAngle={2}
                                      dataKey="value"
                                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                      labelLine={false}
                                    >
                                      {incomeItems.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <Tooltip 
                                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {incomeItems.map((item, index) => (
                                  <div key={item.id} className="flex items-center gap-1.5 text-xs">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: INCOME_COLORS[index % INCOME_COLORS.length] }}
                                    />
                                    <span>{item.sourceName}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                      
                      {/* Summary Card */}
                      <Card className="mt-4 bg-muted/50" data-testid="card-budget-summary">
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-sm text-muted-foreground">Expected Income</p>
                              <p className="text-xl font-bold text-green-600" data-testid="text-summary-income">
                                ${incomeItems.reduce((sum, item) => sum + Number(item.amount), 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Expected Expenses</p>
                              <p className="text-xl font-bold text-red-600" data-testid="text-summary-expenses">
                                ${budgetItems.reduce((sum, item) => sum + parseFloat(item.amount), 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Net Balance</p>
                              <p className={`text-xl font-bold ${
                                incomeItems.reduce((sum, item) => sum + Number(item.amount), 0) - 
                                budgetItems.reduce((sum, item) => sum + parseFloat(item.amount), 0) >= 0 
                                  ? 'text-green-600' : 'text-red-600'
                              }`} data-testid="text-summary-net-balance">
                                ${(incomeItems.reduce((sum, item) => sum + Number(item.amount), 0) - 
                                   budgetItems.reduce((sum, item) => sum + parseFloat(item.amount), 0)).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  
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

                  {/* Income Sources Section */}
                  <div className="mt-8 pt-6 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Income Sources</h3>
                      <Dialog open={isAddIncomeOpen} onOpenChange={(open) => {
                        if (open) {
                          incomeForm.reset({
                            sourceName: "",
                            amount: "",
                            notes: "",
                          });
                        }
                        setIsAddIncomeOpen(open);
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" data-testid="button-add-income">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Income
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Income Source</DialogTitle>
                            <DialogDescription>
                              Add additional funding sources for this budget (matching funds, cost share, donations, etc.)
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...incomeForm}>
                            <form onSubmit={incomeForm.handleSubmit(onAddIncome)} className="space-y-4">
                              <FormField
                                control={incomeForm.control}
                                name="sourceName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Source Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="e.g., Matching Funds, Corporate Donation" data-testid="input-income-source" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={incomeForm.control}
                                name="amount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Amount</FormLabel>
                                    <FormControl>
                                      <Input {...field} type="number" step="0.01" placeholder="5000.00" data-testid="input-income-amount" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={incomeForm.control}
                                name="notes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} placeholder="Additional details about this funding source" data-testid="input-income-notes" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" className="w-full" disabled={addIncomeMutation.isPending} data-testid="button-submit-income">
                                Add Income Source
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {incomeItems.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        No income sources added. Add additional funding to track total project resources.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {incomeItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-md" data-testid={`income-item-${item.id}`}>
                            <div>
                              <p className="font-medium">{item.sourceName}</p>
                              {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-lg font-semibold text-green-600">
                                +${Number(item.amount).toLocaleString()}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteIncomeMutation.mutate(item.id)}
                                disabled={deleteIncomeMutation.isPending}
                                data-testid={`button-delete-income-${item.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-end pt-2 border-t">
                          <span className="text-lg font-semibold">
                            Total Income: ${incomeItems.reduce((sum, item) => sum + Number(item.amount), 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
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
