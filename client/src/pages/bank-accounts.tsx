import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePlaidLink } from "react-plaid-link";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, RefreshCw, Trash2, DollarSign, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
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
import type { Organization } from "@shared/schema";

interface BankAccountsProps {
  currentOrganization: Organization;
}

interface PlaidAccount {
  id: number;
  accountId: string;
  name: string;
  officialName: string | null;
  mask: string | null;
  type: string | null;
  subtype: string | null;
  currentBalance: string | null;
  availableBalance: string | null;
  isoCurrencyCode: string | null;
  institutionName: string | null;
  itemId: string;
}

export default function BankAccounts({ currentOrganization }: BankAccountsProps) {
  const { toast } = useToast();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [disconnectingItemId, setDisconnectingItemId] = useState<string | null>(null);

  // Fetch connected accounts
  const { data: accounts, isLoading } = useQuery<PlaidAccount[]>({
    queryKey: [`/api/plaid/accounts/${currentOrganization.id}`],
    retry: false,
  });

  // Create link token mutation
  const createLinkToken = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/plaid/create-link-token/${currentOrganization.id}`, {});
      return response;
    },
    onSuccess: (data: any) => {
      setLinkToken(data.link_token);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to initialize bank connection. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Exchange token mutation
  const exchangeToken = useMutation({
    mutationFn: async (publicToken: string) => {
      return await apiRequest('POST', `/api/plaid/exchange-token/${currentOrganization.id}`, {
        public_token: publicToken,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/accounts/${currentOrganization.id}`] });
      toast({
        title: "Success",
        description: "Bank account connected successfully!",
      });
      setLinkToken(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to connect bank account. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Sync transactions mutation
  const syncTransactions = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/plaid/sync-transactions/${currentOrganization.id}`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${currentOrganization.id}`] });
      toast({
        title: "Sync Complete",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sync transactions. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Disconnect account mutation
  const disconnectAccount = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest('DELETE', `/api/plaid/item/${itemId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/accounts/${currentOrganization.id}`] });
      toast({
        title: "Disconnected",
        description: "Bank account disconnected successfully.",
      });
      setDisconnectingItemId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect bank account. Please try again.",
        variant: "destructive",
      });
      setDisconnectingItemId(null);
    },
  });

  // Plaid Link configuration
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token) => {
      exchangeToken.mutate(public_token);
    },
    onExit: () => {
      setLinkToken(null);
    },
  });

  // Open Plaid Link when token is ready
  if (linkToken && ready) {
    open();
  }

  // Group accounts by institution
  const accountsByInstitution = (accounts || []).reduce((acc, account) => {
    const institution = account.institutionName || 'Unknown Bank';
    if (!acc[institution]) {
      acc[institution] = [];
    }
    acc[institution].push(account);
    return acc;
  }, {} as Record<string, PlaidAccount[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Bank Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentOrganization.name}
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm" data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button
            onClick={() => syncTransactions.mutate()}
            disabled={!accounts || accounts.length === 0 || syncTransactions.isPending}
            data-testid="button-sync-transactions"
          >
            {syncTransactions.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Transactions
              </>
            )}
          </Button>
          <Button
            onClick={() => createLinkToken.mutate()}
            disabled={createLinkToken.isPending}
            data-testid="button-connect-bank"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Connect Bank
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!accounts || accounts.length === 0) && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Bank Accounts Connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your bank account to automatically import transactions
              </p>
              <Button
                onClick={() => createLinkToken.mutate()}
                disabled={createLinkToken.isPending}
                data-testid="button-connect-first-bank"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Connect Your First Bank
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Accounts by Institution */}
      {!isLoading && accounts && accounts.length > 0 && (
        <div className="space-y-4">
          {Object.entries(accountsByInstitution).map(([institution, institutionAccounts]) => {
            // Get the Plaid itemId for this institution (all accounts from same institution share itemId)
            const itemId = institutionAccounts[0]?.itemId;

            return (
              <Card key={institution}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {institution}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {institutionAccounts.length} account{institutionAccounts.length > 1 ? 's' : ''} connected
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDisconnectingItemId(itemId)}
                      data-testid={`button-disconnect-${itemId}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {institutionAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-md border bg-card"
                      data-testid={`account-${account.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">
                            {account.name}
                            {account.mask && <span className="text-muted-foreground ml-1">••••{account.mask}</span>}
                          </h4>
                          {account.subtype && (
                            <Badge variant="secondary" className="capitalize">
                              {account.subtype}
                            </Badge>
                          )}
                        </div>
                        {account.officialName && account.officialName !== account.name && (
                          <p className="text-sm text-muted-foreground mt-1">{account.officialName}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {account.currentBalance && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono font-semibold text-foreground" data-testid={`balance-${account.id}`}>
                              {parseFloat(account.currentBalance).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        )}
                        {account.availableBalance && account.availableBalance !== account.currentBalance && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Available: ${parseFloat(account.availableBalance).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={!!disconnectingItemId} onOpenChange={() => setDisconnectingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Bank Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the bank connection and all associated accounts. Your existing transactions will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-disconnect">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectingItemId && disconnectAccount.mutate(disconnectingItemId)}
              data-testid="button-confirm-disconnect"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
