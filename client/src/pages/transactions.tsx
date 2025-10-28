import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowUpRight, ArrowDownRight, Search, Calendar, Sparkles, Check, X, Tag, Edit, Trash2, ArrowLeft, Paperclip, Download } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import type { Organization, Transaction, Category, InsertTransaction, TransactionAttachment, Vendor, Client, Donor, Fund, Program } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";

interface CategorySuggestion {
  categoryId: number;
  categoryName: string;
  confidence: number;
  reasoning: string;
  historyId: number;
}

// Form data type for transaction form (uses string for date field)
interface TransactionFormData {
  organizationId: number;
  type: 'income' | 'expense';
  date: string;
  description: string;
  amount: string;
  categoryId?: number;
  grantId?: number;
  vendorId?: number;
  clientId?: number;
  donorId?: number;
  fundId?: number;
  programId?: number;
  functionalCategory?: 'program' | 'administrative' | 'fundraising' | null;
  createdBy: string;
}

interface TransactionsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Transactions({ currentOrganization, userId }: TransactionsProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTransactionId, setDeleteTransactionId] = useState<number | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"income" | "expense">("expense");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<CategorySuggestion | null>(null);
  const [bulkSuggestions, setBulkSuggestions] = useState<Map<number, CategorySuggestion>>(new Map());
  const [showBulkCategorization, setShowBulkCategorization] = useState(false);
  const [isAttachmentsDialogOpen, setIsAttachmentsDialogOpen] = useState(false);
  const [selectedTransactionForAttachments, setSelectedTransactionForAttachments] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<TransactionFormData>({
    organizationId: currentOrganization.id,
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    categoryId: undefined,
    grantId: undefined,
    vendorId: undefined,
    clientId: undefined,
    donorId: undefined,
    fundId: undefined,
    programId: undefined,
    functionalCategory: null,
    createdBy: userId,
  });

  const { data: transactions, isLoading: transactionsLoading, error: transactionsError } = useQuery<Transaction[]>({
    queryKey: [`/api/transactions/${currentOrganization.id}`],
    retry: false,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: [`/api/categories/${currentOrganization.id}`],
    retry: false,
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: [`/api/vendors/${currentOrganization.id}`],
    retry: false,
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: [`/api/clients/${currentOrganization.id}`],
    retry: false,
  });

  const { data: donors } = useQuery<Donor[]>({
    queryKey: [`/api/donors/${currentOrganization.id}`],
    enabled: currentOrganization.type === 'nonprofit',
    retry: false,
  });

  const { data: funds } = useQuery<Fund[]>({
    queryKey: ['/api/funds', currentOrganization.id],
    enabled: currentOrganization.type === 'nonprofit',
    retry: false,
  });

  const { data: programs } = useQuery<Program[]>({
    queryKey: ['/api/programs', currentOrganization.id],
    enabled: currentOrganization.type === 'nonprofit',
    retry: false,
  });

  const { data: attachments, refetch: refetchAttachments } = useQuery<TransactionAttachment[]>({
    queryKey: [`/api/transactions/${selectedTransactionForAttachments?.id}/attachments`],
    enabled: !!selectedTransactionForAttachments && isAttachmentsDialogOpen,
    retry: false,
  });

  useEffect(() => {
    if (transactionsError && isUnauthorizedError(transactionsError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [transactionsError, toast]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertTransaction) => {
      return await apiRequest('POST', '/api/transactions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${currentOrganization.id}`] });
      toast({
        title: "Transaction created",
        description: "Your transaction has been added successfully.",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const suggestCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!formData.description || !formData.amount || !formData.type) {
        throw new Error("Please fill in description, amount, and type first");
      }
      const response = await apiRequest('POST', `/api/ai/suggest-category/${currentOrganization.id}`, {
        description: formData.description,
        amount: formData.amount,
        type: formData.type,
      });
      return await response.json() as CategorySuggestion;
    },
    onSuccess: (suggestion) => {
      setAiSuggestion(suggestion);
      toast({
        title: "AI Suggestion Ready",
        description: `Suggested: ${suggestion.categoryName} (${suggestion.confidence}% confidence)`,
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "AI Suggestion Failed",
        description: error.message || "Could not suggest a category. Please select manually.",
        variant: "destructive",
      });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!newCategoryName.trim()) {
        throw new Error("Category name is required");
      }
      const response = await apiRequest('POST', '/api/categories', {
        organizationId: currentOrganization.id,
        name: newCategoryName.trim(),
        type: newCategoryType,
        createdBy: userId,
      });
      return await response.json();
    },
    onSuccess: (newCategory: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${currentOrganization.id}`] });
      
      // Auto-select the newly created category if we're in the transaction dialog
      if (isDialogOpen) {
        setFormData({ ...formData, categoryId: newCategory.id });
      }
      
      toast({
        title: "Category created",
        description: `${newCategoryName} has been added successfully.`,
      });
      setIsCategoryDialogOpen(false);
      setNewCategoryName("");
      setNewCategoryType("expense");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendCategorizationFeedback = async (
    historyId: number,
    userDecision: 'accepted' | 'rejected' | 'modified',
    finalCategoryId?: number
  ) => {
    try {
      await apiRequest('POST', '/api/ai/categorization-feedback', {
        historyId,
        userDecision,
        finalCategoryId,
      });
    } catch (error) {
      console.error("Failed to send categorization feedback:", error);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest('PATCH', `/api/transactions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${currentOrganization.id}`] });
      toast({
        title: "Transaction updated",
        description: "Your transaction has been updated successfully.",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/transactions/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${currentOrganization.id}`] });
      toast({
        title: "Transaction deleted",
        description: "The transaction has been deleted successfully.",
      });
      setDeleteTransactionId(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      return await apiRequest('DELETE', `/api/attachments/${attachmentId}`, {});
    },
    onSuccess: () => {
      refetchAttachments();
      toast({
        title: "Attachment deleted",
        description: "The attachment has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attachment.",
        variant: "destructive",
      });
    },
  });

  const bulkCategorizeMutation = useMutation({
    mutationFn: async (transactionsToProcess: Transaction[]) => {
      const transactionData = transactionsToProcess.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        type: t.type,
      }));
      
      const response = await apiRequest('POST', `/api/ai/suggest-categories-bulk/${currentOrganization.id}`, {
        transactions: transactionData,
      });
      return await response.json() as Record<number, CategorySuggestion>;
    },
    onSuccess: (suggestionsObj) => {
      const suggestionsMap = new Map<number, CategorySuggestion>();
      Object.entries(suggestionsObj).forEach(([id, suggestion]) => {
        suggestionsMap.set(parseInt(id), suggestion);
      });
      setBulkSuggestions(suggestionsMap);
      setShowBulkCategorization(true);
      toast({
        title: "Bulk Categorization Complete",
        description: `Generated suggestions for ${suggestionsMap.size} transaction${suggestionsMap.size !== 1 ? 's' : ''}`,
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Bulk Categorization Failed",
        description: error.message || "Could not categorize transactions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTransaction(null);
    setAiSuggestion(null);
    setFormData({
      organizationId: currentOrganization.id,
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      categoryId: undefined,
      grantId: undefined,
      vendorId: undefined,
      clientId: undefined,
      donorId: undefined,
      fundId: undefined,
      programId: undefined,
      functionalCategory: null,
      createdBy: userId,
    });
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      organizationId: transaction.organizationId,
      type: transaction.type,
      date: format(new Date(transaction.date), 'yyyy-MM-dd'),
      description: transaction.description,
      amount: transaction.amount,
      categoryId: transaction.categoryId || undefined,
      grantId: transaction.grantId || undefined,
      vendorId: transaction.vendorId || undefined,
      clientId: transaction.clientId || undefined,
      donorId: transaction.donorId || undefined,
      fundId: transaction.fundId || undefined,
      programId: transaction.programId || undefined,
      functionalCategory: transaction.functionalCategory || null,
      createdBy: userId,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteTransaction = (id: number) => {
    setDeleteTransactionId(id);
  };

  const confirmDelete = () => {
    if (deleteTransactionId) {
      deleteMutation.mutate(deleteTransactionId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.date) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data: formData });
    } else {
      // Convert form data to InsertTransaction with Date object
      const transactionData: InsertTransaction = {
        ...formData,
        date: new Date(formData.date),
      };
      createMutation.mutate(transactionData);
    }
  };

  const filteredTransactions = transactions?.filter(t => 
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const uncategorizedTransactions = transactions?.filter(t => !t.categoryId) || [];

  if (transactionsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentOrganization.name}
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm" data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-manage-categories">
                <Tag className="h-4 w-4 mr-2" />
                Manage Categories
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Category</DialogTitle>
                <DialogDescription>
                  Add a new income or expense category for your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    placeholder="e.g., Office Supplies, Marketing"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    data-testid="input-category-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-type">Type</Label>
                  <Select
                    value={newCategoryType}
                    onValueChange={(value: "income" | "expense") => setNewCategoryType(value)}
                  >
                    <SelectTrigger id="category-type" data-testid="select-category-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => createCategoryMutation.mutate()}
                  disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                  className="w-full"
                  data-testid="button-create-category-submit"
                >
                  {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) handleCloseDialog();
            else setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-transaction">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
              <DialogDescription>
                {editingTransaction 
                  ? `Update transaction details for ${currentOrganization.name}.`
                  : `Record a new income or expense transaction for ${currentOrganization.name}.`
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type" data-testid="select-transaction-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  data-testid="input-transaction-date"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  data-testid="input-transaction-amount"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What is this transaction for?"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    setAiSuggestion(null);
                  }}
                  data-testid="input-transaction-description"
                  required
                />
              </div>

              {/* Vendor selection for expenses */}
              {formData.type === 'expense' && (
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor (Optional)</Label>
                  <Select
                    value={formData.vendorId?.toString() || "none"}
                    onValueChange={(value) => setFormData({ ...formData, vendorId: value === "none" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger id="vendor" data-testid="select-transaction-vendor">
                      <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No vendor</SelectItem>
                      {vendors?.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Client selection for income */}
              {formData.type === 'income' && (
                <div className="space-y-2">
                  <Label htmlFor="client">Client (Optional)</Label>
                  <Select
                    value={formData.clientId?.toString() || "none"}
                    onValueChange={(value) => setFormData({ ...formData, clientId: value === "none" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger id="client" data-testid="select-transaction-client">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Donor selection for income (donations) - nonprofits only */}
              {formData.type === 'income' && currentOrganization.type === 'nonprofit' && (
                <div className="space-y-2">
                  <Label htmlFor="donor">Donor (Optional)</Label>
                  <Select
                    value={formData.donorId?.toString() || "none"}
                    onValueChange={(value) => setFormData({ ...formData, donorId: value === "none" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger id="donor" data-testid="select-transaction-donor">
                      <SelectValue placeholder="Select a donor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No donor</SelectItem>
                      {donors?.map((donor) => (
                        <SelectItem key={donor.id} value={donor.id.toString()}>
                          {donor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Fund selection - nonprofits only */}
              {currentOrganization.type === 'nonprofit' && (
                <div className="space-y-2">
                  <Label htmlFor="fund">Fund (Optional)</Label>
                  <Select
                    value={formData.fundId?.toString() || "none"}
                    onValueChange={(value) => setFormData({ ...formData, fundId: value === "none" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger id="fund" data-testid="select-transaction-fund">
                      <SelectValue placeholder="Select a fund" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No fund</SelectItem>
                      {funds?.map((fund) => (
                        <SelectItem key={fund.id} value={fund.id.toString()}>
                          {fund.name} ({fund.fundType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Program selection for expenses - nonprofits only */}
              {formData.type === 'expense' && currentOrganization.type === 'nonprofit' && (
                <div className="space-y-2">
                  <Label htmlFor="program">Program (Optional)</Label>
                  <Select
                    value={formData.programId?.toString() || "none"}
                    onValueChange={(value) => setFormData({ ...formData, programId: value === "none" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger id="program" data-testid="select-transaction-program">
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No program</SelectItem>
                      {programs?.map((program) => (
                        <SelectItem key={program.id} value={program.id.toString()}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Functional category for expenses - nonprofits only */}
              {formData.type === 'expense' && currentOrganization.type === 'nonprofit' && (
                <div className="space-y-2">
                  <Label htmlFor="functionalCategory">Functional Category (Optional)</Label>
                  <Select
                    value={formData.functionalCategory || "none"}
                    onValueChange={(value) => setFormData({ ...formData, functionalCategory: value === "none" ? null : value as 'program' | 'administrative' | 'fundraising' })}
                  >
                    <SelectTrigger id="functionalCategory" data-testid="select-transaction-functional-category">
                      <SelectValue placeholder="Select functional category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      <SelectItem value="program">Program</SelectItem>
                      <SelectItem value="administrative">Administrative</SelectItem>
                      <SelectItem value="fundraising">Fundraising</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* AI Suggest Category Button */}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => suggestCategoryMutation.mutate()}
                  disabled={suggestCategoryMutation.isPending || !formData.description || !formData.amount}
                  className="w-full"
                  data-testid="button-ai-suggest-category"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {suggestCategoryMutation.isPending ? "Analyzing..." : "AI Suggest Category"}
                </Button>
              </div>

              {/* AI Suggestion Display */}
              {aiSuggestion && (
                <div className="p-4 bg-muted/50 rounded-md space-y-3" data-testid="ai-suggestion-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">AI Suggestion</span>
                        <Badge variant="secondary" className="text-xs">
                          {aiSuggestion.confidence}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-foreground mb-1">
                        {aiSuggestion.categoryName}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        {aiSuggestion.reasoning}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        // Send rejected feedback when dismissing
                        if (aiSuggestion?.historyId) {
                          sendCategorizationFeedback(aiSuggestion.historyId, 'rejected');
                        }
                        setAiSuggestion(null);
                      }}
                      className="h-6 w-6 flex-shrink-0"
                      data-testid="button-dismiss-suggestion"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => {
                        const categoryId = aiSuggestion.categoryId;
                        const categoryName = aiSuggestion.categoryName;
                        const historyId = aiSuggestion.historyId;
                        
                        setFormData({ ...formData, categoryId });
                        
                        // Send accepted feedback
                        sendCategorizationFeedback(historyId, 'accepted', categoryId);
                        
                        setAiSuggestion(null);
                        toast({
                          title: "Category Applied",
                          description: `Set to: ${categoryName}`,
                        });
                      }}
                      className="flex-1"
                      data-testid="button-accept-suggestion"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Apply
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Send rejected feedback
                        if (aiSuggestion?.historyId) {
                          sendCategorizationFeedback(aiSuggestion.historyId, 'rejected');
                        }
                        setAiSuggestion(null);
                      }}
                      className="flex-1"
                      data-testid="button-reject-suggestion"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Ignore
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category">Category {!aiSuggestion && "(Optional)"}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewCategoryType(formData.type || 'expense');
                      setIsCategoryDialogOpen(true);
                    }}
                    data-testid="button-add-category-inline"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    New Category
                  </Button>
                </div>
                <Select
                  value={formData.categoryId?.toString() || "none"}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value === "none" ? undefined : parseInt(value) })}
                >
                  <SelectTrigger id="category" data-testid="select-transaction-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories?.filter(c => c.type === formData.type).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel-transaction"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-transaction"
                >
                  {editingTransaction 
                    ? (updateMutation.isPending ? "Updating..." : "Update")
                    : (createMutation.isPending ? "Creating..." : "Create")
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-transactions"
        />
      </div>

      {/* Bulk Categorization */}
      {uncategorizedTransactions.length > 0 && !searchQuery && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Bulk Categorization
                </CardTitle>
                <CardDescription>
                  {uncategorizedTransactions.length} uncategorized transaction{uncategorizedTransactions.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              {!showBulkCategorization ? (
                <Button
                  onClick={() => bulkCategorizeMutation.mutate(uncategorizedTransactions)}
                  disabled={bulkCategorizeMutation.isPending}
                  data-testid="button-bulk-categorize"
                >
                  {bulkCategorizeMutation.isPending ? "Analyzing..." : "Categorize All"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBulkCategorization(false);
                    setBulkSuggestions(new Map());
                  }}
                  data-testid="button-hide-bulk-suggestions"
                >
                  Hide Suggestions
                </Button>
              )}
            </div>
          </CardHeader>
          {showBulkCategorization && bulkSuggestions.size > 0 && (
            <CardContent>
              <div className="space-y-3">
                {Array.from(bulkSuggestions.entries()).map(([transactionId, suggestion]) => {
                  const transaction = transactions?.find(t => t.id === transactionId);
                  if (!transaction) return null;
                  
                  return (
                    <div
                      key={transactionId}
                      className="p-4 bg-muted/30 rounded-md space-y-3"
                      data-testid={`bulk-suggestion-${transactionId}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.type === 'income' ? '+' : '-'}
                            ${parseFloat(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {suggestion.confidence}% confidence
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="text-sm font-semibold text-foreground">
                          {suggestion.categoryName}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        {suggestion.reasoning}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            // Update the transaction with the suggested category
                            try {
                              await apiRequest('PATCH', `/api/transactions/${transactionId}`, {
                                categoryId: suggestion.categoryId,
                              });
                              
                              // Send accepted feedback
                              sendCategorizationFeedback(suggestion.historyId, 'accepted', suggestion.categoryId);
                              
                              // Remove from bulk suggestions
                              const newSuggestions = new Map(bulkSuggestions);
                              newSuggestions.delete(transactionId);
                              setBulkSuggestions(newSuggestions);
                              
                              // Invalidate transactions cache
                              queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
                              
                              toast({
                                title: "Category Applied",
                                description: `Set to: ${suggestion.categoryName}`,
                              });
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to update transaction.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="flex-1"
                          data-testid={`button-accept-bulk-suggestion-${transactionId}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Send rejected feedback
                            sendCategorizationFeedback(suggestion.historyId, 'rejected');
                            
                            // Remove from bulk suggestions
                            const newSuggestions = new Map(bulkSuggestions);
                            newSuggestions.delete(transactionId);
                            setBulkSuggestions(newSuggestions);
                          }}
                          className="flex-1"
                          data-testid={`button-reject-bulk-suggestion-${transactionId}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Ignore
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Check Register */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Register</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-12 w-12 rounded-md bg-muted mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No transactions match your search" : "No transactions yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {!searchQuery && "Click 'Add Transaction' to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    const category = categories?.find(c => c.id === transaction.categoryId);
                    return (
                      <tr 
                        key={transaction.id} 
                        className="border-b hover-elevate"
                        data-testid={`transaction-row-${transaction.id}`}
                      >
                        <td className="py-3 px-4 text-sm">
                          {format(new Date(transaction.date), 'MM/dd/yyyy')}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">
                          {transaction.description}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {category ? (
                            <Badge variant="outline" className="text-xs">
                              {category.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Uncategorized</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <Badge 
                            variant={transaction.reconciliationStatus === 'reconciled' ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {transaction.reconciliationStatus === 'reconciled' ? 'Reconciled' : 'Unreconciled'}
                          </Badge>
                        </td>
                        <td className={`py-3 px-4 text-sm font-mono text-right ${
                          transaction.type === 'income' ? 'text-chart-2' : 'text-chart-3'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          ${parseFloat(transaction.amount).toLocaleString('en-US', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedTransactionForAttachments(transaction);
                                setIsAttachmentsDialogOpen(true);
                              }}
                              data-testid={`button-attachments-${transaction.id}`}
                            >
                              <Paperclip className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditTransaction(transaction)}
                              data-testid={`button-edit-${transaction.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              data-testid={`button-delete-${transaction.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTransactionId !== null} onOpenChange={(open) => !open && setDeleteTransactionId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Attachments Dialog */}
      <Dialog open={isAttachmentsDialogOpen} onOpenChange={setIsAttachmentsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Attachments</DialogTitle>
            <DialogDescription>
              Upload receipts, documents, and other files for this transaction
            </DialogDescription>
          </DialogHeader>
          {selectedTransactionForAttachments && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <p className="text-sm text-muted-foreground">
                  {selectedTransactionForAttachments.description} - ${parseFloat(selectedTransactionForAttachments.amount).toFixed(2)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Existing Attachments</h3>
                {attachments && attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div 
                        key={attachment.id} 
                        className="flex items-center justify-between p-3 border rounded-md hover-elevate"
                        data-testid={`attachment-item-${attachment.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{attachment.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(attachment.fileSize / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              window.open(`/api/attachments/${attachment.id}/download`, '_blank');
                            }}
                            data-testid={`button-download-attachment-${attachment.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this attachment?')) {
                                deleteAttachmentMutation.mutate(attachment.id);
                              }
                            }}
                            data-testid={`button-delete-attachment-${attachment.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No attachments yet</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Upload New Attachments</h3>
                <ObjectUploader
                  transactionId={selectedTransactionForAttachments.id}
                  onUploadComplete={() => {
                    refetchAttachments();
                    toast({
                      title: "Upload complete",
                      description: "Your files have been uploaded successfully.",
                    });
                  }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
