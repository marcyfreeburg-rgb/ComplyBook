import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Sparkles, RefreshCw } from "lucide-react";
import type { Organization, Transaction } from "@shared/schema";
import { format } from "date-fns";
import { safeFormatDate } from "@/lib/utils";

type OrganizationWithRole = Organization & { userRole: string };

interface BankReconciliationProps {
  currentOrganization?: OrganizationWithRole;
}

export default function BankReconciliation({ currentOrganization }: BankReconciliationProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showReconciled, setShowReconciled] = useState(false);

  // Fetch unreconciled transactions
  const { data: unreconciledTransactions = [], isLoading: isLoadingUnreconciled } = useQuery<Transaction[]>({
    queryKey: [`/api/reconciliation/unreconciled/${currentOrganization?.id}`],
    enabled: !!currentOrganization,
  });

  // Fetch all transactions for reconciled view
  const { data: allTransactions = [], isLoading: isLoadingAll } = useQuery<Transaction[]>({
    queryKey: [`/api/transactions/${currentOrganization?.id}`],
    enabled: !!currentOrganization && showReconciled,
  });

  const transactions = showReconciled ? allTransactions : unreconciledTransactions;
  const isLoading = showReconciled ? isLoadingAll : isLoadingUnreconciled;

  // Reconcile single transaction
  const reconcileMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('POST', `/api/reconciliation/reconcile/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/reconciliation/unreconciled/${currentOrganization?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization?.id}`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization?.id}`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization?.id}`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization?.id}`] });
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
    if (selectedIds.length === unreconciledTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unreconciledTransactions.map(t => t.id));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-reconciliation">Bank Reconciliation</h1>
          <p className="text-muted-foreground">Match transactions with your bank statements</p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
            {showReconciled ? "Show Unreconciled" : "Show All"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                {showReconciled ? "All transactions" : `${unreconciledTransactions.length} unreconciled transactions`}
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
                          checked={selectedIds.length === unreconciledTransactions.length && unreconciledTransactions.length > 0}
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
                        ${parseFloat(transaction.amount).toFixed(2)}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
