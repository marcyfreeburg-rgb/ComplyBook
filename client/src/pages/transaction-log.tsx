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
  Loader2
} from "lucide-react";
import type { Organization, Transaction, Category, Vendor, Client, Donor, Grant } from "@shared/schema";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

type OrganizationWithRole = Organization & { userRole: string };

interface TransactionLogProps {
  currentOrganization: OrganizationWithRole;
  userId: string;
}

export default function TransactionLog({ currentOrganization, userId }: TransactionLogProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
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
      const suggestionResponse = await response.json();
      
      const suggestion = suggestionResponse?.suggestion;
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
      date: format(new Date(transaction.date), "yyyy-MM-dd"),
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

  const getGrantName = (grantId: number | null) => {
    if (!grantId) return null;
    const grant = grants.find(g => g.id === grantId);
    return grant?.name || null;
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
    return category?.name || "Unknown";
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategoryName(transaction.categoryId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === "all" || (transaction.source || "manual") === sourceFilter;
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    return matchesSearch && matchesSource && matchesType;
  });

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
          <Button variant="outline" asChild data-testid="button-import-link">
            <a href="/accounting-imports">
              <Upload className="h-4 w-4 mr-2" />
              Import Transactions
            </a>
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found. Import transactions or connect your bank.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium w-10">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all transactions"
                        data-testid="checkbox-select-all"
                      />
                    </th>
                    <th className="text-left py-3 px-2 font-medium">Date</th>
                    <th className="text-left py-3 px-2 font-medium">Description</th>
                    <th className="text-left py-3 px-2 font-medium">Category</th>
                    {currentOrganization.type === 'nonprofit' && (
                      <th className="text-left py-3 px-2 font-medium">Grant</th>
                    )}
                    <th className="text-left py-3 px-2 font-medium">Type</th>
                    <th className="text-left py-3 px-2 font-medium">Source</th>
                    <th className="text-right py-3 px-2 font-medium">Amount</th>
                    <th className="text-right py-3 px-2 font-medium sticky right-0 bg-card z-10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
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
                        {format(new Date(transaction.date), "MMM d, yyyy")}
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
    </div>
  );
}
