import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  FileText,
  X,
  Eye
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

interface RecurringPattern {
  vendorName: string;
  vendorId?: number;
  categoryId?: number;
  categoryName?: string;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  transactionType: 'income' | 'expense';
  transactionCount: number;
  transactions: Array<{
    id: number;
    date: string;
    amount: string;
    description: string;
  }>;
  confidence: number;
  suggestedBillName?: string;
}

interface RecurringPatternDetectorProps {
  organizationId: number;
  filterType?: 'expense' | 'income' | 'all';
  onAddRecurringIncome?: (pattern: RecurringPattern) => void;
}

export function RecurringPatternDetector({ 
  organizationId, 
  filterType = 'all',
  onAddRecurringIncome 
}: RecurringPatternDetectorProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [lookbackMonths, setLookbackMonths] = useState("6");
  const [expandedPatterns, setExpandedPatterns] = useState<Set<string>>(new Set());

  // Track patterns that have been added in this session
  const [addedPatterns, setAddedPatterns] = useState<Set<string>>(new Set());

  const { data: patterns, isLoading, refetch, isFetching } = useQuery<RecurringPattern[]>({
    queryKey: ['/api/ai/detect-recurring', organizationId, lookbackMonths],
    queryFn: async () => {
      const response = await fetch(`/api/ai/detect-recurring/${organizationId}?months=${lookbackMonths}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to detect patterns');
      }
      return response.json();
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch existing bills to check which patterns are already added
  const { data: existingBills } = useQuery<Array<{ vendorName: string | null }>>({
    queryKey: ['/api/bills', organizationId],
    enabled: isOpen && filterType !== 'income',
  });

  // Fetch existing recurring transactions to check which income patterns are already added
  const { data: existingRecurring } = useQuery<Array<{ description: string; type: string }>>({
    queryKey: [`/api/recurring-transactions/${organizationId}`],
    enabled: isOpen && filterType !== 'expense',
  });

  // Check if a pattern has already been added
  const isPatternAdded = (pattern: RecurringPattern): boolean => {
    // Check session-added patterns first (normalized key)
    const patternKey = `${pattern.vendorName.toLowerCase()}-${pattern.transactionType}`;
    if (addedPatterns.has(patternKey)) return true;

    const normalizedVendor = pattern.vendorName.toLowerCase().trim();

    if (pattern.transactionType === 'expense') {
      // Check if bill with this vendor already exists (case-insensitive exact match)
      return existingBills?.some(bill => 
        bill.vendorName?.toLowerCase().trim() === normalizedVendor
      ) || false;
    } else {
      // Check if recurring income with this description already exists (case-insensitive exact match)
      return existingRecurring?.some(rt => 
        rt.type === 'income' && rt.description.toLowerCase().trim() === normalizedVendor
      ) || false;
    }
  };

  // Track which pattern is currently being added
  const [addingPattern, setAddingPattern] = useState<string | null>(null);

  const createBillMutation = useMutation({
    mutationFn: async (pattern: RecurringPattern) => {
      setAddingPattern(`${pattern.vendorName.toLowerCase()}-${pattern.transactionType}`);
      return apiRequest('POST', `/api/ai/create-bill-from-pattern/${organizationId}`, pattern);
    },
    onSuccess: (_data, pattern) => {
      // Mark pattern as added
      const patternKey = `${pattern.vendorName.toLowerCase()}-${pattern.transactionType}`;
      setAddedPatterns(prev => new Set([...Array.from(prev), patternKey]));
      setAddingPattern(null);
      toast({
        title: "Bill Created",
        description: "A new recurring bill has been created from the detected pattern.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/detect-recurring'] });
    },
    onError: (error: Error) => {
      setAddingPattern(null);
      toast({
        title: "Error",
        description: error.message || "Failed to create bill",
        variant: "destructive",
      });
    },
  });

  // Handle adding income pattern as recurring transaction
  const handleAddIncome = (pattern: RecurringPattern) => {
    if (onAddRecurringIncome) {
      const patternKey = `${pattern.vendorName.toLowerCase()}-${pattern.transactionType}`;
      setAddedPatterns(prev => new Set([...Array.from(prev), patternKey]));
      onAddRecurringIncome(pattern);
    }
  };

  const dismissPatternMutation = useMutation({
    mutationFn: async (pattern: RecurringPattern) => {
      return apiRequest('POST', `/api/ai/dismiss-pattern/${organizationId}`, {
        vendorName: pattern.vendorName,
        patternType: pattern.transactionType,
        frequency: pattern.frequency,
        averageAmount: pattern.averageAmount,
        reason: 'not_recurring'
      });
    },
    onSuccess: () => {
      toast({
        title: "Pattern Dismissed",
        description: "This pattern will no longer appear in suggestions.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/detect-recurring'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to dismiss pattern",
        variant: "destructive",
      });
    },
  });

  const togglePattern = (vendorName: string) => {
    const newExpanded = new Set(expandedPatterns);
    if (newExpanded.has(vendorName)) {
      newExpanded.delete(vendorName);
    } else {
      newExpanded.add(vendorName);
    }
    setExpandedPatterns(newExpanded);
  };

  const frequencyLabels: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Every 2 Weeks',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly'
  };

  // Filter patterns based on filterType prop
  const expensePatterns = filterType !== 'income' 
    ? (patterns?.filter(p => p.transactionType === 'expense') || [])
    : [];
  const incomePatterns = filterType !== 'expense' 
    ? (patterns?.filter(p => p.transactionType === 'income') || [])
    : [];
  
  // Calculate visible count based on filter
  const visibleCount = expensePatterns.length + incomePatterns.length;

  // Generate description based on filter type
  const getDescription = () => {
    if (filterType === 'expense') {
      return "Analyze transactions to find recurring expenses and create bills automatically";
    } else if (filterType === 'income') {
      return "Analyze transactions to find recurring income and add to your forecast";
    }
    return "Analyze transactions to find recurring patterns automatically";
  };

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate" data-testid="button-toggle-pattern-detection">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-lg" data-testid="text-pattern-detection-title">AI Pattern Detection</CardTitle>
                  <CardDescription>
                    {getDescription()}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {visibleCount > 0 && (
                  <Badge variant="secondary" data-testid="badge-pattern-count">
                    {visibleCount} patterns found
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
                <span className="text-sm text-muted-foreground">Analyze last</span>
                <Select value={lookbackMonths} onValueChange={setLookbackMonths}>
                  <SelectTrigger className="w-24" data-testid="select-lookback-months">
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
                data-testid="button-refresh-patterns"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isLoading || isFetching ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : visibleCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No {filterType === 'expense' ? 'recurring expense' : filterType === 'income' ? 'recurring income' : 'recurring'} patterns detected in your transactions.</p>
                <p className="text-sm">Try increasing the lookback period or add more transactions.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {expensePatterns.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-red-500" />
                      Recurring Expenses ({expensePatterns.length})
                    </h3>
                    <div className="space-y-2">
                      {expensePatterns.map((pattern) => (
                        <PatternCard
                          key={pattern.vendorName}
                          pattern={pattern}
                          isExpanded={expandedPatterns.has(pattern.vendorName)}
                          onToggle={() => togglePattern(pattern.vendorName)}
                          onCreateBill={() => createBillMutation.mutate(pattern)}
                          onDismiss={() => dismissPatternMutation.mutate(pattern)}
                          isCreating={createBillMutation.isPending}
                          isDismissing={dismissPatternMutation.isPending}
                          frequencyLabels={frequencyLabels}
                          isAdded={isPatternAdded(pattern)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {incomePatterns.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      Recurring Income ({incomePatterns.length})
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      These recurring deposits can be used in your budget forecast as expected monthly revenue.
                    </p>
                    <div className="space-y-2">
                      {incomePatterns.map((pattern) => (
                        <PatternCard
                          key={pattern.vendorName}
                          pattern={pattern}
                          isExpanded={expandedPatterns.has(pattern.vendorName)}
                          onToggle={() => togglePattern(pattern.vendorName)}
                          onAddIncome={onAddRecurringIncome ? () => handleAddIncome(pattern) : undefined}
                          onDismiss={() => dismissPatternMutation.mutate(pattern)}
                          isDismissing={dismissPatternMutation.isPending}
                          frequencyLabels={frequencyLabels}
                          isIncome
                          isAdded={isPatternAdded(pattern)}
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
    </Card>
  );
}

interface PatternCardProps {
  pattern: RecurringPattern;
  isExpanded: boolean;
  onToggle: () => void;
  onCreateBill?: () => void;
  onAddIncome?: () => void;
  onDismiss?: () => void;
  isCreating?: boolean;
  isDismissing?: boolean;
  frequencyLabels: Record<string, string>;
  isIncome?: boolean;
  isAdded?: boolean;
}

function PatternCard({ 
  pattern, 
  isExpanded, 
  onToggle, 
  onCreateBill,
  onAddIncome,
  onDismiss,
  isCreating,
  isDismissing,
  frequencyLabels,
  isIncome,
  isAdded = false
}: PatternCardProps) {
  const vendorSlug = pattern.vendorName.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div 
      className={`border rounded-lg p-4 ${isIncome ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-orange-50/50 dark:bg-orange-950/20'}`}
      data-testid={`pattern-card-${vendorSlug}`}
    >
      <div className="mb-2 text-sm text-muted-foreground" data-testid={`text-pattern-summary-${vendorSlug}`}>
        We detected {pattern.transactionCount} payments to <span className="font-medium text-foreground">{pattern.vendorName}</span> (~${pattern.averageAmount.toFixed(2)} each, every ~{frequencyLabels[pattern.frequency]?.toLowerCase() || pattern.frequency}). 
        {!isIncome ? ' Add as recurring bill?' : ' Include in forecast?'}
      </div>
      
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-medium">{pattern.vendorName}</h4>
            <Badge variant="outline" className="text-xs">
              {frequencyLabels[pattern.frequency] || pattern.frequency}
            </Badge>
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant={pattern.confidence >= 80 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {pattern.confidence}% confident
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {pattern.confidence >= 80 ? 'High confidence' : 'Medium confidence'} - based on {pattern.transactionCount} matching transactions
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Avg: ${pattern.averageAmount.toFixed(2)}
            </span>
            {pattern.minAmount !== pattern.maxAmount && (
              <span>Range: ${pattern.minAmount.toFixed(2)} - ${pattern.maxAmount.toFixed(2)}</span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {pattern.transactionCount} transactions
            </span>
          </div>

          {pattern.categoryName && (
            <div className="mt-1">
              <Badge variant="secondary" className="text-xs">
                {pattern.categoryName}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Show "Added" badge if pattern was already added */}
          {isAdded ? (
            <Badge variant="outline" className="text-xs" data-testid={`badge-added-${vendorSlug}`}>
              Added
            </Badge>
          ) : (
            <>
              {/* Add to Bills button for expenses */}
              {!isIncome && onCreateBill && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={onCreateBill}
                      disabled={isCreating}
                      data-testid={`button-create-bill-${vendorSlug}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add to Bills
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Create a recurring bill from this pattern (pre-fills vendor, amount, frequency)
                  </TooltipContent>
                </Tooltip>
              )}
              {/* Add to Recurring Income button for income */}
              {isIncome && onAddIncome && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={onAddIncome}
                      data-testid={`button-add-income-${vendorSlug}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add to Recurring Income
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Add this income pattern to your recurring transactions
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}
          {onDismiss && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDismiss}
                  disabled={isDismissing}
                  data-testid={`button-dismiss-${vendorSlug}`}
                >
                  <X className="w-4 h-4 mr-1" />
                  Not Recurring
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Dismiss this pattern - it won't appear in future suggestions
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                data-testid={`button-review-${vendorSlug}`}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isExpanded ? 'Hide' : 'Review'} transactions
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t">
          <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Transaction Evidence
          </h5>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {pattern.transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background"
                data-testid={`row-transaction-${tx.id}`}
              >
                <span className="text-muted-foreground">{tx.date}</span>
                <span className="truncate flex-1 mx-4">{tx.description}</span>
                <span className={isIncome ? 'text-green-600' : 'text-red-600'}>
                  {isIncome ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
