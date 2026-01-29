import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Sparkles, RefreshCw, AlertTriangle, Download, History, Building2 } from "lucide-react";
import type { Organization, Transaction, ReconciliationAlert, ReconciliationAuditLog } from "@shared/schema";
import { format } from "date-fns";
import { safeFormatDate, formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type OrganizationWithRole = Organization & { userRole: string };

interface BankReconciliationProps {
  currentOrganization?: OrganizationWithRole;
}

export default function BankReconciliation({ currentOrganization }: BankReconciliationProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showReconciled, setShowReconciled] = useState(false);
  const [reconciledLimit, setReconciledLimit] = useState(100);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Fetch unreconciled transactions
  const { data: unreconciledTransactions = [], isLoading: isLoadingUnreconciled } = useQuery<Transaction[]>({
    queryKey: [`/api/reconciliation/unreconciled/${currentOrganization?.id}`],
    enabled: !!currentOrganization,
  });

  // Fetch reconciled transactions (paginated for performance)
  const { data: reconciledTransactions = [], isLoading: isLoadingReconciled } = useQuery<Transaction[]>({
    queryKey: [`/api/reconciliation/reconciled/${currentOrganization?.id}`, { limit: reconciledLimit }],
    queryFn: async () => {
      const response = await fetch(`/api/reconciliation/reconciled/${currentOrganization?.id}?limit=${reconciledLimit}`);
      if (!response.ok) throw new Error('Failed to fetch reconciled transactions');
      return response.json();
    },
    enabled: !!currentOrganization && showReconciled,
  });

  // Fetch stale unreconciled count (>30 days)
  const { data: staleCount } = useQuery<{ count: number; daysSinceThreshold: number }>({
    queryKey: [`/api/reconciliation/stale-count/${currentOrganization?.id}`],
    enabled: !!currentOrganization,
  });

  // Fetch reconciliation alerts
  const { data: alerts = [] } = useQuery<ReconciliationAlert[]>({
    queryKey: [`/api/reconciliation/alerts/${currentOrganization?.id}`, { acknowledged: false }],
    queryFn: async () => {
      const response = await fetch(`/api/reconciliation/alerts/${currentOrganization?.id}?acknowledged=false`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json();
    },
    enabled: !!currentOrganization,
  });

  // Fetch audit logs
  const { data: auditLogs = [] } = useQuery<ReconciliationAuditLog[]>({
    queryKey: [`/api/reconciliation/audit-logs/${currentOrganization?.id}`],
    enabled: !!currentOrganization && showAuditLog,
  });

  // Get unique accounts from transactions for multi-account filter
  const uniqueAccounts = Array.from(new Set(unreconciledTransactions.map(t => t.bankAccountId).filter(Boolean)));

  // Filter transactions by selected account
  const filteredUnreconciled = selectedAccount === "all" 
    ? unreconciledTransactions 
    : unreconciledTransactions.filter(t => 
        selectedAccount === "manual" ? !t.bankAccountId : t.bankAccountId?.toString() === selectedAccount
      );

  const transactions = showReconciled ? reconciledTransactions : filteredUnreconciled;
  const isLoading = showReconciled ? isLoadingReconciled : isLoadingUnreconciled;
  
  const handleLoadMoreReconciled = async () => {
    setLoadingMore(true);
    setReconciledLimit(prev => prev + 100);
    setLoadingMore(false);
  };

  // Reconcile single transaction
  const reconcileMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/reconciliation/reconcile/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation/unreconciled/${currentOrganization?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation/reconciled/${currentOrganization?.id}`] });
      toast({
        title: "Success",
        description: "Transaction reconciled successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reconcile transaction",
      });
    },
  });

  // Unreconcile transaction
  const unreconcileMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/reconciliation/unreconcile/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation/unreconciled/${currentOrganization?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation/reconciled/${currentOrganization?.id}`] });
      toast({
        title: "Success",
        description: "Transaction marked as unreconciled",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unreconcile transaction",
      });
    },
  });

  // Bulk reconcile
  const bulkReconcileMutation = useMutation({
    mutationFn: async (transactionIds: number[]) => {
      const response = await apiRequest('POST', '/api/reconciliation/bulk-reconcile', {
        organizationId: currentOrganization?.id,
        transactionIds,
      });
      return await response.json() as { count: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation/unreconciled/${currentOrganization?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation/reconciled/${currentOrganization?.id}`] });
      setSelectedIds([]);
      toast({
        title: "Success",
        description: `${data.count} transactions reconciled successfully`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reconcile transactions",
      });
    },
  });

  // Auto reconcile
  const autoReconcileMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization) return;
      return await apiRequest('POST', `/api/reconciliation/auto-reconcile/${currentOrganization.id}`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation/unreconciled/${currentOrganization?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation/reconciled/${currentOrganization?.id}`] });
      toast({
        title: "Auto-Reconciliation Complete",
        description: `${data.reconciledCount} transactions automatically reconciled`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to auto-reconcile transactions",
      });
    },
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredUnreconciled.length && filteredUnreconciled.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUnreconciled.map(t => t.id));
    }
  };

  const handleSelectTransaction = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkReconcile = () => {
    if (selectedIds.length === 0) {
      toast({
        variant: "destructive",
        title: "No transactions selected",
        description: "Please select at least one transaction to reconcile",
      });
      return;
    }
    bulkReconcileMutation.mutate(selectedIds);
  };

  if (!currentOrganization) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Bank Reconciliation</h1>
        <p className="text-muted-foreground">Please select an organization to view bank reconciliation.</p>
      </div>
    );
  }

  const handleExportAuditLog = async () => {
    if (!currentOrganization) return;
    const response = await fetch(`/api/reconciliation/audit-logs/${currentOrganization.id}/export?format=csv`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reconciliation-audit-log.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Audit log exported successfully" });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="heading-reconciliation">Bank Reconciliation</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Match transactions with your bank statements</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => autoReconcileMutation.mutate()}
            disabled={autoReconcileMutation.isPending}
            variant="outline"
            data-testid="button-auto-reconcile"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Auto Reconcile
          </Button>
          <Button
            onClick={() => setShowReconciled(!showReconciled)}
            variant="outline"
            data-testid="button-toggle-view"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {showReconciled ? "Unreconciled" : "Show All"}
          </Button>
          <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-audit-log">
                <History className="h-4 w-4 mr-2" />
                Audit Log
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Reconciliation Audit Log</DialogTitle>
                <DialogDescription>History of reconciliation actions</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end mb-4">
                <Button size="sm" variant="outline" onClick={handleExportAuditLog} data-testid="button-export-audit">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Action</th>
                      <th className="text-left py-2 px-3">User</th>
                      <th className="text-left py-2 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b">
                        <td className="py-2 px-3">{safeFormatDate(log.performedAt, 'MMM dd, yyyy HH:mm')}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline">{log.action}</Badge>
                        </td>
                        <td className="py-2 px-3 truncate max-w-[150px]">{log.performedBy}</td>
                        <td className="py-2 px-3 truncate max-w-[200px]">{log.notes || '-'}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-muted-foreground">No audit logs found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stale Items Alert */}
      {staleCount && staleCount.count > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20" data-testid="card-stale-alert">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>{staleCount.count}</strong> transactions have been unreconciled for more than {staleCount.daysSinceThreshold} days
            </p>
          </CardContent>
        </Card>
      )}

      {/* Multi-Account Filter */}
      {uniqueAccounts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by account:</span>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-[200px]" data-testid="select-account-filter">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              <SelectItem value="manual">Manual Entries</SelectItem>
              {uniqueAccounts.map(accountId => (
                <SelectItem key={accountId} value={accountId!.toString()}>
                  Account {accountId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                {showReconciled 
                  ? `Showing ${reconciledTransactions.length} reconciled transactions` 
                  : `${unreconciledTransactions.length} unreconciled transactions`}
              </CardDescription>
            </div>
            {!showReconciled && selectedIds.length > 0 && (
              <Button
                onClick={handleBulkReconcile}
                disabled={bulkReconcileMutation.isPending}
                data-testid="button-bulk-reconcile"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Reconcile {selectedIds.length} Selected
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {showReconciled ? "No transactions found" : "All transactions are reconciled!"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {!showReconciled && (
                      <th className="text-left py-3 px-4">
                        <Checkbox
                          checked={selectedIds.length === filteredUnreconciled.length && filteredUnreconciled.length > 0}
                          onCheckedChange={handleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </th>
                    )}
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-right py-3 px-4">Amount</th>
                    {showReconciled && <th className="text-left py-3 px-4">Status</th>}
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover-elevate" data-testid={`row-transaction-${transaction.id}`}>
                      {!showReconciled && (
                        <td className="py-3 px-4">
                          <Checkbox
                            checked={selectedIds.includes(transaction.id)}
                            onCheckedChange={() => handleSelectTransaction(transaction.id)}
                            data-testid={`checkbox-transaction-${transaction.id}`}
                          />
                        </td>
                      )}
                      <td className="py-3 px-4 text-sm">
                        {safeFormatDate(transaction.date, 'MMM dd, yyyy')}
                      </td>
                      <td className="py-3 px-4">{transaction.description}</td>
                      <td className="py-3 px-4">
                        <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                          {transaction.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(transaction.amount)}
                      </td>
                      {showReconciled && (
                        <td className="py-3 px-4">
                          <Badge variant={transaction.reconciliationStatus === 'reconciled' ? 'default' : 'outline'}>
                            {transaction.reconciliationStatus}
                          </Badge>
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        {transaction.reconciliationStatus === 'reconciled' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unreconcileMutation.mutate(transaction.id)}
                            disabled={unreconcileMutation.isPending}
                            data-testid={`button-unreconcile-${transaction.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Unreconcile
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => reconcileMutation.mutate(transaction.id)}
                            disabled={reconcileMutation.isPending}
                            data-testid={`button-reconcile-${transaction.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Reconcile
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {showReconciled && reconciledTransactions.length >= reconciledLimit && (
                <div className="flex justify-center py-4">
                  <Button 
                    variant="outline" 
                    onClick={handleLoadMoreReconciled}
                    disabled={loadingMore}
                    data-testid="button-load-more-reconciled"
                  >
                    {loadingMore ? "Loading..." : "Load More Reconciled Transactions"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
