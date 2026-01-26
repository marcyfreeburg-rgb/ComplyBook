import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Info
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
}

export function BudgetSuggestionPanel({ organizationId }: BudgetSuggestionPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [lookbackMonths, setLookbackMonths] = useState("6");

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
                        <SuggestionRow key={suggestion.categoryId} suggestion={suggestion} />
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
                        <SuggestionRow key={suggestion.categoryId} suggestion={suggestion} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface SuggestionRowProps {
  suggestion: BudgetSuggestion;
}

function SuggestionRow({ suggestion }: SuggestionRowProps) {
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
        <span className={`text-lg font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
          ${suggestion.suggestedMonthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
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
