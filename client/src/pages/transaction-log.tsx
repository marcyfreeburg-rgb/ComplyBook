import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Download,
  FileSpreadsheet,
  CreditCard,
  Upload,
  RefreshCw,
  Plus,
  Sparkles,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import type { Organization, Transaction, Category, Vendor, Client, Donor, Grant } from "@shared/schema";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

type OrganizationWithRole = Organization & { userRole: string };

interface PlaidAccountWithInitialBalance {
  id: number;
  accountId: string;
  name: string;
  mask: string | null;
  type: string | null;
  subtype: string | null;
  institutionName: string | null;
  initialBalance: string | null;
  initialBalanceDate: string | null;
}

interface TransactionLogProps {
  currentOrganization: OrganizationWithRole;
  userId: string;
}

export default function TransactionLog({ currentOrganization, userId }: TransactionLogProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    categoryId: "",
    vendorId: "",
    clientId: "",
    donorId: "",
    grantId: "",
  });
  
  // Sorting state
  type SortColumn = 'date' | 'description' | 'category' | 'grant' | 'type' | 'source' | 'amount';
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const [editForm, setEditForm] = useState({
    date: "",
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    categoryId: "",
    vendorId: "",
    clientId: "",
    donorId: "",
    grantId: "",
  });
  
  const [suggestingForTransaction, setSuggestingForTransaction] = useState<number | null>(null);
  const [isSyncingPlaid, setIsSyncingPlaid] = useState(false);

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: [`/api/transactions/${currentOrganization.id}`],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: [`/api/categories/${currentOrganization.id}`],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: [`/api/vendors/${currentOrganization.id}`],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: [`/api/clients/${currentOrganization.id}`],
  });

  const { data: donors = [] } = useQuery<Donor[]>({
    queryKey: [`/api/donors/${currentOrganization.id}`],
    enabled: currentOrganization.type === 'nonprofit',
  });

  type GrantWithBalances = Grant & { totalSpent: string; totalIncome: string; remainingBalance: string };
  const { data: grants = [] } = useQuery<GrantWithBalances[]>({
    queryKey: [`/api/grants/${currentOrganization.id}`],
    enabled: currentOrganization.type === 'nonprofit',
  });

  // Check if organization has connected bank accounts
  const { data: plaidItems = [] } = useQuery<{ id: number; itemId: string; institutionName: string }[]>({
    queryKey: [`/api/plaid/items/${currentOrganization.id}`],
  });

  // Fetch Plaid accounts with initial balance info for running balance calculation
  const { data: plaidAccounts = [] } = useQuery<PlaidAccountWithInitialBalance[]>({
    queryKey: [`/api/plaid/accounts/${currentOrganization.id}`],
  });

  const syncPlaidTransactionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/plaid/sync-transactions/${currentOrganization.id}`, {});
      return await response.json();
    },
    onMutate: () => {
      setIsSyncingPlaid(true);
    },
    onSuccess: (data: { imported?: number; message?: string }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      toast({
        title: "Transactions Synced",
        description: `Successfully synced ${data.imported || 0} new transactions from your bank accounts.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync transactions from bank.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSyncingPlaid(false);
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Transaction> }) => {
      return await apiRequest('PATCH', `/api/transactions/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${currentOrganization.id}`] });
      setIsEditDialogOpen(false);
      setEditingTransaction(null);
      toast({
        title: "Transaction Updated",
        description: "The transaction has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update transaction.",
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/transactions/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${currentOrganization.id}`] });
      toast({
        title: "Transaction Deleted",
        description: "The transaction has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (transactionIds: number[]) => {
      return await apiRequest('POST', `/api/transactions/bulk-delete`, {
        organizationId: currentOrganization.id,
        transactionIds,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${currentOrganization.id}`] });
      setSelectedTransactions(new Set());
      setIsDeleteDialogOpen(false);
      toast({
        title: "Transactions Deleted",
        description: `Successfully deleted ${variables.length} transactions.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transactions.",
        variant: "destructive",
      });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: {
      organizationId: number;
      date: string;
      description: string;
      amount: string;
      type: 'income' | 'expense';
      categoryId?: number | null;
      vendorId?: number | null;
      clientId?: number | null;
      donorId?: number | null;
      grantId?: number | null;
      createdBy: string;
      source: string;
    }) => {
      return await apiRequest('POST', '/api/transactions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${currentOrganization.id}`] });
      setIsAddDialogOpen(false);
      setAddForm({
        date: new Date().toISOString().split('T')[0],
        description: "",
        amount: "",
        type: "expense",
        categoryId: "",
        vendorId: "",
        clientId: "",
        donorId: "",
        grantId: "",
      });
      toast({
        title: "Transaction Created",
        description: "The transaction has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction.",
        variant: "destructive",
      });
    },
  });

  const handleAddTransaction = () => {
    if (!addForm.description || !addForm.amount || !addForm.date) {
      toast({
        title: "Validation Error",
        description: "Please fill in date, description, and amount.",
        variant: "destructive",
      });
      return;
    }

    const parsedAmount = parseFloat(addForm.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }

    createTransactionMutation.mutate({
      organizationId: currentOrganization.id,
      date: addForm.date,
      description: addForm.description.trim(),
      amount: parsedAmount.toString(),
      type: addForm.type,
      categoryId: addForm.categoryId && addForm.categoryId !== "none" ? parseInt(addForm.categoryId) : null,
      vendorId: addForm.vendorId && addForm.vendorId !== "none" ? parseInt(addForm.vendorId) : null,
      clientId: addForm.clientId && addForm.clientId !== "none" ? parseInt(addForm.clientId) : null,
      donorId: addForm.donorId && addForm.donorId !== "none" ? parseInt(addForm.donorId) : null,
      grantId: addForm.grantId && addForm.grantId !== "none" ? parseInt(addForm.grantId) : null,
      createdBy: userId,
      source: 'manual',
    });
  };

  const handleSelectTransaction = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedTransactions);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedTransactions(newSelected);
  };

  const suggestCategoryMutation = useMutation({
    mutationFn: async (transaction: Transaction) => {
      // Get AI suggestion
      const response = await apiRequest('POST', `/api/ai/suggest-category/${currentOrganization.id}`, {
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
      });
      const suggestion = await response.json();
      
      // Backend returns { categoryId, categoryName, confidence, reasoning, historyId } directly
      if (!suggestion?.categoryId) {
        return { transactionId: transaction.id, suggestion: null, applied: false };
      }
      
      // Apply the suggestion directly via PATCH
      await apiRequest('PATCH', `/api/transactions/${transaction.id}`, {
        categoryId: suggestion.categoryId
      });
      
      return { transactionId: transaction.id, suggestion, applied: true };
    },
    onMutate: (transaction) => {
      setSuggestingForTransaction(transaction.id);
    },
    onSuccess: (data) => {
      if (data.applied && data.suggestion) {
        queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
        toast({
          title: "Category Applied",
          description: `Applied "${data.suggestion.categoryName}" (${data.suggestion.confidence}% confidence)`,
        });
      } else {
        toast({
          title: "No Suggestion",
          description: "AI couldn't determine a suitable category for this transaction.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get category suggestion.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setSuggestingForTransaction(null);
    },
  });

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      date: format(new Date(transaction.date + 'T12:00:00'), "yyyy-MM-dd"),
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      categoryId: transaction.categoryId?.toString() || "",
      vendorId: transaction.vendorId?.toString() || "",
      clientId: transaction.clientId?.toString() || "",
      donorId: transaction.donorId?.toString() || "",
      grantId: transaction.grantId?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingTransaction) return;
    
    updateTransactionMutation.mutate({
      id: editingTransaction.id,
      updates: {
        date: new Date(editForm.date),
        description: editForm.description,
        amount: editForm.amount,
        type: editForm.type,
        categoryId: editForm.categoryId && editForm.categoryId !== "none" ? parseInt(editForm.categoryId) : null,
        vendorId: editForm.vendorId && editForm.vendorId !== "none" ? parseInt(editForm.vendorId) : null,
        clientId: editForm.clientId && editForm.clientId !== "none" ? parseInt(editForm.clientId) : null,
        donorId: editForm.donorId && editForm.donorId !== "none" ? parseInt(editForm.donorId) : null,
        grantId: editForm.grantId && editForm.grantId !== "none" ? parseInt(editForm.grantId) : null,
      },
    });
  };

  const getSelectedGrant = () => {
    if (!editForm.grantId) return null;
    return grants.find(g => g.id === parseInt(editForm.grantId));
  };

  const getSourceBadge = (source: string | null) => {
    switch (source) {
      case "manual":
        return <Badge variant="outline">Manual</Badge>;
      case "csv_import":
        return <Badge variant="secondary"><FileSpreadsheet className="h-3 w-3 mr-1" />CSV Import</Badge>;
      case "plaid":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CreditCard className="h-3 w-3 mr-1" />Plaid</Badge>;
      case "quickbooks":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">QuickBooks</Badge>;
      case "xero":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Xero</Badge>;
      default:
        return <Badge variant="outline">Manual</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "income" 
      ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Income</Badge>
      : <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Expense</Badge>;
  };

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(c => c.id === categoryId);
    if (!category) return "Unknown";
    
    // Show "Parent - Child" format for subcategories
    if (category.parentCategoryId) {
      const parentCategory = categories.find(c => c.id === category.parentCategoryId);
      if (parentCategory) {
        return `${parentCategory.name} - ${category.name}`;
      }
    }
    return category.name;
  };

  const getGrantName = (grantId: number | null) => {
    if (!grantId) return "";
    const grant = grants.find(g => g.id === grantId);
    return grant?.name || "Unknown";
  };

  // Handle column header click for sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort icon component
  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCategoryName(transaction.categoryId).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = sourceFilter === "all" || (transaction.source || "manual") === sourceFilter;
      const matchesType = typeFilter === "all" || transaction.type === typeFilter;
      const matchesAccount = accountFilter === "all" || 
        (accountFilter === "unlinked" && !transaction.bankAccountId) ||
        (transaction.bankAccountId?.toString() === accountFilter);
      return matchesSearch && matchesSource && matchesType && matchesAccount;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'category':
          comparison = getCategoryName(a.categoryId).localeCompare(getCategoryName(b.categoryId));
          break;
        case 'grant':
          comparison = getGrantName(a.grantId).localeCompare(getGrantName(b.grantId));
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'source':
          comparison = (a.source || 'manual').localeCompare(b.source || 'manual');
          break;
        case 'amount':
          comparison = parseFloat(a.amount) - parseFloat(b.amount);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Calculate running balance for each transaction (like a check register)
  // Balance is always calculated chronologically regardless of display sort
  const chronologicalTransactions = [...filteredTransactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Get starting balance based on selected account filter
  const selectedAccount = accountFilter !== "all" && accountFilter !== "unlinked"
    ? plaidAccounts.find(a => a.id.toString() === accountFilter)
    : null;
  const startingBalance = selectedAccount?.initialBalance 
    ? parseFloat(selectedAccount.initialBalance) 
    : 0;
  const startingBalanceDate = selectedAccount?.initialBalanceDate
    ? new Date(selectedAccount.initialBalanceDate + 'T00:00:00')
    : null;
  
  const balanceMap = new Map<number, number>();
  let runningBalance = 0;
  let hasSeenBalanceDate = false;
  
  chronologicalTransactions.forEach(t => {
    const amount = parseFloat(t.amount);
    const transactionDate = new Date(t.date);
    
    // If we have a starting balance date and this is the first transaction on or after it,
    // reset the running balance to the starting balance
    if (startingBalanceDate && !hasSeenBalanceDate && transactionDate >= startingBalanceDate) {
      runningBalance = startingBalance;
      hasSeenBalanceDate = true;
    }
    
    // Add the transaction to running balance
    runningBalance += t.type === 'income' ? amount : -amount;
    balanceMap.set(t.id, runningBalance);
  });
  
  // If we never saw the balance date (all transactions are before it), still apply starting balance
  if (startingBalanceDate && !hasSeenBalanceDate && chronologicalTransactions.length > 0) {
    // All visible transactions are before the starting balance date
    // Show them with their own running total, as the starting balance isn't applicable yet
  }

  const transactionsWithBalance = filteredTransactions.map(transaction => ({
    ...transaction,
    runningBalance: balanceMap.get(transaction.id) || 0
  }));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    } else {
      setSelectedTransactions(new Set());
    }
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedTransactions);
    if (ids.length > 0) {
      bulkDeleteMutation.mutate(ids);
    }
  };

  const isAllSelected = filteredTransactions.length > 0 && 
    filteredTransactions.every(t => selectedTransactions.has(t.id));

  const totals = filteredTransactions.reduce(
    (acc, t) => {
      const amount = parseFloat(t.amount);
      if (t.type === "income") {
        acc.income += amount;
      } else {
        acc.expense += amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  return (
    <div className="space-y-6" data-testid="page-transaction-log">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-transaction-log">Transaction Log</h1>
          <p className="text-muted-foreground">
            View and manage all transactions from imports and bank connections
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {plaidItems.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => syncPlaidTransactionsMutation.mutate()}
              disabled={isSyncingPlaid}
              data-testid="button-sync-plaid"
            >
              {isSyncingPlaid ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Bank Transactions
            </Button>
          )}
          <Button variant="outline" asChild data-testid="button-import-link">
            <a href="/accounting-imports">
              <Upload className="h-4 w-4 mr-2" />
              Import Transactions
            </a>
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-transaction">
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-income">
              {formatCurrency(totals.income)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-total-expenses">
              {formatCurrency(totals.expense)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.income - totals.expense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-net-balance">
              {formatCurrency(totals.income - totals.expense)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>
                {selectedTransactions.size > 0 
                  ? `${selectedTransactions.size} of ${filteredTransactions.length} selected`
                  : `${filteredTransactions.length} transactions found`}
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {selectedTransactions.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={bulkDeleteMutation.isPending}
                  data-testid="button-bulk-delete"
                >
                  {bulkDeleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete {selectedTransactions.size} Selected
                </Button>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[200px]"
                  data-testid="input-search-transactions"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-source-filter">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="csv_import">CSV Import</SelectItem>
                  <SelectItem value="plaid">Plaid</SelectItem>
                  <SelectItem value="quickbooks">QuickBooks</SelectItem>
                  <SelectItem value="xero">Xero</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px]" data-testid="select-type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              {plaidAccounts.length > 0 && (
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-account-filter">
                    <SelectValue placeholder="Account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    <SelectItem value="unlinked">Manual / Unlinked</SelectItem>
                    {plaidAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name} {account.mask ? `••${account.mask}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Starting balance info banner */}
          {selectedAccount && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm flex items-center justify-between" data-testid="banner-starting-balance">
              <div>
                <span className="text-muted-foreground">Starting balance for {selectedAccount.name}:</span>
                {selectedAccount.initialBalance && selectedAccount.initialBalanceDate ? (
                  <span className="ml-2 font-medium">
                    {formatCurrency(parseFloat(selectedAccount.initialBalance))} as of {selectedAccount.initialBalanceDate}
                  </span>
                ) : (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    Not set - <a href="/bank-accounts" className="underline hover:no-underline">Set starting balance</a>
                  </span>
                )}
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found. Import transactions or connect your bank.
            </div>
          ) : (
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="sticky top-0 bg-card z-20">
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium w-10 bg-card">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all transactions"
                        data-testid="checkbox-select-all"
                      />
                    </th>
                    <th 
                      className="text-left py-3 px-2 font-medium bg-card cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('date')}
                      data-testid="header-sort-date"
                    >
                      <div className="flex items-center">Date<SortIcon column="date" /></div>
                    </th>
                    <th 
                      className="text-left py-3 px-2 font-medium bg-card cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('description')}
                      data-testid="header-sort-description"
                    >
                      <div className="flex items-center">Description<SortIcon column="description" /></div>
                    </th>
                    <th 
                      className="text-left py-3 px-2 font-medium bg-card cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('category')}
                      data-testid="header-sort-category"
                    >
                      <div className="flex items-center">Category<SortIcon column="category" /></div>
                    </th>
                    {currentOrganization.type === 'nonprofit' && (
                      <th 
                        className="text-left py-3 px-2 font-medium bg-card cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort('grant')}
                        data-testid="header-sort-grant"
                      >
                        <div className="flex items-center">Grant<SortIcon column="grant" /></div>
                      </th>
                    )}
                    <th 
                      className="text-left py-3 px-2 font-medium bg-card cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('type')}
                      data-testid="header-sort-type"
                    >
                      <div className="flex items-center">Type<SortIcon column="type" /></div>
                    </th>
                    <th 
                      className="text-left py-3 px-2 font-medium bg-card cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('source')}
                      data-testid="header-sort-source"
                    >
                      <div className="flex items-center">Source<SortIcon column="source" /></div>
                    </th>
                    <th 
                      className="text-right py-3 px-2 font-medium bg-card cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('amount')}
                      data-testid="header-sort-amount"
                    >
                      <div className="flex items-center justify-end">Amount<SortIcon column="amount" /></div>
                    </th>
                    <th className="text-right py-3 px-2 font-medium bg-card">Balance</th>
                    <th className="text-right py-3 px-2 font-medium sticky right-0 bg-card z-30">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsWithBalance.map((transaction) => (
                    <tr key={transaction.id} className={`border-b hover:bg-muted/50 ${selectedTransactions.has(transaction.id) ? 'bg-muted/30' : ''}`} data-testid={`row-transaction-${transaction.id}`}>
                      <td className="py-3 px-2">
                        <Checkbox
                          checked={selectedTransactions.has(transaction.id)}
                          onCheckedChange={(checked) => handleSelectTransaction(transaction.id, checked as boolean)}
                          aria-label={`Select transaction ${transaction.description}`}
                          data-testid={`checkbox-transaction-${transaction.id}`}
                        />
                      </td>
                      <td className="py-3 px-2">
                        {format(new Date(transaction.date + 'T12:00:00'), "MMM d, yyyy")}
                      </td>
                      <td className="py-3 px-2">{transaction.description}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline">{getCategoryName(transaction.categoryId)}</Badge>
                          {!transaction.categoryId && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => suggestCategoryMutation.mutate(transaction)}
                              disabled={suggestingForTransaction === transaction.id}
                              title="AI Suggest Category"
                              data-testid={`button-suggest-category-${transaction.id}`}
                            >
                              {suggestingForTransaction === transaction.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3 text-amber-500" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                      {currentOrganization.type === 'nonprofit' && (
                        <td className="py-3 px-2">
                          {transaction.grantId ? (
                            <Badge variant={grants.find(g => g.id === transaction.grantId)?.fundType === 'restricted' ? 'default' : 'secondary'}>
                              {getGrantName(transaction.grantId)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-2">{getTypeBadge(transaction.type)}</td>
                      <td className="py-3 px-2">{getSourceBadge(transaction.source)}</td>
                      <td className={`py-3 px-2 text-right font-medium ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(transaction.amount))}
                      </td>
                      <td className={`py-3 px-2 text-right font-medium ${transaction.runningBalance >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`} data-testid={`balance-transaction-${transaction.id}`}>
                        {formatCurrency(transaction.runningBalance)}
                      </td>
                      <td className="py-3 px-2 text-right sticky right-0 bg-card z-10">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditClick(transaction)}
                            data-testid={`button-edit-transaction-${transaction.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this transaction?")) {
                                deleteTransactionMutation.mutate(transaction.id);
                              }
                            }}
                            data-testid={`button-delete-transaction-${transaction.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update the transaction details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                data-testid="input-edit-date"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
                data-testid="input-edit-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  data-testid="input-edit-amount"
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select value={editForm.type} onValueChange={(value: "income" | "expense") => setEditForm({ ...editForm, type: value })}>
                  <SelectTrigger id="edit-type" data-testid="select-edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Select value={editForm.categoryId || "none"} onValueChange={(value) => setEditForm({ ...editForm, categoryId: value === "none" ? "" : value })}>
                <SelectTrigger id="edit-category" data-testid="select-edit-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.filter(c => c.type === editForm.type).map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editForm.type === "expense" && (
              <div>
                <Label htmlFor="edit-vendor">Vendor</Label>
                <Select value={editForm.vendorId || "none"} onValueChange={(value) => setEditForm({ ...editForm, vendorId: value === "none" ? "" : value })}>
                  <SelectTrigger id="edit-vendor" data-testid="select-edit-vendor">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editForm.type === "income" && (
              <>
                <div>
                  <Label htmlFor="edit-client">Client</Label>
                  <Select value={editForm.clientId || "none"} onValueChange={(value) => setEditForm({ ...editForm, clientId: value === "none" ? "" : value })}>
                    <SelectTrigger id="edit-client" data-testid="select-edit-client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {currentOrganization.type === 'nonprofit' && (
                  <div>
                    <Label htmlFor="edit-donor">Donor</Label>
                    <Select value={editForm.donorId || "none"} onValueChange={(value) => setEditForm({ ...editForm, donorId: value === "none" ? "" : value })}>
                      <SelectTrigger id="edit-donor" data-testid="select-edit-donor">
                        <SelectValue placeholder="Select donor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {donors.map((donor) => (
                          <SelectItem key={donor.id} value={donor.id.toString()}>
                            {donor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            {currentOrganization.type === 'nonprofit' && (
              <div>
                <Label htmlFor="edit-grant">Grant / Fund</Label>
                <Select value={editForm.grantId || "none"} onValueChange={(value) => setEditForm({ ...editForm, grantId: value === "none" ? "" : value })}>
                  <SelectTrigger id="edit-grant" data-testid="select-edit-grant">
                    <SelectValue placeholder="Select grant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grant (Unrestricted)</SelectItem>
                    {grants.map((grant) => (
                      <SelectItem key={grant.id} value={grant.id.toString()}>
                        {grant.name} ({grant.fundType === 'restricted' ? 'Restricted' : 'Unrestricted'}) - {formatCurrency(parseFloat(grant.remainingBalance))} remaining
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getSelectedGrant() && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={getSelectedGrant()?.fundType === 'restricted' ? 'default' : 'secondary'}>
                      {getSelectedGrant()?.fundType === 'restricted' ? 'Restricted Fund' : 'Unrestricted Fund'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Remaining: {formatCurrency(parseFloat(getSelectedGrant()?.remainingBalance || '0'))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={updateTransactionMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateTransactionMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selectedTransactions.size} Transactions</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedTransactions.size} selected transaction{selectedTransactions.size !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              data-testid="button-cancel-bulk-delete"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedTransactions.size} Transactions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Manually record a new income or expense transaction
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-type">Type</Label>
                <Select value={addForm.type} onValueChange={(value: 'income' | 'expense') => setAddForm({ ...addForm, type: value })}>
                  <SelectTrigger id="add-type" data-testid="select-add-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="add-date">Date</Label>
                <Input
                  id="add-date"
                  type="date"
                  value={addForm.date}
                  onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                  data-testid="input-add-date"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                placeholder="What is this transaction for?"
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                data-testid="input-add-description"
              />
            </div>
            <div>
              <Label htmlFor="add-amount">Amount</Label>
              <Input
                id="add-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                data-testid="input-add-amount"
              />
            </div>
            <div>
              <Label htmlFor="add-category">Category</Label>
              <Select value={addForm.categoryId || "none"} onValueChange={(value) => setAddForm({ ...addForm, categoryId: value === "none" ? "" : value })}>
                <SelectTrigger id="add-category" data-testid="select-add-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.filter(c => c.type === addForm.type).map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.parentCategoryId ? `${categories.find(p => p.id === category.parentCategoryId)?.name} - ` : ''}{category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addForm.type === 'expense' && (
              <div>
                <Label htmlFor="add-vendor">Vendor (Optional)</Label>
                <Select value={addForm.vendorId || "none"} onValueChange={(value) => setAddForm({ ...addForm, vendorId: value === "none" ? "" : value })}>
                  <SelectTrigger id="add-vendor" data-testid="select-add-vendor">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {addForm.type === 'income' && (
              <>
                <div>
                  <Label htmlFor="add-client">Client (Optional)</Label>
                  <Select value={addForm.clientId || "none"} onValueChange={(value) => setAddForm({ ...addForm, clientId: value === "none" ? "" : value })}>
                    <SelectTrigger id="add-client" data-testid="select-add-client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {currentOrganization.type === 'nonprofit' && (
                  <div>
                    <Label htmlFor="add-donor">Donor (Optional)</Label>
                    <Select value={addForm.donorId || "none"} onValueChange={(value) => setAddForm({ ...addForm, donorId: value === "none" ? "" : value })}>
                      <SelectTrigger id="add-donor" data-testid="select-add-donor">
                        <SelectValue placeholder="Select donor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {donors.map((donor) => (
                          <SelectItem key={donor.id} value={donor.id.toString()}>
                            {donor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            {currentOrganization.type === 'nonprofit' && (
              <div>
                <Label htmlFor="add-grant">Grant / Fund (Optional)</Label>
                <Select value={addForm.grantId || "none"} onValueChange={(value) => setAddForm({ ...addForm, grantId: value === "none" ? "" : value })}>
                  <SelectTrigger id="add-grant" data-testid="select-add-grant">
                    <SelectValue placeholder="Select grant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grant (Unrestricted)</SelectItem>
                    {grants.map((grant) => (
                      <SelectItem key={grant.id} value={grant.id.toString()}>
                        {grant.name} ({grant.fundType === 'restricted' ? 'Restricted' : 'Unrestricted'}) - {formatCurrency(parseFloat(grant.remainingBalance))} remaining
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel-add">
              Cancel
            </Button>
            <Button 
              onClick={handleAddTransaction} 
              disabled={createTransactionMutation.isPending || !addForm.description || !addForm.amount || !addForm.date}
              data-testid="button-submit-add"
            >
              {createTransactionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
