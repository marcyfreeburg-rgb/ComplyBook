import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Plus, 
  Download,
  Trash2,
  RotateCcw,
  Calendar,
  DollarSign,
  FileText
} from "lucide-react";
import type { Organization, Transaction, BankReconciliation, BankStatementEntry, ReconciliationMatch } from "@shared/schema";
import { format } from "date-fns";
import { safeFormatDate } from "@/lib/utils";
import Papa from "papaparse";
import html2pdf from "html2pdf.js";

type OrganizationWithRole = Organization & { userRole: string };

interface ReconciliationHubProps {
  currentOrganization?: OrganizationWithRole;
}

const newReconciliationSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  statementStartDate: z.string().min(1, "Start date is required"),
  statementEndDate: z.string().min(1, "End date is required"),
  beginningBalance: z.string().min(1, "Beginning balance is required"),
  endingBalance: z.string().min(1, "Ending balance is required"),
  statementBalance: z.string().min(1, "Statement balance is required"),
});

type NewReconciliationFormData = z.infer<typeof newReconciliationSchema>;

export default function ReconciliationHub({ currentOrganization }: ReconciliationHubProps) {
  const { toast } = useToast();
  const [activeReconciliation, setActiveReconciliation] = useState<number | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [selectedStatements, setSelectedStatements] = useState<Set<number>>(new Set());
  const [isNewReconciliationOpen, setIsNewReconciliationOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const form = useForm<NewReconciliationFormData>({
    resolver: zodResolver(newReconciliationSchema),
    defaultValues: {
      accountName: "",
      statementStartDate: "",
      statementEndDate: "",
      beginningBalance: "",
      endingBalance: "",
      statementBalance: "",
    },
  });

  // Fetch last reconciliation
  const { data: lastReconciliation, isLoading: isLoadingLastReconciliation } = useQuery<BankReconciliation | null>({
    queryKey: [`/api/bank-reconciliations/${currentOrganization?.id}/last`],
    enabled: !!currentOrganization,
  });

  // Fetch active reconciliation details
  const { data: reconciliation } = useQuery<BankReconciliation>({
    queryKey: [`/api/bank-reconciliations/${activeReconciliation}`],
    enabled: !!activeReconciliation,
  });

  // Fetch unreconciled transactions
  const { data: unreconciledTransactions = [] } = useQuery<Transaction[]>({
    queryKey: [`/api/reconciliation/unreconciled/${currentOrganization?.id}`],
    enabled: !!currentOrganization && !!activeReconciliation,
  });

  // Fetch transactions within the reconciliation date range
  const { data: periodTransactions = [], isLoading: isLoadingPeriodTransactions } = useQuery<Transaction[]>({
    queryKey: [`/api/bank-reconciliations/${activeReconciliation}/transactions`],
    enabled: !!activeReconciliation,
  });

  // Fetch bank statement entries
  const { data: statementEntries = [] } = useQuery<BankStatementEntry[]>({
    queryKey: [`/api/bank-statement-entries/${activeReconciliation}`],
    enabled: !!activeReconciliation,
  });

  // Fetch existing matches
  const { data: existingMatches = [] } = useQuery<ReconciliationMatch[]>({
    queryKey: [`/api/reconciliation-matches/${activeReconciliation}`],
    enabled: !!activeReconciliation,
  });

  // Fetch AI suggestions
  const { data: suggestions = [] } = useQuery<Array<{
    transaction: Transaction;
    statementEntry: BankStatementEntry;
    similarityScore: number;
  }>>({
    queryKey: [`/api/reconciliation-suggestions/${activeReconciliation}`],
    enabled: !!activeReconciliation,
  });

  // Create new reconciliation
  const createReconciliationMutation = useMutation({
    mutationFn: async (data: NewReconciliationFormData) => {
      const beginningBalance = parseFloat(data.beginningBalance);
      const endingBalance = parseFloat(data.endingBalance);
      const statementBalance = parseFloat(data.statementBalance);
      
      return await apiRequest('POST', '/api/bank-reconciliations', {
        organizationId: currentOrganization?.id,
        accountName: data.accountName,
        statementStartDate: new Date(data.statementStartDate),
        statementEndDate: new Date(data.statementEndDate),
        beginningBalance: beginningBalance.toString(),
        endingBalance: endingBalance.toString(),
        statementBalance: statementBalance.toString(),
        bookBalance: beginningBalance.toString(),
        difference: Math.abs(statementBalance - beginningBalance).toString(),
        status: 'unreconciled',
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bank-reconciliations/${currentOrganization?.id}/last`] });
      setActiveReconciliation(data.id);
      setIsNewReconciliationOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Reconciliation session created",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create reconciliation session",
      });
    },
  });

  // Import bank statement
  const importStatementMutation = useMutation({
    mutationFn: async (entries: Array<{ date: Date; description: string; amount: string; type: 'income' | 'expense' }>) => {
      return await apiRequest('POST', '/api/bank-statement-entries', {
        reconciliationId: activeReconciliation,
        entries: entries.map(e => ({ 
          ...e, 
          reconciliationId: activeReconciliation, 
          isMatched: 0,
          createdAt: new Date(),
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bank-statement-entries/${activeReconciliation}`] });
      setIsImportOpen(false);
      toast({
        title: "Success",
        description: "Bank statement imported successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to import bank statement",
      });
    },
  });

  // Match selected transaction and statement entry
  const matchMutation = useMutation({
    mutationFn: async ({ transactionId, statementEntryId }: { transactionId: number; statementEntryId: number }) => {
      return await apiRequest('POST', '/api/reconciliation-matches', {
        reconciliationId: activeReconciliation,
        transactionId,
        statementEntryId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation-matches/${activeReconciliation}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation/unreconciled/${currentOrganization?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bank-statement-entries/${activeReconciliation}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation-suggestions/${activeReconciliation}`] });
      setSelectedTransactions(new Set());
      setSelectedStatements(new Set());
      toast({
        title: "Success",
        description: "Transaction matched successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to match transaction",
      });
    },
  });

  // Unmatch
  const unmatchMutation = useMutation({
    mutationFn: async (matchId: number) => {
      return await apiRequest('DELETE', `/api/reconciliation-matches/${matchId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation-matches/${activeReconciliation}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation/unreconciled/${currentOrganization?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bank-statement-entries/${activeReconciliation}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation-suggestions/${activeReconciliation}`] });
      toast({
        title: "Success",
        description: "Match removed successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove match",
      });
    },
  });

  // Complete reconciliation
  const completeReconciliationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PATCH', `/api/bank-reconciliations/${activeReconciliation}`, {
        status: 'completed',
        completedDate: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bank-reconciliations/${currentOrganization?.id}/last`] });
      toast({
        title: "Success",
        description: "Reconciliation completed successfully",
      });
      setActiveReconciliation(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete reconciliation",
      });
    },
  });

  // Reconcile all transactions in date range
  const reconcileAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/bank-reconciliations/${activeReconciliation}/reconcile-all`) as { reconciledCount: number; message: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bank-reconciliations/${activeReconciliation}/transactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation/unreconciled/${currentOrganization?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bank-reconciliations/${currentOrganization?.id}/last`] });
      toast({
        title: "Reconciliation Complete",
        description: data.message,
      });
      setActiveReconciliation(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reconcile transactions",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const entries = results.data
          .filter((row: any) => row.date && row.description && row.amount)
          .map((row: any) => {
            const amount = parseFloat(row.amount);
            return {
              date: new Date(row.date),
              description: row.description,
              amount: Math.abs(amount).toString(),
              type: amount >= 0 ? 'income' : 'expense' as 'income' | 'expense',
            };
          });

        if (entries.length === 0) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "No valid entries found in CSV file",
          });
          return;
        }

        importStatementMutation.mutate(entries);
      },
      error: () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to parse CSV file",
        });
      },
    });
  };

  const handleMatch = () => {
    if (selectedTransactions.size !== 1 || selectedStatements.size !== 1) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select exactly one transaction and one statement entry",
      });
      return;
    }

    const transactionId = Array.from(selectedTransactions)[0];
    const statementEntryId = Array.from(selectedStatements)[0];

    matchMutation.mutate({ transactionId, statementEntryId });
  };

  const handleApplySuggestion = (transactionId: number, statementEntryId: number) => {
    matchMutation.mutate({ transactionId, statementEntryId });
  };

  const generateReconciliationReport = () => {
    if (!reconciliation) return;

    const reportContent = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #333; margin-bottom: 10px;">Bank Reconciliation Report</h1>
          <p style="color: #666; font-size: 14px;">${currentOrganization?.name}</p>
        </div>

        <div style="border: 1px solid #e0e0e0; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
          <h2 style="color: #333; font-size: 18px; margin-bottom: 15px;">Reconciliation Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Account Name:</td>
              <td style="padding: 8px 0; font-weight: bold;">${reconciliation.accountName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Statement Period:</td>
              <td style="padding: 8px 0; font-weight: bold;">
                ${safeFormatDate(reconciliation.statementStartDate, 'MMM dd, yyyy')} - 
                ${safeFormatDate(reconciliation.statementEndDate, 'MMM dd, yyyy')}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Book Balance:</td>
              <td style="padding: 8px 0; font-weight: bold;">$${parseFloat(reconciliation.bookBalance).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Statement Balance:</td>
              <td style="padding: 8px 0; font-weight: bold;">$${parseFloat(reconciliation.statementBalance).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Difference:</td>
              <td style="padding: 8px 0; font-weight: bold; color: ${difference > 0.01 ? '#dc2626' : '#16a34a'};">
                $${difference.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Status:</td>
              <td style="padding: 8px 0; font-weight: bold; text-transform: capitalize;">${reconciliation.status}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #333; font-size: 18px; margin-bottom: 15px;">Summary</h2>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0;">Category</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e0e0e0;">Count</th>
                <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e0e0e0;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">Matched Items</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e0e0e0;">${existingMatches.length}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e0e0e0;">
                  $${existingMatches.reduce((sum, match) => {
                    const txn = unreconciledTransactions.find(t => t.id === match.transactionId);
                    return sum + (txn ? parseFloat(txn.amount) : 0);
                  }, 0).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">Unmatched Transactions</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e0e0e0;">${unmatchedTransactions.length}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e0e0e0;">
                  $${totalTransactionAmount.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px;">Unmatched Statement Entries</td>
                <td style="padding: 12px; text-align: right;">${unmatchedStatements.length}</td>
                <td style="padding: 12px; text-align: right;">
                  $${totalStatementAmount.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        ${existingMatches.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #333; font-size: 18px; margin-bottom: 15px;">Matched Items</h2>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0;">Date</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0;">Transaction</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0;">Statement Entry</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e0e0e0;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${existingMatches.map(match => {
                  const txn = unreconciledTransactions.find(t => t.id === match.transactionId);
                  const entry = statementEntries.find(e => e.id === match.statementEntryId);
                  if (!txn || !entry) return '';
                  return `
                    <tr>
                      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${safeFormatDate(txn.date, 'MMM dd, yyyy')}</td>
                      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${txn.description}</td>
                      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${entry.description}</td>
                      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e0e0e0;">$${parseFloat(txn.amount).toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
          <p>Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' hh:mm a')}</p>
        </div>
      </div>
    `;

    const opt = {
      margin: 10,
      filename: `reconciliation-report-${reconciliation.accountName}-${safeFormatDate(reconciliation.statementEndDate, 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(reportContent).save();

    toast({
      title: "Success",
      description: "Reconciliation report generated successfully",
    });
  };

  const unmatchedTransactions = unreconciledTransactions.filter(
    txn => !existingMatches.some(m => m.transactionId === txn.id)
  );

  const unmatchedStatements = statementEntries.filter(
    entry => !existingMatches.some(m => m.statementEntryId === entry.id)
  );

  const totalTransactionAmount = unmatchedTransactions.reduce(
    (sum, txn) => sum + parseFloat(txn.amount), 0
  );

  const totalStatementAmount = unmatchedStatements.reduce(
    (sum, entry) => sum + parseFloat(entry.amount), 0
  );

  const difference = Math.abs(totalTransactionAmount - totalStatementAmount);

  // Calculate book balance from period transactions
  const periodIncome = periodTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const periodExpenses = periodTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const calculatedBookBalance = reconciliation 
    ? parseFloat(reconciliation.beginningBalance) + periodIncome - periodExpenses
    : 0;
  const periodReconciledCount = periodTransactions.filter(t => t.reconciliationStatus === 'reconciled').length;
  const periodUnreconciledCount = periodTransactions.filter(t => t.reconciliationStatus !== 'reconciled').length;
  const balanceDifference = reconciliation 
    ? Math.abs(calculatedBookBalance - parseFloat(reconciliation.endingBalance))
    : 0;

  if (!currentOrganization) {
    return (
      <div className="p-8">
        <p data-testid="text-no-organization">Please select an organization to view bank reconciliation.</p>
      </div>
    );
  }

  // Show loading state while fetching last reconciliation
  if (isLoadingLastReconciliation && !activeReconciliation) {
    return (
      <div className="flex flex-col h-full p-6 gap-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-reconciliation">Bank Reconciliation</h1>
          <p className="text-muted-foreground">Loading reconciliation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-reconciliation">Bank Reconciliation</h1>
          <p className="text-muted-foreground">Match bank statements with your transactions</p>
        </div>
        <div className="flex gap-2">
          {activeReconciliation && (
            <>
              <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-import-statement">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Import Statement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Bank Statement</DialogTitle>
                    <DialogDescription>
                      Upload a CSV file with columns: date, description, amount, reference (optional)
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    data-testid="input-csv-file"
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsImportOpen(false)} data-testid="button-cancel-import">
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                onClick={generateReconciliationReport}
                data-testid="button-generate-report"
              >
                <Download className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              <Button
                onClick={() => completeReconciliationMutation.mutate()}
                disabled={unmatchedTransactions.length > 0 || unmatchedStatements.length > 0}
                data-testid="button-complete-reconciliation"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Reconciliation
              </Button>
            </>
          )}
          <Dialog open={isNewReconciliationOpen} onOpenChange={setIsNewReconciliationOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-reconciliation">
                <Plus className="mr-2 h-4 w-4" />
                New Reconciliation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Reconciliation</DialogTitle>
                <DialogDescription>
                  Create a new bank reconciliation session
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createReconciliationMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="accountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Checking Account" data-testid="input-account-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="statementStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statement Start Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="statementEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statement End Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="beginningBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Beginning Balance</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-beginning-balance" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endingBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ending Balance</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-ending-balance" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="statementBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statement Balance</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-statement-balance" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsNewReconciliationOpen(false)} data-testid="button-cancel-new">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createReconciliationMutation.isPending} data-testid="button-create-reconciliation">
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!activeReconciliation && lastReconciliation && (
        <Card>
          <CardHeader>
            <CardTitle>Last Reconciliation</CardTitle>
            <CardDescription>
              {lastReconciliation.accountName} - {safeFormatDate(lastReconciliation.statementEndDate, 'MMM dd, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={() => setActiveReconciliation(lastReconciliation.id)} data-testid="button-resume-reconciliation">
                Resume
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeReconciliation && reconciliation && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{reconciliation.accountName}</CardTitle>
                  <CardDescription>
                    {safeFormatDate(reconciliation.statementStartDate, 'MMM dd, yyyy')} - {safeFormatDate(reconciliation.statementEndDate, 'MMM dd, yyyy')}
                  </CardDescription>
                </div>
                <Badge variant={reconciliation.status === 'reconciled' ? 'default' : 'secondary'} data-testid={`badge-status-${reconciliation.status}`}>
                  {reconciliation.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Beginning Balance</p>
                  <p className="text-2xl font-bold" data-testid="text-beginning-balance">${parseFloat(reconciliation.beginningBalance).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Calculated Book Balance</p>
                  <p className="text-2xl font-bold" data-testid="text-book-balance">${calculatedBookBalance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statement Ending Balance</p>
                  <p className="text-2xl font-bold" data-testid="text-statement-balance">${parseFloat(reconciliation.endingBalance).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Difference</p>
                  <p className={`text-2xl font-bold ${balanceDifference > 0.01 ? 'text-red-600' : 'text-green-600'}`} data-testid="text-difference">
                    ${balanceDifference.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions in Period</p>
                  <p className="text-2xl font-bold" data-testid="text-transaction-count">{periodTransactions.length}</p>
                </div>
              </div>

              {/* Balance Comparison Summary */}
              <div className="border rounded-lg p-4 mb-4">
                <h3 className="font-semibold mb-3">Balance Reconciliation Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Beginning Balance:</span>
                      <span className="font-medium">${parseFloat(reconciliation.beginningBalance).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">+ Total Income:</span>
                      <span className="font-medium text-green-600">${periodIncome.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">- Total Expenses:</span>
                      <span className="font-medium text-red-600">${periodExpenses.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Calculated Book Balance:</span>
                      <span>${calculatedBookBalance.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Statement Ending Balance:</span>
                      <span className="font-medium">${parseFloat(reconciliation.endingBalance).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reconciled Transactions:</span>
                      <span className="font-medium">{periodReconciledCount} of {periodTransactions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unreconciled Transactions:</span>
                      <span className="font-medium">{periodUnreconciledCount}</span>
                    </div>
                    <div className={`flex justify-between border-t pt-2 font-semibold ${balanceDifference > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      <span>Difference:</span>
                      <span>${balanceDifference.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reconcile All Button */}
              {periodUnreconciledCount > 0 && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {balanceDifference <= 0.01 
                        ? "Balances match! Ready to reconcile all transactions."
                        : `There is a $${balanceDifference.toFixed(2)} difference. Review transactions before reconciling.`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {periodUnreconciledCount} transactions will be marked as reconciled
                    </p>
                  </div>
                  <Button 
                    onClick={() => reconcileAllMutation.mutate()}
                    disabled={reconcileAllMutation.isPending}
                    data-testid="button-reconcile-all"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {reconcileAllMutation.isPending ? 'Reconciling...' : 'Reconcile All Transactions'}
                  </Button>
                </div>
              )}

              {periodUnreconciledCount === 0 && periodTransactions.length > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    All {periodTransactions.length} transactions in this period are reconciled.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="match" className="flex-1">
            <TabsList>
              <TabsTrigger value="match" data-testid="tab-match">Match Transactions</TabsTrigger>
              <TabsTrigger value="suggestions" data-testid="tab-suggestions">
                AI Suggestions
                {suggestions.length > 0 && (
                  <Badge variant="secondary" className="ml-2" data-testid="badge-suggestions-count">{suggestions.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="matched" data-testid="tab-matched">Matched ({existingMatches.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="match" className="flex-1">
              <div className="grid grid-cols-2 gap-4 h-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Transactions ({unmatchedTransactions.length})</CardTitle>
                    <CardDescription>Select a transaction to match</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                    {unmatchedTransactions.map((txn) => (
                      <div
                        key={txn.id}
                        className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer hover-elevate ${
                          selectedTransactions.has(txn.id) ? 'bg-primary/10 border-primary' : ''
                        }`}
                        onClick={() => {
                          const newSelected = new Set<number>();
                          if (!selectedTransactions.has(txn.id)) {
                            newSelected.add(txn.id);
                          }
                          setSelectedTransactions(newSelected);
                        }}
                        data-testid={`transaction-item-${txn.id}`}
                      >
                        <Checkbox checked={selectedTransactions.has(txn.id)} />
                        <div className="flex-1">
                          <p className="font-medium">{txn.description}</p>
                          <p className="text-sm text-muted-foreground">{safeFormatDate(txn.date, 'MMM dd, yyyy')}</p>
                        </div>
                        <p className={`font-bold ${parseFloat(txn.amount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${Math.abs(parseFloat(txn.amount)).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Bank Statement ({unmatchedStatements.length})</CardTitle>
                    <CardDescription>Select a statement entry to match</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                    {unmatchedStatements.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer hover-elevate ${
                          selectedStatements.has(entry.id) ? 'bg-primary/10 border-primary' : ''
                        }`}
                        onClick={() => {
                          const newSelected = new Set<number>();
                          if (!selectedStatements.has(entry.id)) {
                            newSelected.add(entry.id);
                          }
                          setSelectedStatements(newSelected);
                        }}
                        data-testid={`statement-item-${entry.id}`}
                      >
                        <Checkbox checked={selectedStatements.has(entry.id)} />
                        <div className="flex-1">
                          <p className="font-medium">{entry.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {safeFormatDate(entry.date, 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <p className={`font-bold ${parseFloat(entry.amount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${Math.abs(parseFloat(entry.amount)).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="mt-4 flex justify-center">
                <Button
                  onClick={handleMatch}
                  disabled={selectedTransactions.size !== 1 || selectedStatements.size !== 1 || matchMutation.isPending}
                  data-testid="button-match-selected"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Match Selected Items
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="suggestions">
              <Card>
                <CardHeader>
                  <CardTitle>AI-Powered Match Suggestions</CardTitle>
                  <CardDescription>Automatically suggested matches based on amount, date, and description</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {suggestions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8" data-testid="text-no-suggestions">
                      No suggestions available
                    </p>
                  ) : (
                    suggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 border rounded-md" data-testid={`suggestion-${index}`}>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Transaction</p>
                            <p className="font-medium">{suggestion.transaction.description}</p>
                            <p className="text-sm">{safeFormatDate(suggestion.transaction.date, 'MMM dd, yyyy')}</p>
                            <p className="font-bold">${parseFloat(suggestion.transaction.amount).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Statement</p>
                            <p className="font-medium">{suggestion.statementEntry.description}</p>
                            <p className="text-sm">{safeFormatDate(suggestion.statementEntry.date, 'MMM dd, yyyy')}</p>
                            <p className="font-bold">${parseFloat(suggestion.statementEntry.amount).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <Badge variant="secondary" data-testid={`badge-score-${index}`}>
                            {suggestion.similarityScore}% match
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => handleApplySuggestion(suggestion.transaction.id, suggestion.statementEntry.id)}
                            disabled={matchMutation.isPending}
                            data-testid={`button-apply-suggestion-${index}`}
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Apply
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matched">
              <Card>
                <CardHeader>
                  <CardTitle>Matched Items</CardTitle>
                  <CardDescription>Successfully matched transactions and statement entries</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {existingMatches.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8" data-testid="text-no-matches">
                      No matches yet
                    </p>
                  ) : (
                    existingMatches.map((match) => {
                      const txn = unreconciledTransactions.find(t => t.id === match.transactionId);
                      const entry = statementEntries.find(e => e.id === match.statementEntryId);
                      
                      if (!txn || !entry) return null;

                      return (
                        <div key={match.id} className="flex items-center gap-4 p-4 border rounded-md" data-testid={`match-${match.id}`}>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                              <p className="font-medium">{txn.description}</p>
                              <p className="text-sm text-muted-foreground">{safeFormatDate(txn.date, 'MMM dd, yyyy')}</p>
                            </div>
                            <div>
                              <p className="font-medium">{entry.description}</p>
                              <p className="text-sm text-muted-foreground">{safeFormatDate(entry.date, 'MMM dd, yyyy')}</p>
                            </div>
                          </div>
                          <p className="font-bold">${parseFloat(txn.amount).toFixed(2)}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => unmatchMutation.mutate(match.id)}
                            disabled={unmatchMutation.isPending}
                            data-testid={`button-unmatch-${match.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!activeReconciliation && !lastReconciliation && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2" data-testid="heading-no-reconciliation">No Active Reconciliation</h2>
            <p className="text-muted-foreground mb-4">Start a new reconciliation session to begin</p>
            <Button onClick={() => setIsNewReconciliationOpen(true)} data-testid="button-start-first-reconciliation">
              <Plus className="mr-2 h-4 w-4" />
              Start Reconciliation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
