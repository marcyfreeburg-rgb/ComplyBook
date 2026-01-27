import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  PiggyBank,
  Info,
  Plus,
  Check
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Budget } from "@shared/schema";

interface BudgetSuggestion {
  categoryId: number;
  categoryName: string;
  type: 'income' | 'expense';
  suggestedMonthlyAmount: number;
  basedOnAverage: number;
  basedOnMedian: number;
  variance: number;
  confidence: number;
  reasoning: string;
}

interface BudgetSuggestionPanelProps {
  organizationId: number;
  budgets?: Budget[];
}

export function BudgetSuggestionPanel({ organizationId, budgets = [] }: BudgetSuggestionPanelProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [lookbackMonths, setLookbackMonths] = useState("6");
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<BudgetSuggestion | null>(null);
  const [isBudgetSelectDialogOpen, setIsBudgetSelectDialogOpen] = useState(false);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());

  const { data: suggestions, isLoading, refetch, isFetching } = useQuery<BudgetSuggestion[]>({
    queryKey: ['/api/ai/suggest-budget', organizationId, lookbackMonths],
    queryFn: async () => {
      const response = await fetch(`/api/ai/suggest-budget/${organizationId}?months=${lookbackMonths}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get budget suggestions');
      }
      return response.json();
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const incomeSuggestions = suggestions?.filter(s => s.type === 'income') || [];
  const expenseSuggestions = suggestions?.filter(s => s.type === 'expense') || [];
  
  const totalSuggestedIncome = incomeSuggestions.reduce((sum, s) => sum + s.suggestedMonthlyAmount, 0);
  const totalSuggestedExpenses = expenseSuggestions.reduce((sum, s) => sum + s.suggestedMonthlyAmount, 0);
  const projectedSavings = totalSuggestedIncome - totalSuggestedExpenses;

  // Mutation to add a budget item
  const addBudgetItemMutation = useMutation({
    mutationFn: async ({ budgetId, suggestion }: { budgetId: number; suggestion: BudgetSuggestion }) => {
      const response = await apiRequest('POST', `/api/budgets/${budgetId}/items`, {
        categoryId: suggestion.categoryId,
        amount: suggestion.suggestedMonthlyAmount.toFixed(2),
        notes: `AI suggestion: ${suggestion.reasoning}`,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/budgets/${variables.budgetId}/items`] });
      const key = `${variables.budgetId}-${variables.suggestion.categoryId}`;
      setAddedSuggestions(prev => new Set(prev).add(key));
      toast({
        title: "Added to budget",
        description: `${variables.suggestion.categoryName} ($${variables.suggestion.suggestedMonthlyAmount.toFixed(2)}) added to budget.`,
      });
      setIsBudgetSelectDialogOpen(false);
      setPendingSuggestion(null);
      setSelectedBudgetId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add",
        description: error.message || "Could not add suggestion to budget.",
        variant: "destructive",
      });
    },
  });

  const handleAddToBudget = (suggestion: BudgetSuggestion) => {
    if (budgets.length === 0) {
      toast({
        title: "No budgets available",
        description: "Create a budget first before adding suggestions.",
        variant: "destructive",
      });
      return;
    }

    if (budgets.length === 1) {
      // Only one budget, add directly
      addBudgetItemMutation.mutate({ budgetId: budgets[0].id, suggestion });
    } else {
      // Multiple budgets, show selection dialog
      setPendingSuggestion(suggestion);
      setIsBudgetSelectDialogOpen(true);
    }
  };

  const confirmAddToBudget = () => {
    if (selectedBudgetId && pendingSuggestion) {
      addBudgetItemMutation.mutate({ budgetId: selectedBudgetId, suggestion: pendingSuggestion });
    }
  };

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate" data-testid="button-toggle-budget-suggestions">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg" data-testid="text-budget-suggestions-title">AI Budget Suggestions</CardTitle>
                  <CardDescription>
                    Get personalized budget recommendations based on your spending history
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {suggestions && suggestions.length > 0 && (
                  <Badge variant="secondary" data-testid="badge-suggestion-count">
                    {suggestions.length} categories
                  </Badge>
                )}
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* AI Transparency Box */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg" data-testid="div-ai-explanation">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">How AI Suggestions Work</p>
                  <ul className="space-y-0.5 text-blue-700 dark:text-blue-300">
                    <li>Analyzes your categorized transactions from the selected period</li>
                    <li>Excludes one-time or unusual expenses from averages</li>
                    <li>Uses both median and average for more accurate predictions</li>
                    <li>Confidence scores indicate data reliability (more data = higher confidence)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Based on last</span>
                <Select value={lookbackMonths} onValueChange={setLookbackMonths}>
                  <SelectTrigger className="w-24" data-testid="select-budget-lookback">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isFetching}
                data-testid="button-refresh-budget"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isLoading || isFetching ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : suggestions && suggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Not enough categorized transactions for budget suggestions.</p>
                <p className="text-sm">Add more transactions with categories to get recommendations.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Budget Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-muted-foreground">Monthly Income</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600" data-testid="budget-income">
                        ${totalSuggestedIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-muted-foreground">Monthly Expenses</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600" data-testid="budget-expenses">
                        ${totalSuggestedExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className={`${projectedSavings >= 0 ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <PiggyBank className={`w-4 h-4 ${projectedSavings >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                        <span className="text-sm text-muted-foreground">Projected Balance</span>
                      </div>
                      <p className={`text-2xl font-bold ${projectedSavings >= 0 ? 'text-blue-600' : 'text-orange-600'}`} data-testid="budget-balance">
                        {projectedSavings >= 0 ? '+' : ''}${projectedSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Income Categories */}
                {incomeSuggestions.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      Income Categories ({incomeSuggestions.length})
                    </h3>
                    <div className="space-y-2">
                      {incomeSuggestions.map((suggestion) => (
                        <SuggestionRow 
                          key={suggestion.categoryId} 
                          suggestion={suggestion}
                          onAdd={handleAddToBudget}
                          isAdding={addBudgetItemMutation.isPending && pendingSuggestion?.categoryId === suggestion.categoryId}
                          isAdded={Array.from(addedSuggestions).some(key => key.endsWith(`-${suggestion.categoryId}`))}
                          hasBudgets={budgets.length > 0}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Expense Categories */}
                {expenseSuggestions.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      Expense Categories ({expenseSuggestions.length})
                    </h3>
                    <div className="space-y-2">
                      {expenseSuggestions.map((suggestion) => (
                        <SuggestionRow 
                          key={suggestion.categoryId} 
                          suggestion={suggestion}
                          onAdd={handleAddToBudget}
                          isAdding={addBudgetItemMutation.isPending && pendingSuggestion?.categoryId === suggestion.categoryId}
                          isAdded={Array.from(addedSuggestions).some(key => key.endsWith(`-${suggestion.categoryId}`))}
                          hasBudgets={budgets.length > 0}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Budget Selection Dialog */}
      <Dialog open={isBudgetSelectDialogOpen} onOpenChange={setIsBudgetSelectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Budget</DialogTitle>
            <DialogDescription>
              Choose which budget to add "{pendingSuggestion?.categoryName}" (${pendingSuggestion?.suggestedMonthlyAmount.toFixed(2)}) to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select 
              value={selectedBudgetId?.toString() || ""} 
              onValueChange={(value) => setSelectedBudgetId(parseInt(value))}
            >
              <SelectTrigger data-testid="select-budget-for-suggestion">
                <SelectValue placeholder="Select a budget..." />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((budget) => (
                  <SelectItem key={budget.id} value={budget.id.toString()}>
                    {budget.name} ({new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBudgetSelectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmAddToBudget} 
              disabled={!selectedBudgetId || addBudgetItemMutation.isPending}
              data-testid="button-confirm-add-to-budget"
            >
              {addBudgetItemMutation.isPending ? "Adding..." : "Add to Budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

interface SuggestionRowProps {
  suggestion: BudgetSuggestion;
  onAdd?: (suggestion: BudgetSuggestion) => void;
  isAdding?: boolean;
  isAdded?: boolean;
  hasBudgets?: boolean;
}

function SuggestionRow({ suggestion, onAdd, isAdding, isAdded, hasBudgets }: SuggestionRowProps) {
  const isIncome = suggestion.type === 'income';
  
  return (
    <div 
      className={`border rounded-lg p-3 ${isIncome ? 'bg-green-50/30 dark:bg-green-950/10' : 'bg-red-50/30 dark:bg-red-950/10'}`}
      data-testid={`budget-row-${suggestion.categoryId}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{suggestion.categoryName}</span>
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant={suggestion.confidence >= 70 ? "default" : "secondary"}
                className="text-xs"
              >
                {suggestion.confidence}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Confidence based on data consistency
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
            ${suggestion.suggestedMonthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {onAdd && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isAdded ? "secondary" : "outline"}
                  onClick={() => onAdd(suggestion)}
                  disabled={isAdding || isAdded || !hasBudgets}
                  data-testid={`button-add-suggestion-${suggestion.categoryId}`}
                >
                  {isAdded ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!hasBudgets 
                  ? "Create a budget first" 
                  : isAdded 
                    ? "Added to budget" 
                    : "Add to budget"
                }
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          Avg: ${suggestion.basedOnAverage.toFixed(2)}
        </span>
        <span>Median: ${suggestion.basedOnMedian.toFixed(2)}</span>
        {suggestion.variance > 0 && (
          <span>Variance: ±${suggestion.variance.toFixed(2)}</span>
        )}
      </div>

      <div className="mt-2 flex items-start gap-1 text-xs text-muted-foreground">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>{suggestion.reasoning}</span>
      </div>
    </div>
  );
}
