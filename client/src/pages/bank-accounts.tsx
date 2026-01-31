import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePlaidLink } from "react-plaid-link";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, RefreshCw, Trash2, DollarSign, CheckCircle2, XCircle, ArrowLeft, CreditCard, User, Phone, Mail, MapPin, Key, AlertTriangle, Shield, Clock, FileText, TrendingUp, Wallet, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  initialBalance: string | null;
  initialBalanceDate: string | null;
}

interface PlaidItem {
  id: number;
  itemId: string;
  institutionId: string | null;
  institutionName: string | null;
  status: 'active' | 'login_required' | 'error' | 'pending';
  errorCode: string | null;
  errorMessage: string | null;
  lastSyncedAt: string | null;
}

interface AuthAccountData {
  accountId: string;
  name: string;
  mask: string | null;
  accountNumber: string | null;
  routingNumber: string | null;
  wireRoutingNumber: string | null;
}

interface IdentityOwner {
  names: string[];
  emails: Array<{ data: string; primary: boolean; type: string }>;
  phoneNumbers: Array<{ data: string; primary: boolean; type: string }>;
  addresses: Array<{ data: any; primary: boolean }>;
}

interface IdentityAccountData {
  accountId: string;
  name: string;
  mask: string | null;
  owners: IdentityOwner[];
}

export default function BankAccounts({ currentOrganization }: BankAccountsProps) {
  const { toast } = useToast();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [hasAttemptedAutoOpen, setHasAttemptedAutoOpen] = useState(false);
  const [disconnectingItemId, setDisconnectingItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("accounts");
  const [updateModeItemId, setUpdateModeItemId] = useState<number | null>(null);
  const [updateLinkToken, setUpdateLinkToken] = useState<string | null>(null);
  const [startingBalanceAccount, setStartingBalanceAccount] = useState<PlaidAccount | null>(null);
  const [startingBalanceValue, setStartingBalanceValue] = useState("");
  const [startingBalanceDate, setStartingBalanceDate] = useState("");

  // Fetch connected accounts
  const { data: accounts, isLoading } = useQuery<PlaidAccount[]>({
    queryKey: [`/api/plaid/accounts/${currentOrganization.id}`],
    retry: false,
  });

  // Fetch Plaid items (to check status)
  const { data: plaidItems } = useQuery<PlaidItem[]>({
    queryKey: [`/api/plaid/items/${currentOrganization.id}`],
    retry: false,
  });

  // Get items that need attention (login_required or error status)
  const itemsNeedingUpdate = plaidItems?.filter(
    item => item.status === 'login_required' || item.status === 'error'
  ) || [];

  // Create link token mutation
  const createLinkToken = useMutation({
    mutationFn: async () => {
      console.log('=== Creating Plaid Link Token ===');
      console.log('Organization ID:', currentOrganization?.id);
      console.log('Organization name:', currentOrganization?.name);
      
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      
      try {
        const url = `/api/plaid/create-link-token/${currentOrganization.id}`;
        console.log('Calling API:', url);
        const response = await apiRequest('POST', url, {});
        console.log('Link token response status:', response.status);
        const data = await response.json();
        console.log('Link token data received:', data.link_token ? 'token present' : 'no token');
        return data;
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError);
        console.error('Error message:', fetchError.message);
        throw fetchError;
      }
    },
    onSuccess: (data: any) => {
      console.log('onSuccess - setting link token');
      setLinkToken(data.link_token);
    },
    onError: (error: Error) => {
      console.error('=== Plaid Link Token Error ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
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
          description: error.message || "Failed to initialize bank connection. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Exchange token mutation
  const exchangeToken = useMutation({
    mutationFn: async ({ publicToken, metadata }: { publicToken: string; metadata?: any }) => {
      const response = await apiRequest('POST', `/api/plaid/exchange-token/${currentOrganization.id}`, {
        public_token: publicToken,
        metadata: metadata,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/accounts/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/items/${currentOrganization.id}`] });
      let description = "Bank account connected successfully!";
      if (data.duplicateAccountsWarning) {
        description += ` Note: ${data.duplicateAccountsWarning}`;
      }
      toast({
        title: "Success",
        description,
      });
      setLinkToken(null);
    },
    onError: (error: any) => {
      let description = "Failed to connect bank account. Please try again.";
      // Check if this is a duplicate detection error
      if (error?.response?.status === 409 || error?.message?.includes('already connected')) {
        description = error.message || "This bank is already connected. To reconnect, please remove the existing connection first.";
        toast({
          title: "Bank Already Connected",
          description,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description,
          variant: "destructive",
        });
      }
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

  // Fetch auth data (account/routing numbers)
  const fetchAuthData = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/plaid/auth/${currentOrganization.id}`, {});
      return await response.json();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to fetch account numbers. Some banks may not support this feature.",
        variant: "destructive",
      });
    },
  });

  // Fetch identity data (owner information)
  const fetchIdentityData = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/plaid/identity/${currentOrganization.id}`, {});
      return await response.json();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to fetch identity information. Some banks may not support this feature.",
        variant: "destructive",
      });
    },
  });

  // Create update mode link token mutation
  const createUpdateLinkToken = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest('POST', `/api/plaid/create-update-link-token/${itemId}`, {});
      return response;
    },
    onSuccess: (data: any, itemId: number) => {
      setUpdateModeItemId(itemId);
      setUpdateLinkToken(data.link_token);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start bank re-authentication. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update initial balance mutation
  const updateInitialBalance = useMutation({
    mutationFn: async ({ accountId, initialBalance, initialBalanceDate }: { accountId: string; initialBalance: string; initialBalanceDate: string }) => {
      return await apiRequest('PATCH', `/api/plaid/account/${accountId}/initial-balance`, {
        initialBalance,
        initialBalanceDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/accounts/${currentOrganization.id}`] });
      toast({
        title: "Starting Balance Set",
        description: "The account's starting balance has been saved.",
      });
      setStartingBalanceAccount(null);
      setStartingBalanceValue("");
      setStartingBalanceDate("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update starting balance. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Log Plaid Link events for analytics
  const logPlaidEvent = async (eventName: string, metadata: any) => {
    try {
      await apiRequest('POST', `/api/plaid/log-event/${currentOrganization.id}`, {
        eventName,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Silent fail - don't disrupt user flow for analytics
      console.debug('Plaid event logging failed:', eventName);
    }
  };

  // Plaid Link configuration (for new connections)
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      // Log success event (no PII - omit institution name)
      logPlaidEvent('SUCCESS', {
        institutionId: metadata?.institution?.institution_id,
        // Do NOT log: institution name (full)
        accountsCount: metadata?.accounts?.length,
      });
      // Pass metadata for duplicate Item detection
      exchangeToken.mutate({ publicToken: public_token, metadata });
      setHasAttemptedAutoOpen(false);
    },
    onExit: (error, metadata) => {
      // Log exit event with reason (no PII - omit session IDs and full institution names)
      logPlaidEvent('EXIT', {
        errorType: error?.error_type,
        errorCode: error?.error_code,
        exitStatus: metadata?.status,
        institutionId: metadata?.institution?.institution_id,
        // Do NOT log: institution name (full), link_session_id
      });
      setLinkToken(null);
      setHasAttemptedAutoOpen(false);
    },
    onEvent: (eventName, metadata) => {
      // Log all Link events for conversion analytics
      // Note: Only log non-PII fields - never log session IDs, search queries, or full institution names
      logPlaidEvent(eventName, {
        viewName: metadata?.view_name,
        institutionId: metadata?.institution_id,
        // Do NOT log: institution_name (full), institution_search_query, link_session_id (PII/sensitive)
        errorType: metadata?.error_type,
        errorCode: metadata?.error_code,
        exitStatus: metadata?.exit_status,
        mfaType: metadata?.mfa_type,
      });
    },
  });

  // Plaid Link configuration (for update mode)
  const { open: openUpdate, ready: readyUpdate } = usePlaidLink({
    token: updateLinkToken,
    onSuccess: (_, metadata) => {
      // Log update success (no PII - omit institution name)
      logPlaidEvent('UPDATE_SUCCESS', {
        institutionId: metadata?.institution?.institution_id,
        // Do NOT log: institution name (full)
        mode: 'update',
      });
      // Update mode doesn't return a public token - just invalidate queries to refresh status
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/items/${currentOrganization.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/accounts/${currentOrganization.id}`] });
      toast({
        title: "Bank Connection Repaired",
        description: "Your bank connection has been successfully re-authenticated.",
      });
      setUpdateLinkToken(null);
      setUpdateModeItemId(null);
    },
    onExit: (error, metadata) => {
      // Log update exit
      logPlaidEvent('UPDATE_EXIT', {
        errorType: error?.error_type,
        errorCode: error?.error_code,
        exitStatus: metadata?.status,
        mode: 'update',
      });
      setUpdateLinkToken(null);
      setUpdateModeItemId(null);
    },
    onEvent: (eventName, metadata) => {
      // Log update mode events (no PII - omit session IDs)
      logPlaidEvent(`UPDATE_${eventName}`, {
        viewName: metadata?.view_name,
        institutionId: metadata?.institution_id,
        errorType: metadata?.error_type,
        errorCode: metadata?.error_code,
        mode: 'update',
      });
    },
  });

  // Open Plaid Link when token is ready (auto-open once per token)
  useEffect(() => {
    if (linkToken && ready && !hasAttemptedAutoOpen) {
      console.log("Plaid Link ready, attempting auto-open...");
      setHasAttemptedAutoOpen(true);
      open();
    }
  }, [linkToken, ready, hasAttemptedAutoOpen, open]);

  // Auto-open update mode Plaid Link when token is ready
  useEffect(() => {
    if (updateLinkToken && readyUpdate) {
      console.log("Plaid Link (update mode) ready, opening...");
      openUpdate();
    }
  }, [updateLinkToken, readyUpdate, openUpdate]);

  // Reset auto-open flag when link token changes
  useEffect(() => {
    if (!linkToken) {
      setHasAttemptedAutoOpen(false);
    }
  }, [linkToken]);

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
          {linkToken && ready ? (
            <Button
              onClick={() => open()}
              disabled={!ready}
              data-testid="button-open-plaid"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Open Bank Connection
            </Button>
          ) : (
            <Button
              onClick={() => createLinkToken.mutate()}
              disabled={createLinkToken.isPending || linkToken !== null}
              data-testid="button-connect-bank"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Connect Bank
            </Button>
          )}
        </div>
      </div>

      {/* Update Mode Alert - Items needing re-authentication */}
      {itemsNeedingUpdate.length > 0 && (
        <div className="space-y-3">
          {itemsNeedingUpdate.map((item) => (
            <Alert key={item.id} variant="destructive" data-testid={`alert-update-needed-${item.id}`}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="flex items-center justify-between">
                <span>
                  {item.institutionName || 'Bank Connection'} Needs Attention
                </span>
                <Button
                  size="sm"
                  onClick={() => createUpdateLinkToken.mutate(item.id)}
                  disabled={createUpdateLinkToken.isPending}
                  data-testid={`button-repair-connection-${item.id}`}
                >
                  {createUpdateLinkToken.isPending && updateModeItemId === item.id ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Repair Connection
                    </>
                  )}
                </Button>
              </AlertTitle>
              <AlertDescription>
                {item.errorMessage || 'Please re-authenticate to continue syncing transactions.'}
                {item.errorCode && (
                  <span className="text-xs ml-2 opacity-75">
                    (Error: {item.errorCode})
                  </span>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

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

      {/* Empty State with Benefits Explainer */}
      {!isLoading && (!accounts || accounts.length === 0) && (
        <div className="space-y-6">
          {/* Benefits Card - Differentiated by org type */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                {currentOrganization.type === 'nonprofit' 
                  ? 'Secure Bank Connection for Grant Compliance'
                  : 'Secure Bank Connection for Your Business'}
              </CardTitle>
              <CardDescription>
                {currentOrganization.type === 'nonprofit'
                  ? 'Automatically import and categorize transactions for accurate grant reporting and audit readiness.'
                  : 'Save hours each week by automatically importing and categorizing your business transactions.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Save Time</h4>
                    <p className="text-xs text-muted-foreground">
                      {currentOrganization.type === 'nonprofit'
                        ? 'Automatic transaction import eliminates manual data entry for grant reconciliation.'
                        : 'No more manual entry. Transactions sync automatically.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">
                      {currentOrganization.type === 'nonprofit' ? 'Audit Ready' : 'Accurate Records'}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {currentOrganization.type === 'nonprofit'
                        ? 'Complete transaction history with NIST-compliant audit trails for DCAA requirements.'
                        : 'Clean, categorized records ready for tax season.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">
                      {currentOrganization.type === 'nonprofit' ? 'Grant Tracking' : 'Cash Flow Insights'}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {currentOrganization.type === 'nonprofit'
                        ? 'Easily allocate expenses to grants and track fund balances in real-time.'
                        : 'Real-time visibility into your income and expenses.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  <strong>Bank-level security:</strong> Your credentials are never stored. Connections are secured with 256-bit encryption via Plaid, trusted by major financial institutions.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Connect CTA Card */}
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Bank Accounts Connected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your bank to start importing transactions automatically
                </p>
                <Button
                  onClick={() => createLinkToken.mutate()}
                  disabled={createLinkToken.isPending}
                  data-testid="button-connect-first-bank"
                  size="lg"
                >
                  {createLinkToken.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4 mr-2" />
                      Connect Your First Bank
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connected Accounts with Tabs */}
      {!isLoading && accounts && accounts.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="accounts" data-testid="tab-accounts">
              <CreditCard className="h-4 w-4 mr-2" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="auth" data-testid="tab-auth">
              <Key className="h-4 w-4 mr-2" />
              ACH Numbers
            </TabsTrigger>
            <TabsTrigger value="identity" data-testid="tab-identity">
              <User className="h-4 w-4 mr-2" />
              Identity
            </TabsTrigger>
          </TabsList>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-4">
            {Object.entries(accountsByInstitution).map(([institution, institutionAccounts]) => {
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
                        <div className="flex items-center gap-3">
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
                            {account.initialBalance && account.initialBalanceDate && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Starting: ${parseFloat(account.initialBalance).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })} on {account.initialBalanceDate}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStartingBalanceAccount(account);
                              setStartingBalanceValue(account.initialBalance || "");
                              setStartingBalanceDate(account.initialBalanceDate || "");
                            }}
                            data-testid={`button-set-balance-${account.id}`}
                          >
                            <Wallet className="h-4 w-4 mr-1" />
                            {account.initialBalance ? "Edit" : "Set"} Balance
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Auth Tab - Account/Routing Numbers */}
          <TabsContent value="auth" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      ACH Account Numbers
                    </CardTitle>
                    <CardDescription>
                      Account and routing numbers for ACH transfers
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => fetchAuthData.mutate()}
                    disabled={fetchAuthData.isPending}
                    data-testid="button-fetch-auth"
                  >
                    {fetchAuthData.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Fetch ACH Numbers
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!fetchAuthData.data && !fetchAuthData.isPending && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Click "Fetch ACH Numbers" to retrieve account and routing numbers</p>
                    <p className="text-sm mt-1">This information is used for ACH bank transfers</p>
                  </div>
                )}
                {fetchAuthData.data && (
                  <div className="space-y-4">
                    {(fetchAuthData.data as any).authData?.map((item: { institutionName: string | null; accounts: AuthAccountData[] }, idx: number) => (
                      <div key={idx} className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {item.institutionName || 'Unknown Bank'}
                        </h4>
                        {item.accounts.length === 0 ? (
                          <p className="text-sm text-muted-foreground pl-6">Auth data not available for this institution</p>
                        ) : (
                          item.accounts.map((account) => (
                            <div key={account.accountId} className="p-4 rounded-md border bg-card ml-6">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">{account.name}</span>
                                {account.mask && <span className="text-muted-foreground">••••{account.mask}</span>}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Account Number:</span>
                                  <span className="ml-2 font-mono">{account.accountNumber || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Routing Number:</span>
                                  <span className="ml-2 font-mono">{account.routingNumber || 'N/A'}</span>
                                </div>
                                {account.wireRoutingNumber && (
                                  <div>
                                    <span className="text-muted-foreground">Wire Routing:</span>
                                    <span className="ml-2 font-mono">{account.wireRoutingNumber}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Identity Tab - Owner Information */}
          <TabsContent value="identity" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Account Holder Identity
                    </CardTitle>
                    <CardDescription>
                      Owner information from connected bank accounts
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => fetchIdentityData.mutate()}
                    disabled={fetchIdentityData.isPending}
                    data-testid="button-fetch-identity"
                  >
                    {fetchIdentityData.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Fetch Identity
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!fetchIdentityData.data && !fetchIdentityData.isPending && (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Click "Fetch Identity" to retrieve account holder information</p>
                    <p className="text-sm mt-1">This includes names, emails, phone numbers, and addresses</p>
                  </div>
                )}
                {fetchIdentityData.data && (
                  <div className="space-y-4">
                    {(fetchIdentityData.data as any).identityData?.map((item: { institutionName: string | null; accounts: IdentityAccountData[] }, idx: number) => (
                      <div key={idx} className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {item.institutionName || 'Unknown Bank'}
                        </h4>
                        {item.accounts.length === 0 ? (
                          <p className="text-sm text-muted-foreground pl-6">Identity data not available for this institution</p>
                        ) : (
                          item.accounts.map((account) => (
                            <div key={account.accountId} className="p-4 rounded-md border bg-card ml-6">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="font-medium">{account.name}</span>
                                {account.mask && <span className="text-muted-foreground">••••{account.mask}</span>}
                              </div>
                              {account.owners.map((owner, ownerIdx) => (
                                <div key={ownerIdx} className="space-y-2 text-sm">
                                  {owner.names.length > 0 && (
                                    <div className="flex items-start gap-2">
                                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <span className="text-muted-foreground">Names:</span>
                                        <span className="ml-2">{owner.names.join(', ')}</span>
                                      </div>
                                    </div>
                                  )}
                                  {owner.emails.length > 0 && (
                                    <div className="flex items-start gap-2">
                                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <span className="text-muted-foreground">Emails:</span>
                                        <span className="ml-2">{owner.emails.map(e => e.data).join(', ')}</span>
                                      </div>
                                    </div>
                                  )}
                                  {owner.phoneNumbers.length > 0 && (
                                    <div className="flex items-start gap-2">
                                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <span className="text-muted-foreground">Phone:</span>
                                        <span className="ml-2">{owner.phoneNumbers.map(p => p.data).join(', ')}</span>
                                      </div>
                                    </div>
                                  )}
                                  {owner.addresses.length > 0 && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <span className="text-muted-foreground">Addresses:</span>
                                        <div className="ml-2">
                                          {owner.addresses.map((addr, addrIdx) => (
                                            <div key={addrIdx} className="text-sm">
                                              {typeof addr.data === 'object' ? (
                                                <>
                                                  {addr.data?.street && <span>{addr.data.street}, </span>}
                                                  {addr.data?.city && <span>{addr.data.city}, </span>}
                                                  {addr.data?.region && <span>{addr.data.region} </span>}
                                                  {addr.data?.postal_code && <span>{addr.data.postal_code}</span>}
                                                </>
                                              ) : (
                                                <span>{String(addr.data)}</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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

      {/* Starting Balance Dialog */}
      <Dialog open={!!startingBalanceAccount} onOpenChange={(open) => {
        if (!open) {
          setStartingBalanceAccount(null);
          setStartingBalanceValue("");
          setStartingBalanceDate("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Set Starting Balance
            </DialogTitle>
            <DialogDescription>
              Enter the account balance as of a specific date. This is used to calculate running balances for your transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Account</Label>
              <div className="text-sm text-muted-foreground">
                {startingBalanceAccount?.name}
                {startingBalanceAccount?.mask && ` ••••${startingBalanceAccount.mask}`}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="starting-balance">Starting Balance</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="starting-balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-9"
                  value={startingBalanceValue}
                  onChange={(e) => setStartingBalanceValue(e.target.value)}
                  data-testid="input-starting-balance"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the balance from your bank statement for the date below.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance-date">Balance Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="balance-date"
                  type="date"
                  className="pl-9"
                  value={startingBalanceDate}
                  onChange={(e) => setStartingBalanceDate(e.target.value)}
                  data-testid="input-balance-date"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This should be the date that corresponds to your starting balance.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStartingBalanceAccount(null);
                setStartingBalanceValue("");
                setStartingBalanceDate("");
              }}
              data-testid="button-cancel-balance"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (startingBalanceAccount && startingBalanceValue && startingBalanceDate) {
                  updateInitialBalance.mutate({
                    accountId: startingBalanceAccount.accountId,
                    initialBalance: startingBalanceValue,
                    initialBalanceDate: startingBalanceDate,
                  });
                }
              }}
              disabled={!startingBalanceValue || !startingBalanceDate || updateInitialBalance.isPending}
              data-testid="button-save-balance"
            >
              {updateInitialBalance.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Balance"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
