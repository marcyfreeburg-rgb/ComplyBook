import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  Eye,
  CheckSquare
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type DismissReason = 'one_off' | 'variable' | 'ignore_vendor' | 'not_recurring';

const dismissReasonLabels: Record<DismissReason, string> = {
  one_off: 'One-time purchase',
  variable: 'Variable/irregular amount',
  ignore_vendor: 'Ignore this vendor',
  not_recurring: 'Not a recurring pattern',
};

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
  organizationType?: 'nonprofit' | 'forprofit';
  filterType?: 'expense' | 'income' | 'all';
  onAddRecurringIncome?: (pattern: RecurringPattern) => void;
}

export function RecurringPatternDetector({ 
  organizationId, 
  organizationType = 'nonprofit',
  filterType = 'all',
  onAddRecurringIncome 
}: RecurringPatternDetectorProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [lookbackMonths, setLookbackMonths] = useState("6");
  const [expandedPatterns, setExpandedPatterns] = useState<Set<string>>(new Set());

  // Track patterns that have been added in this session
  const [addedPatterns, setAddedPatterns] = useState<Set<string>>(new Set());

  // Multi-select state for batch bill creation
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set());

  // Confirmation dialog state for customizing bill creation
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<RecurringPattern | null>(null);
  const [customFrequency, setCustomFrequency] = useState<RecurringPattern['frequency']>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<string>('15');
  const [fundingSource, setFundingSource] = useState<'unrestricted' | 'grant'>('unrestricted');
  const [selectedGrantId, setSelectedGrantId] = useState<number | null>(null);
  const [suggestedGrant, setSuggestedGrant] = useState<{ id: number; name: string } | null>(null);

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

  // Fetch grants for funding source suggestions
  const { data: grants } = useQuery<Array<{ id: number; name: string; status: string }>>({
    queryKey: [`/api/grants/${organizationId}`],
    enabled: confirmDialogOpen && organizationType === 'nonprofit',
  });

  // Fetch categories for bill category assignment
  const { data: categories } = useQuery<Array<{ id: number; name: string; type: string; parentId: number | null }>>({
    queryKey: [`/api/categories/${organizationId}`],
    enabled: confirmDialogOpen,
  });

  // State for selected category in the confirmation dialog
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

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

  // Open the confirmation dialog for a pattern
  const openConfirmDialog = async (pattern: RecurringPattern) => {
    setSelectedPattern(pattern);
    setCustomFrequency(pattern.frequency);
    // Calculate suggested day of month from transaction dates
    if (pattern.transactions.length > 0) {
      const days = pattern.transactions.map(t => new Date(t.date).getDate());
      const avgDay = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
      setDayOfMonth(String(Math.min(28, avgDay))); // Cap at 28 for safety
    }
    // Reset funding source and category
    setFundingSource('unrestricted');
    setSelectedGrantId(null);
    setSuggestedGrant(null);
    // Use pattern's detected category if available
    setSelectedCategoryId(pattern.categoryId || null);
    
    // Try to get grant suggestions based on past transactions for this vendor
    try {
      const response = await fetch(`/api/ai/suggest-funding-source/${organizationId}?vendorName=${encodeURIComponent(pattern.vendorName)}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const suggestion = await response.json();
        if (suggestion.suggestedGrantId && suggestion.suggestedGrantName) {
          setSuggestedGrant({ id: suggestion.suggestedGrantId, name: suggestion.suggestedGrantName });
          setFundingSource('grant');
          setSelectedGrantId(suggestion.suggestedGrantId);
        }
      }
    } catch (e) {
      // Ignore errors for suggestions - they're optional
    }
    
    setConfirmDialogOpen(true);
  };

  const createBillMutation = useMutation({
    mutationFn: async ({ pattern, frequency, dayOfMonth, fundingSource, grantId, categoryId }: { 
      pattern: RecurringPattern; 
      frequency: RecurringPattern['frequency']; 
      dayOfMonth: number;
      fundingSource: 'unrestricted' | 'grant';
      grantId: number | null;
      categoryId: number | null;
    }) => {
      setAddingPattern(`${pattern.vendorName.toLowerCase()}-${pattern.transactionType}`);
      return apiRequest('POST', `/api/ai/create-bill-from-pattern/${organizationId}`, {
        ...pattern,
        frequency,
        dayOfMonth,
        fundingSource,
        grantId,
        categoryId
      });
    },
    onSuccess: (_data, { pattern }) => {
      // Mark pattern as added
      const patternKey = `${pattern.vendorName.toLowerCase()}-${pattern.transactionType}`;
      setAddedPatterns(prev => new Set([...Array.from(prev), patternKey]));
      setAddingPattern(null);
      setConfirmDialogOpen(false);
      setSelectedPattern(null);
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
    mutationFn: async ({ pattern, reason }: { pattern: RecurringPattern; reason: DismissReason }) => {
      return apiRequest('POST', `/api/ai/dismiss-pattern/${organizationId}`, {
        vendorName: pattern.vendorName,
        patternType: pattern.transactionType,
        frequency: pattern.frequency,
        averageAmount: pattern.averageAmount,
        reason
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

  // Batch bill creation mutation
  const [batchCreating, setBatchCreating] = useState(false);
  const createBatchBillsMutation = useMutation({
    mutationFn: async (patterns: RecurringPattern[]) => {
      setBatchCreating(true);
      const results = [];
      for (const pattern of patterns) {
        const days = pattern.transactions.map(t => new Date(t.date).getDate());
        const avgDay = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
        const dayOfMonth = Math.min(28, avgDay);
        
        const result = await apiRequest('POST', `/api/ai/create-bill-from-pattern/${organizationId}`, {
          ...pattern,
          frequency: pattern.frequency,
          dayOfMonth,
          fundingSource: 'unrestricted',
          grantId: null,
          categoryId: pattern.categoryId || null
        });
        results.push(result);
      }
      return results;
    },
    onSuccess: (_, patterns) => {
      // Mark all patterns as added
      const newAdded = new Set(addedPatterns);
      patterns.forEach(pattern => {
        const patternKey = `${pattern.vendorName.toLowerCase()}-${pattern.transactionType}`;
        newAdded.add(patternKey);
      });
      setAddedPatterns(newAdded);
      setSelectedPatterns(new Set());
      setBatchCreating(false);
      toast({
        title: "Bills Created",
        description: `Successfully created ${patterns.length} recurring bills.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/detect-recurring'] });
    },
    onError: (error: Error) => {
      setBatchCreating(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create bills",
        variant: "destructive",
      });
    },
  });

  // Helper functions for multi-select
  const getPatternKey = (pattern: RecurringPattern) => 
    `${pattern.vendorName.toLowerCase()}-${pattern.transactionType}`;

  const togglePatternSelection = (pattern: RecurringPattern) => {
    const key = getPatternKey(pattern);
    const newSelected = new Set(selectedPatterns);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedPatterns(newSelected);
  };

  const isPatternSelected = (pattern: RecurringPattern) => 
    selectedPatterns.has(getPatternKey(pattern));

  const selectableExpensePatterns = (patterns?.filter(p => 
    p.transactionType === 'expense' && !isPatternAdded(p)
  ) || []);

  const selectAllExpensePatterns = () => {
    const newSelected = new Set(selectedPatterns);
    selectableExpensePatterns.forEach(p => newSelected.add(getPatternKey(p)));
    setSelectedPatterns(newSelected);
  };

  const deselectAllExpensePatterns = () => {
    const newSelected = new Set(selectedPatterns);
    selectableExpensePatterns.forEach(p => newSelected.delete(getPatternKey(p)));
    setSelectedPatterns(newSelected);
  };

  const allExpenseSelected = selectableExpensePatterns.length > 0 && 
    selectableExpensePatterns.every(p => selectedPatterns.has(getPatternKey(p)));

  const someExpenseSelected = selectableExpensePatterns.some(p => 
    selectedPatterns.has(getPatternKey(p)));

  const handleBatchCreate = () => {
    const patternsToCreate = patterns?.filter(p => 
      selectedPatterns.has(getPatternKey(p)) && p.transactionType === 'expense'
    ) || [];
    if (patternsToCreate.length > 0) {
      createBatchBillsMutation.mutate(patternsToCreate);
    }
  };

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
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <h3 className="font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-red-500" />
                        Recurring Expenses ({expensePatterns.length})
                      </h3>
                      {selectableExpensePatterns.length > 0 && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="select-all-expenses"
                              checked={allExpenseSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllExpensePatterns();
                                } else {
                                  deselectAllExpensePatterns();
                                }
                              }}
                              data-testid="checkbox-select-all-expenses"
                            />
                            <label 
                              htmlFor="select-all-expenses" 
                              className="text-sm text-muted-foreground cursor-pointer"
                            >
                              Select All
                            </label>
                          </div>
                          {someExpenseSelected && (
                            <Button
                              size="sm"
                              onClick={handleBatchCreate}
                              disabled={batchCreating}
                              data-testid="button-batch-create-bills"
                            >
                              <CheckSquare className="w-4 h-4 mr-1" />
                              {batchCreating ? 'Creating...' : `Add ${selectedPatterns.size} to Bills`}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {expensePatterns.map((pattern) => (
                        <PatternCard
                          key={pattern.vendorName}
                          pattern={pattern}
                          isExpanded={expandedPatterns.has(pattern.vendorName)}
                          onToggle={() => togglePattern(pattern.vendorName)}
                          onCreateBill={() => openConfirmDialog(pattern)}
                          onDismiss={(reason) => dismissPatternMutation.mutate({ pattern, reason })}
                          isCreating={createBillMutation.isPending || (confirmDialogOpen && selectedPattern?.vendorName === pattern.vendorName)}
                          isDismissing={dismissPatternMutation.isPending}
                          frequencyLabels={frequencyLabels}
                          isAdded={isPatternAdded(pattern)}
                          isSelected={isPatternSelected(pattern)}
                          onSelect={() => togglePatternSelection(pattern)}
                          showCheckbox={!isPatternAdded(pattern)}
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
                          onDismiss={(reason) => dismissPatternMutation.mutate({ pattern, reason })}
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

      {/* Confirmation Dialog for customizing bill creation */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Recurring Bill</DialogTitle>
            <DialogDescription>
              Customize the schedule for this recurring bill before creating it.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPattern && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Vendor</Label>
                <p className="font-medium">{selectedPattern.vendorName}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Average Amount</Label>
                <p className="font-medium">${selectedPattern.averageAmount.toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={customFrequency} onValueChange={(v) => setCustomFrequency(v as RecurringPattern['frequency'])}>
                    <SelectTrigger id="frequency" data-testid="select-bill-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(customFrequency === 'monthly' || customFrequency === 'quarterly' || customFrequency === 'yearly') && (
                  <div className="space-y-2">
                    <Label htmlFor="dayOfMonth">Day of Month</Label>
                    <Input
                      id="dayOfMonth"
                      type="number"
                      min="1"
                      max="28"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(e.target.value)}
                      data-testid="input-day-of-month"
                    />
                  </div>
                )}
              </div>

              {/* Funding Source Selection - Only for nonprofits */}
              {organizationType === 'nonprofit' && (
                <>
                  <div className="space-y-2">
                    <Label>Funding Source</Label>
                    <Select 
                      value={fundingSource} 
                      onValueChange={(v) => {
                        setFundingSource(v as 'unrestricted' | 'grant');
                        if (v === 'unrestricted') setSelectedGrantId(null);
                      }}
                    >
                      <SelectTrigger data-testid="select-funding-source">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unrestricted">Unrestricted Funds</SelectItem>
                        <SelectItem value="grant">Grant Funded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {fundingSource === 'grant' && (
                    <div className="space-y-2">
                      <Label>Select Grant</Label>
                      <Select 
                        value={selectedGrantId?.toString() || ''} 
                        onValueChange={(v) => setSelectedGrantId(parseInt(v))}
                      >
                        <SelectTrigger data-testid="select-grant">
                          <SelectValue placeholder="Select a grant..." />
                        </SelectTrigger>
                        <SelectContent>
                          {grants?.filter(g => g.status === 'active').map((grant) => (
                            <SelectItem key={grant.id} value={grant.id.toString()}>
                              {grant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {suggestedGrant && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-500" />
                          Suggested: <span className="font-medium">{suggestedGrant.name}</span> (based on past transactions)
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Category Selection */}
              <div className="space-y-2">
                <Label>Category (Optional)</Label>
                <Select 
                  value={selectedCategoryId?.toString() || 'none'} 
                  onValueChange={(v) => setSelectedCategoryId(v === 'none' ? null : parseInt(v))}
                >
                  <SelectTrigger data-testid="select-bill-category">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories?.filter(c => c.type === 'expense').map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.parentId ? '  └ ' : ''}{category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPattern.categoryName && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    Detected: <span className="font-medium">{selectedPattern.categoryName}</span> (from transactions)
                  </p>
                )}
              </div>

              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                <p>Based on {selectedPattern.transactionCount} transactions with amounts ranging from ${selectedPattern.minAmount.toFixed(2)} to ${selectedPattern.maxAmount.toFixed(2)}</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialogOpen(false)}
              data-testid="button-cancel-create-bill"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedPattern) {
                  createBillMutation.mutate({
                    pattern: selectedPattern,
                    frequency: customFrequency,
                    dayOfMonth: parseInt(dayOfMonth) || 15,
                    fundingSource: organizationType === 'nonprofit' ? fundingSource : 'unrestricted',
                    grantId: organizationType === 'nonprofit' && fundingSource === 'grant' ? selectedGrantId : null,
                    categoryId: selectedCategoryId
                  });
                }
              }}
              disabled={createBillMutation.isPending || (organizationType === 'nonprofit' && fundingSource === 'grant' && !selectedGrantId)}
              data-testid="button-confirm-create-bill"
            >
              {createBillMutation.isPending ? 'Creating...' : 'Create Bill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

interface PatternCardProps {
  pattern: RecurringPattern;
  isExpanded: boolean;
  onToggle: () => void;
  onCreateBill?: () => void;
  onAddIncome?: () => void;
  onDismiss?: (reason: DismissReason) => void;
  isCreating?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  showCheckbox?: boolean;
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
  isAdded = false,
  isSelected = false,
  onSelect,
  showCheckbox = false
}: PatternCardProps) {
  const [dismissOpen, setDismissOpen] = useState(false);
  const vendorSlug = pattern.vendorName.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div 
      className={`border rounded-lg p-4 ${isIncome ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-orange-50/50 dark:bg-orange-950/20'} ${isSelected ? 'ring-2 ring-primary' : ''}`}
      data-testid={`pattern-card-${vendorSlug}`}
    >
      <div className="flex items-start gap-3">
        {showCheckbox && onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="mt-1"
            data-testid={`checkbox-pattern-${vendorSlug}`}
          />
        )}
        <div className="flex-1">
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
                  variant="outline"
                  className={`text-xs ${
                    pattern.confidence > 90 
                      ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' 
                      : pattern.confidence >= 70 
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700'
                        : 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700'
                  }`}
                  data-testid={`badge-confidence-${pattern.vendorName.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {pattern.confidence}% confident
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {pattern.confidence > 90 ? 'High confidence' : pattern.confidence >= 70 ? 'Medium confidence' : 'Low confidence'} - based on {pattern.transactionCount} matching transactions
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
            <DropdownMenu open={dismissOpen} onOpenChange={setDismissOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isDismissing}
                  data-testid={`button-dismiss-${vendorSlug}`}
                >
                  <X className="w-4 h-4 mr-1" />
                  Not Recurring
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Why isn't this recurring?</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => { onDismiss('one_off'); setDismissOpen(false); }}
                  data-testid={`dismiss-reason-one-off-${vendorSlug}`}
                >
                  One-time purchase
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => { onDismiss('variable'); setDismissOpen(false); }}
                  data-testid={`dismiss-reason-variable-${vendorSlug}`}
                >
                  Variable/irregular amount
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => { onDismiss('ignore_vendor'); setDismissOpen(false); }}
                  data-testid={`dismiss-reason-ignore-${vendorSlug}`}
                >
                  Ignore this vendor
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => { onDismiss('not_recurring'); setDismissOpen(false); }}
                  data-testid={`dismiss-reason-other-${vendorSlug}`}
                >
                  Other / not sure
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
