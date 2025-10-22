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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowUpRight, ArrowDownRight, Search, Calendar, Sparkles, Check, X } from "lucide-react";
import { format } from "date-fns";
import type { Organization, Transaction, Category, InsertTransaction } from "@shared/schema";

interface CategorySuggestion {
  categoryId: number;
  categoryName: string;
  confidence: number;
  reasoning: string;
}

interface TransactionsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Transactions({ currentOrganization, userId }: TransactionsProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<CategorySuggestion | null>(null);
  const [formData, setFormData] = useState<Partial<InsertTransaction>>({
    organizationId: currentOrganization.id,
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    categoryId: undefined,
    grantId: undefined,
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
      setIsDialogOpen(false);
      setAiSuggestion(null);
      setFormData({
        organizationId: currentOrganization.id,
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        categoryId: undefined,
        grantId: undefined,
        createdBy: userId,
      });
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
      return response as CategorySuggestion;
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
    createMutation.mutate(formData as InsertTransaction);
  };

  const filteredTransactions = transactions?.filter(t => 
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-transaction">
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
              <DialogDescription>
                Record a new income or expense transaction for {currentOrganization.name}.
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
                      onClick={() => setAiSuggestion(null)}
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
                        setFormData({ ...formData, categoryId: aiSuggestion.categoryId });
                        setAiSuggestion(null);
                        toast({
                          title: "Category Applied",
                          description: `Set to: ${aiSuggestion.categoryName}`,
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
                      onClick={() => setAiSuggestion(null)}
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
                <Label htmlFor="category">Category {!aiSuggestion && "(Optional)"}</Label>
                <Select
                  value={formData.categoryId?.toString() || "none"}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value === "none" ? undefined : parseInt(value) })}
                >
                  <SelectTrigger id="category" data-testid="select-transaction-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories?.map((cat) => (
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
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-transaction"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-transaction"
                >
                  {createMutation.isPending ? "Creating..." : "Create Transaction"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
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
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-md bg-muted/30 hover-elevate"
                  data-testid={`transaction-item-${transaction.id}`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0 ${
                      transaction.type === 'income' ? 'bg-chart-2/10' : 'bg-chart-3/10'
                    }`}>
                      {transaction.type === 'income' ? (
                        <ArrowUpRight className="h-5 w-5 text-chart-2" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-chart-3" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className={`text-lg font-mono font-medium flex-shrink-0 ${
                    transaction.type === 'income' ? 'text-chart-2' : 'text-chart-3'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    ${parseFloat(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
