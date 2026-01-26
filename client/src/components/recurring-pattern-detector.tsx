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
  FileText
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
}

export function RecurringPatternDetector({ organizationId }: RecurringPatternDetectorProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [lookbackMonths, setLookbackMonths] = useState("6");
  const [expandedPatterns, setExpandedPatterns] = useState<Set<string>>(new Set());

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

  const createBillMutation = useMutation({
    mutationFn: async (pattern: RecurringPattern) => {
      return apiRequest('POST', `/api/ai/create-bill-from-pattern/${organizationId}`, pattern);
    },
    onSuccess: () => {
      toast({
        title: "Bill Created",
        description: "A new recurring bill has been created from the detected pattern.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bill",
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

  const expensePatterns = patterns?.filter(p => p.transactionType === 'expense') || [];
  const incomePatterns = patterns?.filter(p => p.transactionType === 'income') || [];

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
                    Analyze transactions to find recurring expenses and create bills automatically
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {patterns && patterns.length > 0 && (
                  <Badge variant="secondary" data-testid="badge-pattern-count">
                    {patterns.length} patterns found
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
            ) : patterns && patterns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recurring patterns detected in your transactions.</p>
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
                          isCreating={createBillMutation.isPending}
                          frequencyLabels={frequencyLabels}
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
                    <div className="space-y-2">
                      {incomePatterns.map((pattern) => (
                        <PatternCard
                          key={pattern.vendorName}
                          pattern={pattern}
                          isExpanded={expandedPatterns.has(pattern.vendorName)}
                          onToggle={() => togglePattern(pattern.vendorName)}
                          frequencyLabels={frequencyLabels}
                          isIncome
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
  isCreating?: boolean;
  frequencyLabels: Record<string, string>;
  isIncome?: boolean;
}

function PatternCard({ 
  pattern, 
  isExpanded, 
  onToggle, 
  onCreateBill, 
  isCreating,
  frequencyLabels,
  isIncome 
}: PatternCardProps) {
  return (
    <div 
      className={`border rounded-lg p-4 ${isIncome ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-orange-50/50 dark:bg-orange-950/20'}`}
      data-testid={`pattern-card-${pattern.vendorName.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
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
                AI confidence level for this recurring pattern
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
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

        <div className="flex items-center gap-2">
          {!isIncome && onCreateBill && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={onCreateBill}
                  disabled={isCreating}
                  data-testid={`button-create-bill-${pattern.vendorName.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add as Bill
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Create a recurring bill from this pattern
              </TooltipContent>
            </Tooltip>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            data-testid={`button-toggle-${pattern.vendorName.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t">
          <h5 className="text-sm font-medium mb-2">Recent Transactions</h5>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {pattern.transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background"
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
