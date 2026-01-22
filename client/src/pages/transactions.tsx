import { useState, useEffect, useMemo } from "react";
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
import { Plus, ArrowUpRight, ArrowDownRight, Search, Calendar, Sparkles, Check, X, Tag, Edit, Trash2, ArrowLeft, Paperclip, Download, Upload, FileDown, Trash, CheckSquare, Square, CheckCircle2, Split, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { safeFormatDate } from "@/lib/utils";
import { Link } from "wouter";
import type { Organization, Transaction, Category, InsertTransaction, TransactionAttachment, Vendor, Client, Donor, Fund, Program, BankReconciliation, Grant } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Checkbox } from "@/components/ui/checkbox";
import { CategoryCombobox, CATEGORY_SENTINEL_NO_CHANGE } from "@/components/category-combobox";

interface CategorySuggestion {
  categoryId: number;
  categoryName: string;
  confidence: number;
  reasoning: string;
  historyId: number;
}

interface SplitItem {
  amount: string;
  description: string;
  categoryId: number | null;
  grantId: number | null;
  fundId: number | null;
  programId: number | null;
  functionalCategory: 'program' | 'administrative' | 'fundraising' | null;
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
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | null>(null);
  const [isReconciliationDialogOpen, setIsReconciliationDialogOpen] = useState(false);
  const [reconciliationData, setReconciliationData] = useState({
    accountName: '',
    statementEndDate: new Date().toISOString().split('T')[0],
    beginningBalance: '',
    endingBalance: '',
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<CategorySuggestion | null>(null);
  const [bulkSuggestions, setBulkSuggestions] = useState<Map<number, CategorySuggestion>>(new Map());
  const [showBulkCategorization, setShowBulkCategorization] = useState(false);
  const [isAttachmentsDialogOpen, setIsAttachmentsDialogOpen] = useState(false);
  const [selectedTransactionForAttachments, setSelectedTransactionForAttachments] = useState<Transaction | null>(null);
  
  // Bulk operations state
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<number>>(new Set());
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isBulkCategorizeDialogOpen, setIsBulkCategorizeDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  const [transactionToSplit, setTransactionToSplit] = useState<Transaction | null>(null);
  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState<number | undefined>(undefined);
  const [bulkFundId, setBulkFundId] = useState<number | undefined>(undefined);
  const [bulkProgramId, setBulkProgramId] = useState<number | undefined>(undefined);
  const [bulkFunctionalCategory, setBulkFunctionalCategory] = useState<'program' | 'administrative' | 'fundraising' | undefined>(undefined);
  
  // New transaction split mode state
  const [isFormSplitMode, setIsFormSplitMode] = useState(false);
  const [formSplitItems, setFormSplitItems] = useState<SplitItem[]>([]);
  
  const [aiBatchSize, setAiBatchSize] = useState<number>(() => {
    // Try to load from localStorage with validation
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiBatchSize');
      if (saved) {
        const parsed = parseInt(saved);
        // Validate it's a number and within allowed range
        if (!isNaN(parsed) && [10, 20, 30, 40, 50].includes(parsed)) {
          return parsed;
        }
      }
    }
    return 50; // Default to maximum
  });
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

  // Pagination state
  const TRANSACTIONS_PER_PAGE = 100;
  const [loadedTransactions, setLoadedTransactions] = useState<Transaction[]>([]);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination when search changes
  useEffect(() => {
    setLoadedTransactions([]);
    setHasMoreTransactions(true);
    setTotalTransactions(0);
  }, [debouncedSearchQuery, currentOrganization.id]);

  interface PaginatedTransactionsResponse {
    transactions: Transaction[];
    total: number;
    hasMore: boolean;
  }

  const { data: transactionsData, isLoading: transactionsLoading, error: transactionsError } = useQuery<PaginatedTransactionsResponse>({
    queryKey: [`/api/transactions/${currentOrganization.id}`, { limit: TRANSACTIONS_PER_PAGE, offset: 0, search: debouncedSearchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: TRANSACTIONS_PER_PAGE.toString(),
        offset: '0',
      });
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }
      const response = await fetch(`/api/transactions/${currentOrganization.id}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    retry: false,
    staleTime: 30000,
  });

  // Update loaded transactions when data changes
  useEffect(() => {
    if (transactionsData) {
      setLoadedTransactions(transactionsData.transactions);
      setHasMoreTransactions(transactionsData.hasMore);
      setTotalTransactions(transactionsData.total);
    }
  }, [transactionsData]);

  // Load more transactions
  const loadMoreTransactions = async () => {
    if (isLoadingMore || !hasMoreTransactions) return;
    
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: TRANSACTIONS_PER_PAGE.toString(),
        offset: loadedTransactions.length.toString(),
      });
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }
      const response = await fetch(`/api/transactions/${currentOrganization.id}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch more transactions');
      const data: PaginatedTransactionsResponse = await response.json();
      
      setLoadedTransactions(prev => [...prev, ...data.transactions]);
      setHasMoreTransactions(data.hasMore);
    } catch (error) {
      console.error('Error loading more transactions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load more transactions",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Use loaded transactions instead of raw query data
  const transactions = loadedTransactions;

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: [`/api/categories/${currentOrganization.id}`],
    retry: false,
    staleTime: 60000, // Categories rarely change - cache for 1 minute
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: [`/api/vendors/${currentOrganization.id}`],
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: [`/api/clients/${currentOrganization.id}`],
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: donors } = useQuery<Donor[]>({
    queryKey: [`/api/donors/${currentOrganization.id}`],
    enabled: currentOrganization.type === 'nonprofit',
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: funds } = useQuery<Fund[]>({
    queryKey: ['/api/funds', currentOrganization.id],
    enabled: currentOrganization.type === 'nonprofit',
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: programs } = useQuery<Program[]>({
    queryKey: ['/api/programs', currentOrganization.id],
    enabled: currentOrganization.type === 'nonprofit',
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: grants } = useQuery<Grant[]>({
    queryKey: [`/api/grants/${currentOrganization.id}`],
    enabled: currentOrganization.type === 'nonprofit',
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: attachments, refetch: refetchAttachments } = useQuery<TransactionAttachment[]>({
    queryKey: [`/api/transactions/${selectedTransactionForAttachments?.id}/attachments`],
    enabled: !!selectedTransactionForAttachments && isAttachmentsDialogOpen,
    retry: false,
  });

  const { data: lastReconciliation } = useQuery({
    queryKey: [`/api/bank-reconciliations/${currentOrganization.id}/last`],
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });

  const { data: matchedTransactionIds } = useQuery<number[]>({
    queryKey: [`/api/matched-transaction-ids/${currentOrganization.id}`],
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });

  const matchedIdsSet = useMemo(() => new Set(matchedTransactionIds || []), [matchedTransactionIds]);

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
        parentCategoryId: newCategoryParentId,
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
      setNewCategoryParentId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createReconciliationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/bank-reconciliations', {
        organizationId: currentOrganization.id,
        accountName: reconciliationData.accountName,
        statementEndDate: new Date(reconciliationData.statementEndDate),
        statementStartDate: lastReconciliation?.statementEndDate ? new Date(lastReconciliation.statementEndDate) : null,
        beginningBalance: reconciliationData.beginningBalance,
        endingBalance: reconciliationData.endingBalance,
        statementBalance: reconciliationData.endingBalance,
        bookBalance: '0',
        difference: '0',
        status: 'pending',
      });
      return await response.json();
    },
    onSuccess: (newReconciliation: BankReconciliation) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bank-reconciliations/${currentOrganization.id}/last`] });
      toast({
        title: "Reconciliation Started",
        description: `Bank reconciliation for ${reconciliationData.accountName} has been created.`,
      });
      setIsReconciliationDialogOpen(false);
      setReconciliationData({
        accountName: '',
        statementEndDate: new Date().toISOString().split('T')[0],
        beginningBalance: '',
        endingBalance: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reconciliation. Please try again.",
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

  const splitTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, splits }: { transactionId: number; splits: SplitItem[] }) => {
      const response = await apiRequest('POST', `/api/transactions/${transactionId}/split`, { splits });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${currentOrganization.id}`] });
      toast({
        title: "Transaction split",
        description: "The transaction has been split successfully.",
      });
      setIsSplitDialogOpen(false);
      setTransactionToSplit(null);
      setSplitItems([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to split transaction.",
        variant: "destructive",
      });
    },
  });

  const unsplitTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      const response = await apiRequest('POST', `/api/transactions/${transactionId}/unsplit`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard/${currentOrganization.id}`] });
      toast({
        title: "Transaction restored",
        description: "The transaction has been unsplit and restored to its original state.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unsplit transaction.",
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

  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/transactions/import-csv/${currentOrganization.id}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import CSV');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      setIsImportDialogOpen(false);
      setImportFile(null);
      const successCount = data.summary?.success || data.created?.length || 0;
      const skippedCount = data.summary?.skipped || data.skipped?.length || 0;
      const errorCount = data.summary?.failed || data.errors?.length || 0;
      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} transaction(s). ${skippedCount} skipped, ${errorCount} error(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import CSV file.",
        variant: "destructive",
      });
    },
  });

  const bulkUpdateCategoriesMutation = useMutation({
    mutationFn: async () => {
      const updates: any = {};
      if (bulkCategoryId !== undefined && bulkCategoryId !== CATEGORY_SENTINEL_NO_CHANGE) {
        updates.categoryId = bulkCategoryId;
      }
      if (bulkFundId !== undefined) updates.fundId = bulkFundId;
      if (bulkProgramId !== undefined) updates.programId = bulkProgramId;
      if (bulkFunctionalCategory !== undefined) updates.functionalCategory = bulkFunctionalCategory;

      return await apiRequest('POST', '/api/transactions/bulk-categorize', {
        transactionIds: Array.from(selectedTransactionIds),
        ...updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      setIsBulkCategorizeDialogOpen(false);
      setSelectedTransactionIds(new Set());
      setBulkCategoryId(undefined);
      setBulkFundId(undefined);
      setBulkProgramId(undefined);
      setBulkFunctionalCategory(undefined);
      toast({
        title: "Bulk Update Complete",
        description: `Successfully updated ${selectedTransactionIds.size} transaction(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Update Failed",
        description: error.message || "Failed to update transactions.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/transactions/bulk-delete', {
        transactionIds: Array.from(selectedTransactionIds),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      setSelectedTransactionIds(new Set());
      toast({
        title: "Bulk Delete Complete",
        description: `Successfully deleted ${selectedTransactionIds.size} transaction(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Delete Failed",
        description: error.message || "Failed to delete transactions.",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTransaction(null);
    setAiSuggestion(null);
    setIsFormSplitMode(false);
    setFormSplitItems([]);
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
      date: safeFormatDate(transaction.date, 'yyyy-MM-dd', ''),
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

  const handleOpenSplitDialog = (transaction: Transaction) => {
    setTransactionToSplit(transaction);
    const halfAmount = (parseFloat(transaction.amount) / 2).toFixed(2);
    setSplitItems([
      {
        amount: halfAmount,
        description: transaction.description,
        categoryId: transaction.categoryId,
        grantId: transaction.grantId,
        fundId: transaction.fundId,
        programId: transaction.programId,
        functionalCategory: transaction.functionalCategory,
      },
      {
        amount: (parseFloat(transaction.amount) - parseFloat(halfAmount)).toFixed(2),
        description: transaction.description,
        categoryId: null,
        grantId: null,
        fundId: null,
        programId: null,
        functionalCategory: null,
      },
    ]);
    setIsSplitDialogOpen(true);
  };

  const handleAddSplitItem = () => {
    if (!transactionToSplit) return;
    setSplitItems([
      ...splitItems,
      {
        amount: '0',
        description: transactionToSplit.description,
        categoryId: null,
        grantId: null,
        fundId: null,
        programId: null,
        functionalCategory: null,
      },
    ]);
  };

  const handleRemoveSplitItem = (index: number) => {
    if (splitItems.length <= 2) return;
    setSplitItems(splitItems.filter((_, i) => i !== index));
  };

  const handleSplitItemChange = (index: number, field: keyof SplitItem, value: any) => {
    const newItems = [...splitItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSplitItems(newItems);
  };

  const handleSubmitSplit = () => {
    if (!transactionToSplit) return;
    splitTransactionMutation.mutate({
      transactionId: transactionToSplit.id,
      splits: splitItems,
    });
  };

  const getSplitTotal = () => {
    return splitItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const getSplitDifference = () => {
    if (!transactionToSplit) return 0;
    return parseFloat(transactionToSplit.amount) - getSplitTotal();
  };

  // Form split mode helpers
  const initializeFormSplitMode = () => {
    const totalAmount = parseFloat(formData.amount) || 0;
    const halfAmount = (totalAmount / 2).toFixed(2);
    setFormSplitItems([
      {
        amount: halfAmount,
        description: formData.description,
        categoryId: formData.categoryId || null,
        grantId: formData.grantId || null,
        fundId: formData.fundId || null,
        programId: formData.programId || null,
        functionalCategory: formData.functionalCategory || null,
      },
      {
        amount: (totalAmount - parseFloat(halfAmount)).toFixed(2),
        description: formData.description,
        categoryId: null,
        grantId: null,
        fundId: null,
        programId: null,
        functionalCategory: null,
      },
    ]);
    setIsFormSplitMode(true);
  };

  const handleFormSplitItemChange = (index: number, field: keyof SplitItem, value: any) => {
    const newItems = [...formSplitItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormSplitItems(newItems);
  };

  const handleAddFormSplitItem = () => {
    setFormSplitItems([
      ...formSplitItems,
      {
        amount: '0',
        description: formData.description,
        categoryId: null,
        grantId: null,
        fundId: null,
        programId: null,
        functionalCategory: null,
      },
    ]);
  };

  const handleRemoveFormSplitItem = (index: number) => {
    if (formSplitItems.length <= 2) return;
    setFormSplitItems(formSplitItems.filter((_, i) => i !== index));
  };

  const getFormSplitTotal = () => {
    return formSplitItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const getFormSplitDifference = () => {
    return parseFloat(formData.amount || '0') - getFormSplitTotal();
  };

  const confirmDelete = () => {
    if (deleteTransactionId) {
      deleteMutation.mutate(deleteTransactionId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
    } else if (isFormSplitMode && formSplitItems.length >= 2) {
      // Validate split amounts match total
      const splitDiff = Math.abs(getFormSplitDifference());
      if (splitDiff > 0.01) {
        toast({
          title: "Split amounts don't match",
          description: `The split amounts must equal the total transaction amount. Difference: $${splitDiff.toFixed(2)}`,
          variant: "destructive",
        });
        return;
      }

      // Create the parent transaction first, then immediately split it
      const transactionData: InsertTransaction = {
        ...formData,
        date: new Date(formData.date),
        hasSplits: true,
      };
      
      try {
        // Create the parent transaction
        const response = await apiRequest('POST', '/api/transactions', transactionData);
        const parentTransaction = response as Transaction;
        
        // Then split it with the defined splits
        await apiRequest('POST', `/api/transactions/${parentTransaction.id}/split`, { 
          splits: formSplitItems 
        });
        
        queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
        toast({
          title: "Transaction created and split",
          description: `Created transaction with ${formSplitItems.length} category splits.`,
        });
        handleCloseDialog();
      } catch (error: any) {
        toast({
          title: "Failed to create split transaction",
          description: error.message || "An error occurred while creating the split transaction.",
          variant: "destructive",
        });
      }
    } else {
      // Convert form data to InsertTransaction with Date object
      const transactionData: InsertTransaction = {
        ...formData,
        date: new Date(formData.date),
      };
      createMutation.mutate(transactionData);
    }
  };

  // Server-side search is now used, so we just use the loaded transactions directly
  const filteredTransactions = transactions || [];

  // Bulk operations handlers
  const toggleSelectAll = () => {
    if (selectedTransactionIds.size === filteredTransactions.length) {
      setSelectedTransactionIds(new Set());
    } else {
      setSelectedTransactionIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const toggleSelectTransaction = (id: number) => {
    const newSet = new Set(selectedTransactionIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTransactionIds(newSet);
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/transactions/export/${currentOrganization.id}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${currentOrganization.name}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Complete",
        description: "Transactions exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export transactions.",
        variant: "destructive",
      });
    }
  };

  const handleImportCSV = () => {
    if (!importFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import.",
        variant: "destructive",
      });
      return;
    }
    csvImportMutation.mutate(importFile);
  };

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
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={handleExport}
            data-testid="button-export-csv"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-import-csv">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Transactions from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with transaction data. Required columns: date, description, amount, type (income/expense)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    data-testid="input-csv-file"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum file size: 5MB
                  </p>
                </div>
                <Button
                  onClick={handleImportCSV}
                  disabled={csvImportMutation.isPending || !importFile}
                  className="w-full"
                  data-testid="button-import-submit"
                >
                  {csvImportMutation.isPending ? "Importing..." : "Import Transactions"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isReconciliationDialogOpen} onOpenChange={(open) => {
            setIsReconciliationDialogOpen(open);
            if (open && lastReconciliation) {
              setReconciliationData(prev => ({
                ...prev,
                beginningBalance: lastReconciliation.endingBalance || '',
                accountName: lastReconciliation.accountName || '',
              }));
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-start-reconciliation">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Reconcile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Start Bank Reconciliation</DialogTitle>
                <DialogDescription>
                  Reconcile your transactions with your bank statement
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="account-name">Account Name</Label>
                  <Input
                    id="account-name"
                    placeholder="e.g., Checking Account"
                    value={reconciliationData.accountName}
                    onChange={(e) => setReconciliationData({ ...reconciliationData, accountName: e.target.value })}
                    data-testid="input-account-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statement-end-date">Statement End Date</Label>
                  <Input
                    id="statement-end-date"
                    type="date"
                    value={reconciliationData.statementEndDate}
                    onChange={(e) => setReconciliationData({ ...reconciliationData, statementEndDate: e.target.value })}
                    data-testid="input-statement-end-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beginning-balance">
                    Beginning Balance
                    {lastReconciliation && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (From previous reconciliation)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="beginning-balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reconciliationData.beginningBalance}
                    onChange={(e) => setReconciliationData({ ...reconciliationData, beginningBalance: e.target.value })}
                    data-testid="input-beginning-balance"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ending-balance">Ending Balance (from bank statement)</Label>
                  <Input
                    id="ending-balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={reconciliationData.endingBalance}
                    onChange={(e) => setReconciliationData({ ...reconciliationData, endingBalance: e.target.value })}
                    data-testid="input-ending-balance"
                  />
                </div>
                <Button
                  onClick={() => createReconciliationMutation.mutate()}
                  disabled={createReconciliationMutation.isPending || !reconciliationData.accountName || !reconciliationData.beginningBalance || !reconciliationData.endingBalance}
                  className="w-full"
                  data-testid="button-start-reconciliation-submit"
                >
                  {createReconciliationMutation.isPending ? "Creating..." : "Start Reconciliation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                <div className="space-y-2">
                  <Label htmlFor="parent-category">Parent Category (Optional)</Label>
                  <Select
                    value={newCategoryParentId?.toString() || "none"}
                    onValueChange={(value) => setNewCategoryParentId(value === "none" ? null : parseInt(value))}
                  >
                    <SelectTrigger id="parent-category" data-testid="select-parent-category">
                      <SelectValue placeholder="None (Top-level category)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Top-level category)</SelectItem>
                      {categories
                        ?.filter(c => c.type === newCategoryType && !c.parentCategoryId)
                        .map(category => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
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
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
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

              {/* Grant selection for expenses - nonprofits only */}
              {formData.type === 'expense' && currentOrganization.type === 'nonprofit' && (
                <div className="space-y-2">
                  <Label htmlFor="grant">Grant (Optional)</Label>
                  <Select
                    value={formData.grantId?.toString() || "none"}
                    onValueChange={(value) => setFormData({ ...formData, grantId: value === "none" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger id="grant" data-testid="select-transaction-grant">
                      <SelectValue placeholder="Select a grant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No grant</SelectItem>
                      {grants?.map((grant) => (
                        <SelectItem key={grant.id} value={grant.id.toString()}>
                          {grant.name}
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

              {/* Category Section - with split mode toggle */}
              {!isFormSplitMode ? (
                <>
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
                    <CategoryCombobox
                      categories={categories || []}
                      value={formData.categoryId}
                      onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                      type={formData.type}
                      placeholder="Select a category"
                      allowNone={true}
                      noneSentinel={null}
                      className="w-full"
                      testId="select-transaction-category"
                    />
                  </div>

                  {/* Split Categories Button - only for new transactions */}
                  {!editingTransaction && formData.amount && parseFloat(formData.amount) > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={initializeFormSplitMode}
                      className="w-full"
                      data-testid="button-enable-split-mode"
                    >
                      <Split className="h-4 w-4 mr-2" />
                      Split Into Multiple Categories
                    </Button>
                  )}
                </>
              ) : (
                <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Split Categories</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsFormSplitMode(false);
                        setFormSplitItems([]);
                      }}
                      data-testid="button-cancel-split-mode"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel Split
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {formSplitItems.map((item, index) => (
                      <div key={index} className="p-3 border rounded-md bg-background space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Split {index + 1}</span>
                          {formSplitItems.length > 2 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveFormSplitItem(index)}
                              data-testid={`button-remove-form-split-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.amount}
                              onChange={(e) => handleFormSplitItemChange(index, 'amount', e.target.value)}
                              data-testid={`input-form-split-amount-${index}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => handleFormSplitItemChange(index, 'description', e.target.value)}
                              data-testid={`input-form-split-description-${index}`}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Category</Label>
                          <CategoryCombobox
                            categories={categories || []}
                            value={item.categoryId || undefined}
                            onValueChange={(value) => handleFormSplitItemChange(index, 'categoryId', value || null)}
                            type={formData.type}
                            placeholder="Select category"
                            allowClear={true}
                            clearLabel="No category"
                            className="w-full"
                            testId={`select-form-split-category-${index}`}
                          />
                        </div>

                        {currentOrganization.type === 'nonprofit' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Fund</Label>
                              <Select
                                value={item.fundId?.toString() || "none"}
                                onValueChange={(value) => handleFormSplitItemChange(index, 'fundId', value === "none" ? null : parseInt(value))}
                              >
                                <SelectTrigger data-testid={`select-form-split-fund-${index}`}>
                                  <SelectValue placeholder="Select fund" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {funds?.map(fund => (
                                    <SelectItem key={fund.id} value={fund.id.toString()}>
                                      {fund.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Program</Label>
                              <Select
                                value={item.programId?.toString() || "none"}
                                onValueChange={(value) => handleFormSplitItemChange(index, 'programId', value === "none" ? null : parseInt(value))}
                              >
                                <SelectTrigger data-testid={`select-form-split-program-${index}`}>
                                  <SelectValue placeholder="Select program" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {programs?.map(program => (
                                    <SelectItem key={program.id} value={program.id.toString()}>
                                      {program.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Grant</Label>
                              <Select
                                value={item.grantId?.toString() || "none"}
                                onValueChange={(value) => handleFormSplitItemChange(index, 'grantId', value === "none" ? null : parseInt(value))}
                              >
                                <SelectTrigger data-testid={`select-form-split-grant-${index}`}>
                                  <SelectValue placeholder="Select grant" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {grants?.map(grant => (
                                    <SelectItem key={grant.id} value={grant.id.toString()}>
                                      {grant.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddFormSplitItem}
                    className="w-full"
                    data-testid="button-add-form-split"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Split
                  </Button>

                  <div className="p-3 border rounded-md bg-background">
                    <div className="flex justify-between text-sm">
                      <span>Total of splits:</span>
                      <span className="font-mono">${getFormSplitTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span>Transaction amount:</span>
                      <span className="font-mono">${parseFloat(formData.amount || '0').toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between text-sm mt-1 font-medium ${Math.abs(getFormSplitDifference()) > 0.01 ? 'text-destructive' : 'text-chart-2'}`}>
                      <span>Difference:</span>
                      <span className="font-mono">${getFormSplitDifference().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

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
            <div className="flex flex-wrap items-center justify-between gap-4">
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
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="batch-size" className="text-sm whitespace-nowrap">
                      Batch size:
                    </Label>
                    <Select
                      value={aiBatchSize.toString()}
                      onValueChange={(value) => {
                        const newSize = parseInt(value);
                        setAiBatchSize(newSize);
                        localStorage.setItem('aiBatchSize', value);
                      }}
                    >
                      <SelectTrigger id="batch-size" className="w-24" data-testid="select-ai-batch-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="40">40</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      const transactionsToProcess = uncategorizedTransactions.slice(0, aiBatchSize);
                      bulkCategorizeMutation.mutate(transactionsToProcess);
                    }}
                    disabled={bulkCategorizeMutation.isPending}
                    data-testid="button-bulk-categorize"
                  >
                    {bulkCategorizeMutation.isPending 
                      ? "Analyzing..." 
                      : `Categorize ${Math.min(aiBatchSize, uncategorizedTransactions.length)}`
                    }
                  </Button>
                </div>
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

      {/* Bulk Action Toolbar */}
      {selectedTransactionIds.size > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" data-testid="badge-selected-count">
                  {selectedTransactionIds.size} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTransactionIds(new Set())}
                  data-testid="button-clear-selection"
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkCategorizeDialogOpen(true)}
                  data-testid="button-bulk-categorize"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Categorize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                  disabled={bulkDeleteMutation.isPending}
                  data-testid="button-bulk-delete"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check Register */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Transaction Register</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 px-6">
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
            <div style={{ maxHeight: 'calc(100vh - 250px)', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
              <div className="overflow-x-auto flex-1 overflow-y-auto scroll-smooth">
                <table className="w-full" style={{ minWidth: '900px' }}>
                  <thead className="sticky top-0 bg-card z-10 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 bg-card w-12">
                        <Checkbox
                          checked={selectedTransactionIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground bg-card whitespace-nowrap">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground bg-card">Description</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground bg-card">Category</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground bg-card whitespace-nowrap">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground bg-card whitespace-nowrap">Amount</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground bg-card whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    const category = categories?.find(c => c.id === transaction.categoryId);
                    const isMatched = matchedIdsSet.has(transaction.id);
                    return (
                      <tr 
                        key={transaction.id} 
                        className={`border-b hover-elevate ${isMatched ? 'opacity-50 bg-muted/30' : ''}`}
                        data-testid={`transaction-row-${transaction.id}`}
                      >
                        <td className="py-3 px-4">
                          <Checkbox
                            checked={selectedTransactionIds.has(transaction.id)}
                            onCheckedChange={() => toggleSelectTransaction(transaction.id)}
                            data-testid={`checkbox-transaction-${transaction.id}`}
                          />
                        </td>
                        <td className="py-3 px-4 text-sm whitespace-nowrap">
                          {safeFormatDate(transaction.date, 'MM/dd/yyyy')}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{transaction.description}</span>
                            {isMatched && (
                              <Badge variant="secondary" className="text-xs shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Matched</Badge>
                            )}
                            {transaction.hasSplits && (
                              <Badge variant="secondary" className="text-xs shrink-0">Split</Badge>
                            )}
                            {transaction.isSplitChild && (
                              <Badge variant="outline" className="text-xs shrink-0">Part of split</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {category ? (
                            <div className="text-xs leading-tight">
                              {category.parentCategoryId && (() => {
                                const parentCategory = categories?.find(c => c.id === category.parentCategoryId);
                                return parentCategory ? (
                                  <div className="text-muted-foreground">{parentCategory.name}</div>
                                ) : null;
                              })()}
                              <Badge variant="outline" className="text-xs whitespace-normal">
                                {category.name}
                              </Badge>
                            </div>
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
                          <div className="flex gap-1 justify-end">
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
                            {!transaction.hasSplits && !transaction.isSplitChild && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleOpenSplitDialog(transaction)}
                                title="Split transaction"
                                data-testid={`button-split-${transaction.id}`}
                              >
                                <Split className="h-4 w-4" />
                              </Button>
                            )}
                            {transaction.hasSplits && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => unsplitTransactionMutation.mutate(transaction.id)}
                                title="Unsplit and restore original transaction"
                                data-testid={`button-unsplit-${transaction.id}`}
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            )}
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
              
              {/* Load More / Pagination Info */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground" data-testid="text-transaction-count-info">
                  Showing {filteredTransactions.length} of {totalTransactions} transactions
                </p>
                {hasMoreTransactions && (
                  <Button
                    variant="outline"
                    onClick={loadMoreTransactions}
                    disabled={isLoadingMore}
                    data-testid="button-load-more"
                  >
                    {isLoadingMore ? "Loading..." : `Load More (${totalTransactions - filteredTransactions.length} remaining)`}
                  </Button>
                )}
              </div>
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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-confirm-bulk-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedTransactionIds.size} Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTransactionIds.size} selected transaction(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkDeleteMutation.mutate();
                setIsBulkDeleteDialogOpen(false);
              }}
              data-testid="button-confirm-bulk-delete"
            >
              Delete All
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

      {/* Bulk Categorize Dialog */}
      <Dialog open={isBulkCategorizeDialogOpen} onOpenChange={setIsBulkCategorizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Categorize Transactions</DialogTitle>
            <DialogDescription>
              Update category, fund, program, or functional category for {selectedTransactionIds.size} selected transaction(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-category">Category (Optional)</Label>
              <CategoryCombobox
                categories={categories || []}
                value={bulkCategoryId}
                onValueChange={(value) => setBulkCategoryId(value)}
                type="expense"
                placeholder="Select a category"
                allowNone={true}
                noneLabel="No change"
                noneSentinel={CATEGORY_SENTINEL_NO_CHANGE}
                allowClear={true}
                clearLabel="Clear category"
                className="w-full"
                testId="select-bulk-category"
              />
            </div>

            {currentOrganization.type === 'nonprofit' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bulk-fund">Fund (Optional)</Label>
                  <Select
                    value={bulkFundId?.toString() || "none"}
                    onValueChange={(value) => setBulkFundId(value === "none" ? undefined : parseInt(value))}
                  >
                    <SelectTrigger id="bulk-fund" data-testid="select-bulk-fund">
                      <SelectValue placeholder="Select fund" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No change</SelectItem>
                      {funds?.map(fund => (
                        <SelectItem key={fund.id} value={fund.id.toString()}>
                          {fund.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk-program">Program (Optional)</Label>
                  <Select
                    value={bulkProgramId?.toString() || "none"}
                    onValueChange={(value) => setBulkProgramId(value === "none" ? undefined : parseInt(value))}
                  >
                    <SelectTrigger id="bulk-program" data-testid="select-bulk-program">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No change</SelectItem>
                      {programs?.map(program => (
                        <SelectItem key={program.id} value={program.id.toString()}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk-functional">Functional Category (Optional)</Label>
                  <Select
                    value={bulkFunctionalCategory || "none"}
                    onValueChange={(value: any) => setBulkFunctionalCategory(value === "none" ? undefined : value)}
                  >
                    <SelectTrigger id="bulk-functional" data-testid="select-bulk-functional">
                      <SelectValue placeholder="Select functional category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No change</SelectItem>
                      <SelectItem value="program">Program Services</SelectItem>
                      <SelectItem value="administrative">Management & General</SelectItem>
                      <SelectItem value="fundraising">Fundraising</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button
              onClick={() => bulkUpdateCategoriesMutation.mutate()}
              disabled={bulkUpdateCategoriesMutation.isPending}
              className="w-full"
              data-testid="button-bulk-categorize-submit"
            >
              {bulkUpdateCategoriesMutation.isPending ? "Updating..." : "Update Transactions"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Split Transaction Dialog */}
      <Dialog open={isSplitDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsSplitDialogOpen(false);
          setTransactionToSplit(null);
          setSplitItems([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Split Transaction</DialogTitle>
            <DialogDescription>
              Divide this transaction into multiple parts with different categories or allocations.
            </DialogDescription>
          </DialogHeader>
          {transactionToSplit && (
            <div className="space-y-4 mt-4">
              <div className="p-4 border rounded-md bg-muted/50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{transactionToSplit.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {safeFormatDate(transactionToSplit.date, 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-bold ${transactionToSplit.type === 'income' ? 'text-chart-2' : 'text-chart-3'}`}>
                      {transactionToSplit.type === 'income' ? '+' : '-'}${parseFloat(transactionToSplit.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Original Amount</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {splitItems.map((item, index) => (
                  <div key={index} className="p-4 border rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Split {index + 1}</span>
                      {splitItems.length > 2 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveSplitItem(index)}
                          data-testid={`button-remove-split-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Amount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => handleSplitItemChange(index, 'amount', e.target.value)}
                          data-testid={`input-split-amount-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleSplitItemChange(index, 'description', e.target.value)}
                          data-testid={`input-split-description-${index}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Category</Label>
                      <CategoryCombobox
                        categories={categories || []}
                        value={item.categoryId || undefined}
                        onValueChange={(value) => handleSplitItemChange(index, 'categoryId', value || null)}
                        type={transactionToSplit.type}
                        placeholder="Select category"
                        allowClear={true}
                        clearLabel="No category"
                        className="w-full"
                        testId={`select-split-category-${index}`}
                      />
                    </div>

                    {currentOrganization.type === 'nonprofit' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Fund</Label>
                          <Select
                            value={item.fundId?.toString() || "none"}
                            onValueChange={(value) => handleSplitItemChange(index, 'fundId', value === "none" ? null : parseInt(value))}
                          >
                            <SelectTrigger data-testid={`select-split-fund-${index}`}>
                              <SelectValue placeholder="Select fund" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {funds?.map(fund => (
                                <SelectItem key={fund.id} value={fund.id.toString()}>
                                  {fund.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Program</Label>
                          <Select
                            value={item.programId?.toString() || "none"}
                            onValueChange={(value) => handleSplitItemChange(index, 'programId', value === "none" ? null : parseInt(value))}
                          >
                            <SelectTrigger data-testid={`select-split-program-${index}`}>
                              <SelectValue placeholder="Select program" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {programs?.map(program => (
                                <SelectItem key={program.id} value={program.id.toString()}>
                                  {program.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Grant</Label>
                          <Select
                            value={item.grantId?.toString() || "none"}
                            onValueChange={(value) => handleSplitItemChange(index, 'grantId', value === "none" ? null : parseInt(value))}
                          >
                            <SelectTrigger data-testid={`select-split-grant-${index}`}>
                              <SelectValue placeholder="Select grant" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {grants?.map(grant => (
                                <SelectItem key={grant.id} value={grant.id.toString()}>
                                  {grant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={handleAddSplitItem}
                className="w-full"
                data-testid="button-add-split"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Split
              </Button>

              <div className="p-4 border rounded-md bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span>Total of splits:</span>
                  <span className="font-mono">${getSplitTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Original amount:</span>
                  <span className="font-mono">${parseFloat(transactionToSplit.amount).toFixed(2)}</span>
                </div>
                <div className={`flex justify-between text-sm mt-1 font-medium ${Math.abs(getSplitDifference()) > 0.01 ? 'text-destructive' : 'text-chart-2'}`}>
                  <span>Difference:</span>
                  <span className="font-mono">${getSplitDifference().toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handleSubmitSplit}
                disabled={splitTransactionMutation.isPending || Math.abs(getSplitDifference()) > 0.01}
                className="w-full"
                data-testid="button-submit-split"
              >
                {splitTransactionMutation.isPending ? "Splitting..." : "Split Transaction"}
              </Button>
              
              {Math.abs(getSplitDifference()) > 0.01 && (
                <p className="text-sm text-destructive text-center">
                  Split amounts must equal the original transaction amount
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
