import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, TrendingUp, Trash2, ArrowLeft, Edit, Download, FileText, PieChart as PieChartIcon, AlertTriangle, CheckCircle, Clock, Target, Flame, Lock, Info, TrendingDown, Upload, Loader2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertBudgetSchema, insertBudgetItemSchema, insertBudgetIncomeItemSchema, type Budget, type BudgetItem, type BudgetIncomeItem, type Category, type Grant, type Organization, type Bill, type RecurringTransaction, type Document as DocumentType } from "@shared/schema";
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

type BudgetStatus = 'on_track' | 'at_risk' | 'over_budget';
type TimeStatus = 'ahead' | 'on_schedule' | 'behind' | 'over_accelerating';

function getBudgetStatus(percentUsed: number): { status: BudgetStatus; label: string; color: string; icon: typeof CheckCircle } {
  if (percentUsed > 100) {
    return { status: 'over_budget', label: 'Over Budget', color: 'text-red-600 bg-red-100 dark:bg-red-900/30', icon: AlertTriangle };
  } else if (percentUsed >= 75) {
    return { status: 'at_risk', label: 'At Risk', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30', icon: AlertTriangle };
  }
  return { status: 'on_track', label: 'On Track', color: 'text-green-600 bg-green-100 dark:bg-green-900/30', icon: CheckCircle };
}

function getTimeStatus(
  startDate: Date,
  endDate: Date,
  budgeted: number,
  actual: number
): { status: TimeStatus; expectedSpend: number; label: string; color: string } {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (now < start) {
    return { status: 'ahead', expectedSpend: 0, label: 'Not started', color: 'text-muted-foreground' };
  }
  
  if (now > end) {
    return { status: actual > budgeted ? 'over_accelerating' : 'on_schedule', expectedSpend: budgeted, label: 'Period ended', color: 'text-muted-foreground' };
  }
  
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const percentTimeElapsed = elapsedDays / totalDays;
  const expectedSpend = budgeted * percentTimeElapsed;
  
  const spendRatio = actual / Math.max(expectedSpend, 0.01);
  
  if (spendRatio > 1.25) {
    // Spending much faster than expected - dangerous
    return { status: 'over_accelerating', expectedSpend, label: 'Spending too fast', color: 'text-red-600' };
  } else if (spendRatio > 1) {
    // Spending slightly ahead of expected pace
    return { status: 'behind', expectedSpend, label: 'Slightly ahead of pace', color: 'text-yellow-600' };
  } else if (spendRatio >= 0.75) {
    // Spending roughly on track with time elapsed
    return { status: 'on_schedule', expectedSpend, label: 'On track', color: 'text-green-600' };
  }
  // Spending less than expected - good for budget, might indicate under-utilization
  return { status: 'ahead', expectedSpend, label: 'Under budget pace', color: 'text-blue-600' };
}

function calculateBurnRate(
  startDate: Date,
  endDate: Date,
  totalSpent: number
): { dailyBurnRate: number; projectedEndSpend: number; daysRemaining: number } {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const elapsedDays = Math.max(1, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const dailyBurnRate = totalSpent / elapsedDays;
  const projectedEndSpend = totalSpent + (dailyBurnRate * remainingDays);
  
  return { dailyBurnRate, projectedEndSpend, daysRemaining: Math.ceil(remainingDays) };
}

export default function Budgets() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [budgetSearchQuery, setBudgetSearchQuery] = useState("");
  const [drillDownCategory, setDrillDownCategory] = useState<{ categoryId: number; categoryName: string } | null>(null);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteBudgetId, setDeleteBudgetId] = useState<number | null>(null);
  const [showBudgetSuggestions, setShowBudgetSuggestions] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);

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

  // Budget & Audit documents
  const { data: budgetDocuments = [], isLoading: isLoadingDocs } = useQuery<DocumentType[]>({
    queryKey: ['/api/documents', 'budget', organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/budget/${organizationId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: organizationId > 0,
  });

  const uploadBudgetDocument = async (file: File, category: string) => {
    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'budget');
      formData.append('entityId', organizationId.toString());
      formData.append('category', category);
      formData.append('name', file.name);
      
      // Get CSRF token from cookie for file upload
      const csrfToken = document.cookie.split(';').find(c => c.trim().startsWith('csrf_token='))?.split('=')[1];
      
      const response = await fetch('/api/documents/upload-file', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload document');
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/documents', 'budget', organizationId] });
      toast({ title: "Document uploaded", description: `${category === 'audits' ? 'Audit' : 'Budget'} document uploaded successfully` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message || "Failed to upload document", variant: "destructive" });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const deleteBudgetDocumentMutation = useMutation({
    mutationFn: async (docId: number) => {
      await apiRequest('DELETE', `/api/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents', 'budget', organizationId] });
      toast({ title: "Document deleted" });
      setDeleteDocId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete document", variant: "destructive" });
    }
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
        notes: "",
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

  const toggleLockMutation = useMutation({
    mutationFn: ({ id, isLocked }: { id: number; isLocked: boolean }) =>
      apiRequest('PATCH', `/api/budget-items/${id}`, { isLocked }),
    onSuccess: (_, { isLocked }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets", selectedBudgetId, "items"] });
      toast({ title: isLocked ? "Budget item locked" : "Budget item unlocked" });
    },
    onError: () => {
      toast({ title: "Failed to update lock status", variant: "destructive" });
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
    departmentName: z.string().optional().nullable(),
    alertAt50: z.boolean().optional(),
    alertAt75: z.boolean().optional(),
    alertAt90: z.boolean().optional(),
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
      departmentName: "",
      alertAt50: false,
      alertAt75: true,
      alertAt90: true,
    },
  });

  const itemFormSchema = z.object({
    budgetId: z.number(),
    categoryId: z.number().min(1, "Category is required"),
    amount: z.string().min(1, "Amount is required"),
    notes: z.string().optional(),
  });

  const itemForm = useForm<z.infer<typeof itemFormSchema>>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      budgetId: selectedBudgetId || 0,
      categoryId: 0,
      amount: "",
      notes: "",
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
        
        <h2>Budget Line Items with Variance Analysis</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th class="amount">Planned</th>
              <th class="amount">Actual</th>
              <th class="amount">Variance $</th>
              <th class="amount">Variance %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${vsActual.map(item => {
              const budgeted = parseFloat(item.budgeted);
              const actual = parseFloat(item.actual);
              const variance = budgeted - actual;
              const variancePercent = budgeted > 0 ? ((variance / budgeted) * 100) : 0;
              const status = item.percentUsed > 100 ? 'Over Budget' : item.percentUsed >= 75 ? 'At Risk' : 'On Track';
              const statusColor = item.percentUsed > 100 ? '#dc2626' : item.percentUsed >= 75 ? '#ca8a04' : '#16a34a';
              const varianceColor = variance < 0 ? '#dc2626' : '#16a34a';
              const varianceSign = variance >= 0 ? '+' : '';
              const variancePercentColor = variancePercent < 0 ? '#dc2626' : '#16a34a';
              const variancePercentSign = variancePercent >= 0 ? '+' : '';
              return '<tr>' +
                '<td>' + item.categoryName + '</td>' +
                '<td class="amount">$' + budgeted.toLocaleString() + '</td>' +
                '<td class="amount">$' + actual.toLocaleString() + '</td>' +
                '<td class="amount" style="color: ' + varianceColor + '">' + varianceSign + variance.toLocaleString() + '</td>' +
                '<td class="amount" style="color: ' + variancePercentColor + '">' + variancePercentSign + variancePercent.toFixed(1) + '%</td>' +
                '<td style="color: ' + statusColor + '; font-weight: 500;">' + status + '</td>' +
                '</tr>';
            }).join('')}
            <tr class="total-row">
              <td>Total</td>
              <td class="amount">$${totalBudgeted.toLocaleString()}</td>
              <td class="amount">$${totalSpent.toLocaleString()}</td>
              <td class="amount" style="color: ${(totalBudgeted - totalSpent) < 0 ? '#dc2626' : '#16a34a'}">${(totalBudgeted - totalSpent) >= 0 ? '+' : ''}$${(totalBudgeted - totalSpent).toLocaleString()}</td>
              <td class="amount">${totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(1) : 0}%</td>
              <td></td>
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
                
                {/* Budget Assignment - Department (applies to all org types) */}
                <FormField
                  control={budgetForm.control}
                  name="departmentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Department (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ''}
                          placeholder="e.g., Marketing, Operations, HR"
                          data-testid="input-budget-department"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Link this budget to a specific department for easier tracking
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
                
                {/* Budget Alerts Configuration */}
                <div className="p-3 border rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium">Budget Alerts</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get notified before you overspend. Alerts will appear on your dashboard.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={budgetForm.control}
                      name="alertAt50"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-alert-50"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">Alert at 50%</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={budgetForm.control}
                      name="alertAt75"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-alert-75"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">Alert at 75%</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={budgetForm.control}
                      name="alertAt90"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-alert-90"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">Alert at 90%</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
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
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-xl font-semibold">Your Budgets</h2>
              <Input 
                placeholder="Search budgets..." 
                value={budgetSearchQuery}
                onChange={(e) => setBudgetSearchQuery(e.target.value)}
                className="max-w-[200px] h-8"
                data-testid="input-search-budgets"
              />
            </div>
            {budgets.filter(budget => {
              if (!budgetSearchQuery.trim()) return true;
              const query = budgetSearchQuery.toLowerCase();
              return budget.name.toLowerCase().includes(query) ||
                     budget.departmentName?.toLowerCase().includes(query) ||
                     budget.period.toLowerCase().includes(query);
            }).map((budget) => {
              const linkedGrant = budget.grantId ? grants.find(g => g.id === budget.grantId) : null;
              return (
              <Card
                key={budget.id}
                className={`hover-elevate ${selectedBudgetId === budget.id ? 'ring-2 ring-primary' : ''}`}
                data-testid={`card-budget-${budget.id}`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <div className="cursor-pointer flex-1" onClick={() => setSelectedBudgetId(budget.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{budget.name}</CardTitle>
                      {budget.departmentName && (
                        <Badge variant="outline" className="text-xs" data-testid={`badge-department-${budget.id}`}>
                          {budget.departmentName}
                        </Badge>
                      )}
                    </div>
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
              
              {/* Executive Summary Header */}
              {(() => {
                const totalBudget = budgetItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);
                const totalSpent = vsActual.reduce((sum, item) => sum + parseFloat(item.actual), 0);
                const remaining = totalBudget - totalSpent;
                const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
                const burnData = calculateBurnRate(selectedBudget.startDate, selectedBudget.endDate, totalSpent);
                const overallStatus = getBudgetStatus(percentUsed);
                const StatusIcon = overallStatus.icon;
                const forecastVariance = burnData.projectedEndSpend - totalBudget;
                
                return (
                  <Card className="mb-4" data-testid="card-executive-summary">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Budget</p>
                          <p className="text-xl font-bold" data-testid="text-exec-total-budget">
                            ${totalBudget.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Spent</p>
                          <p className="text-xl font-bold" data-testid="text-exec-total-spent">
                            ${totalSpent.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</p>
                          <p className={`text-xl font-bold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`} data-testid="text-exec-remaining">
                            ${remaining.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Days Left</p>
                          <p className="text-xl font-bold flex items-center justify-center gap-1" data-testid="text-exec-days-remaining">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {burnData.daysRemaining}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Daily Burn Rate</p>
                          <p className="text-xl font-bold flex items-center justify-center gap-1" data-testid="text-exec-burn-rate">
                            <Flame className="w-4 h-4 text-orange-500" />
                            ${burnData.dailyBurnRate.toFixed(0)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                          <Badge className={`mt-1 ${overallStatus.color}`} data-testid="badge-exec-status">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {overallStatus.label}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Forecast Alert */}
                      {totalSpent > 0 && burnData.daysRemaining > 0 && (
                        <div className={`mt-4 p-3 rounded-md ${forecastVariance > 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`} data-testid="div-forecast-alert">
                          <div className="flex items-center gap-2">
                            {forecastVariance > 0 ? (
                              <TrendingUp className="w-4 h-4 text-red-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-green-600" />
                            )}
                            <span className="text-sm font-medium">
                              {forecastVariance > 0 ? (
                                <span className="text-red-700 dark:text-red-400">
                                  At current pace, you will exceed this budget by ${Math.abs(forecastVariance).toLocaleString(undefined, {maximumFractionDigits: 0})}
                                </span>
                              ) : (
                                <span className="text-green-700 dark:text-green-400">
                                  On track to finish ${Math.abs(forecastVariance).toLocaleString(undefined, {maximumFractionDigits: 0})} under budget
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
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
                          notes: "",
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
                              <FormField
                                control={itemForm.control}
                                name="notes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        {...field} 
                                        placeholder="Add notes for auditors or team members..."
                                        className="resize-none"
                                        rows={2}
                                        data-testid="input-budget-item-notes" 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              {/* Budget Exceed Warning */}
                              {(() => {
                                const newAmount = parseFloat(itemForm.watch("amount") || "0");
                                const currentTotal = budgetItems.reduce((sum, item) => sum + Number(item.amount), 0);
                                const linkedGrant = selectedBudget?.grantId ? grants.find(g => g.id === selectedBudget.grantId) : null;
                                const grantAmount = linkedGrant ? Number(linkedGrant.amount) : 0;
                                const additionalFunds = selectedBudget?.additionalFunds ? Number(selectedBudget.additionalFunds) : 0;
                                const incomeTotal = incomeItems.reduce((sum, item) => sum + Number(item.amount), 0);
                                const totalFunding = grantAmount + additionalFunds + incomeTotal;
                                const projectedTotal = currentTotal + newAmount;
                                const wouldExceed = totalFunding > 0 && projectedTotal > totalFunding;
                                
                                if (newAmount > 0 && wouldExceed) {
                                  return (
                                    <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md" data-testid="warning-budget-exceed">
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-600" />
                                        <span className="text-sm font-medium text-red-600">Budget Warning</span>
                                      </div>
                                      <p className="text-xs text-red-600 mt-1">
                                        Adding ${newAmount.toLocaleString()} would bring total budgeted to ${projectedTotal.toLocaleString()}, 
                                        exceeding available funding of ${totalFunding.toLocaleString()} by ${(projectedTotal - totalFunding).toLocaleString()}.
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              
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
                      {/* Enhanced Budget Items with Variance & Time Awareness */}
                      {vsActual.map((item) => {
                        const budgeted = parseFloat(item.budgeted);
                        const actual = parseFloat(item.actual);
                        const variance = budgeted - actual;
                        const variancePercent = budgeted > 0 ? ((variance / budgeted) * 100) : 0;
                        const status = getBudgetStatus(item.percentUsed);
                        const StatusIcon = status.icon;
                        const timeStatus = getTimeStatus(
                          selectedBudget.startDate,
                          selectedBudget.endDate,
                          budgeted,
                          actual
                        );
                        const budgetItemData = budgetItems.find(bi => bi.categoryId === item.categoryId);
                        
                        return (
                          <Card key={item.categoryId} className="p-4" data-testid={`budget-item-${item.categoryId}`}>
                            {/* Header Row: Category, Status Badge, Actions */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {budgetItemData?.isLocked && (
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span className="font-medium text-base">{item.categoryName}</span>
                                <Badge className={`text-xs ${status.color}`} data-testid={`badge-status-${item.categoryId}`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {status.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        if (budgetItemData) {
                                          toggleLockMutation.mutate({ 
                                            id: budgetItemData.id, 
                                            isLocked: !budgetItemData.isLocked 
                                          });
                                        }
                                      }}
                                      disabled={toggleLockMutation.isPending}
                                      data-testid={`button-lock-item-${item.categoryId}`}
                                    >
                                      <Lock className={`w-4 h-4 ${budgetItemData?.isLocked ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {budgetItemData?.isLocked ? 'Unlock item (allow edits)' : 'Lock item (prevent changes)'}
                                  </TooltipContent>
                                </UITooltip>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (budgetItemData) deleteItemMutation.mutate(budgetItemData.id);
                                  }}
                                  disabled={deleteItemMutation.isPending || budgetItemData?.isLocked === true}
                                  data-testid={`button-delete-item-${item.categoryId}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Variance Table */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-sm mb-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Planned</p>
                                <p className="font-medium" data-testid={`text-planned-${item.categoryId}`}>${budgeted.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Actual</p>
                                <p className="font-medium" data-testid={`text-actual-${item.categoryId}`}>${actual.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Variance $</p>
                                <p className={`font-medium ${variance < 0 ? 'text-red-600' : 'text-green-600'}`} data-testid={`text-variance-${item.categoryId}`}>
                                  {variance >= 0 ? '+' : ''}{variance.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Variance %</p>
                                <p className={`font-medium ${variancePercent < 0 ? 'text-red-600' : 'text-green-600'}`} data-testid={`text-variance-pct-${item.categoryId}`}>
                                  {variancePercent >= 0 ? '+' : ''}{variancePercent.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Used</p>
                                <p className="font-medium" data-testid={`text-used-${item.categoryId}`}>{item.percentUsed}%</p>
                              </div>
                            </div>
                            
                            {/* Progress Bar - Clickable for drill-down */}
                            <div 
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setDrillDownCategory({ categoryId: item.categoryId, categoryName: item.categoryName })}
                              title="Click to view linked transactions"
                              data-testid={`progress-bar-${item.categoryId}`}
                            >
                              <Progress 
                                value={Math.min(item.percentUsed, 100)} 
                                className={`h-2 ${item.percentUsed > 100 ? 'bg-red-200' : item.percentUsed >= 75 ? 'bg-yellow-200' : ''}`}
                              />
                            </div>
                            
                            {/* Time Awareness Row */}
                            <div className="flex items-center justify-between mt-2 text-xs">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  Expected by now: ${timeStatus.expectedSpend.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                </span>
                              </div>
                              <span className={`font-medium ${timeStatus.color}`} data-testid={`text-time-status-${item.categoryId}`}>
                                {timeStatus.label}
                              </span>
                            </div>
                            
                            {/* Notes (if any) */}
                            {budgetItemData?.notes && (
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                {budgetItemData.notes}
                              </div>
                            )}
                          </Card>
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

      {/* Drill-Down Dialog - Shows transactions for selected category */}
      <Dialog open={drillDownCategory !== null} onOpenChange={(open) => !open && setDrillDownCategory(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Transactions: {drillDownCategory?.categoryName}
            </DialogTitle>
            <DialogDescription>
              Showing all transactions in this category during the budget period
            </DialogDescription>
          </DialogHeader>
          {drillDownCategory && selectedBudget && (
            <DrillDownTransactions 
              categoryId={drillDownCategory.categoryId}
              startDate={selectedBudget.startDate}
              endDate={selectedBudget.endDate}
              organizationId={organizationId}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Budget & Audit Documents Section */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Budget & Audit Documents
            </CardTitle>
            <CardDescription>Upload and manage budget files, audit reports, and financial documents</CardDescription>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              id="budget-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadBudgetDocument(file, 'budgets');
                e.target.value = '';
              }}
            />
            <input
              type="file"
              id="audit-upload"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadBudgetDocument(file, 'audits');
                e.target.value = '';
              }}
            />
            <Button 
              variant="outline"
              onClick={() => document.getElementById('budget-upload')?.click()}
              disabled={isUploadingDoc}
              data-testid="button-upload-budget"
            >
              {isUploadingDoc ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Budget
            </Button>
            <Button 
              onClick={() => document.getElementById('audit-upload')?.click()}
              disabled={isUploadingDoc}
              data-testid="button-upload-audit"
            >
              {isUploadingDoc ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Audit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingDocs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading documents...</span>
            </div>
          ) : budgetDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No budget or audit documents uploaded yet</p>
              <p className="text-sm">Upload budgets, audits, and financial documents here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetDocuments.map((doc) => (
                  <TableRow key={doc.id} data-testid={`row-budget-doc-${doc.id}`}>
                    <TableCell className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{doc.fileName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={doc.documentType === 'other' ? 'default' : 'secondary'}>
                        {doc.description?.includes('audit') ? 'Audit' : 'Budget'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-doc-menu-${doc.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => window.open(`/api/documents/download/${doc.id}`, '_blank')}
                            data-testid={`menu-download-doc-${doc.id}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteDocId(doc.id)}
                            data-testid={`menu-delete-doc-${doc.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Document Dialog */}
      <AlertDialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this document? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDocId && deleteBudgetDocumentMutation.mutate(deleteDocId)}
              disabled={deleteBudgetDocumentMutation.isPending}
            >
              {deleteBudgetDocumentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

// Drill-down component for showing transactions in a category
function DrillDownTransactions({ 
  categoryId, 
  startDate, 
  endDate, 
  organizationId 
}: { 
  categoryId: number; 
  startDate: Date | string; 
  endDate: Date | string;
  organizationId: number;
}) {
  // Format dates for query params
  const startStr = new Date(startDate).toISOString().split('T')[0];
  const endStr = new Date(endDate).toISOString().split('T')[0];
  
  // Use organization-scoped transactions endpoint with query params for filtering
  const { data: transactions = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/transactions', { organizationId, categoryId, startDate: startStr, endDate: endStr }],
    queryFn: async () => {
      const response = await fetch(`/api/transactions?categoryId=${categoryId}&startDate=${startStr}&endDate=${endStr}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: !!categoryId && !!organizationId,
  });

  // Filter transactions to expense type (in case server doesn't filter)
  const filteredTransactions = transactions.filter(t => {
    if (t.categoryId !== categoryId) return false;
    const txDate = new Date(t.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return txDate >= start && txDate <= end && t.type === 'expense';
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading transactions...</div>;
  }

  if (filteredTransactions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No transactions found in this category during the budget period.
      </div>
    );
  }

  const total = filteredTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-muted rounded-md">
        <span className="text-sm font-medium">{filteredTransactions.length} transaction(s)</span>
        <span className="font-semibold">${total.toLocaleString()}</span>
      </div>
      <div className="divide-y max-h-[400px] overflow-auto">
        {filteredTransactions.map((tx) => (
          <div key={tx.id} className="py-3 flex items-center justify-between" data-testid={`drilldown-tx-${tx.id}`}>
            <div>
              <p className="font-medium text-sm">{tx.description || 'No description'}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(tx.date).toLocaleDateString()} 
                {tx.vendorName && ` • ${tx.vendorName}`}
              </p>
            </div>
            <span className="font-medium">${Number(tx.amount).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
