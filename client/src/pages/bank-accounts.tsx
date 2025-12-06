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
import { Building2, RefreshCw, Trash2, DollarSign, CheckCircle2, XCircle, ArrowLeft, CreditCard, User, Phone, Mail, MapPin, Key } from "lucide-react";
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

  // Fetch auth data (account/routing numbers)
  const fetchAuthData = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/plaid/auth/${currentOrganization.id}`, {});
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
      return await apiRequest('POST', `/api/plaid/identity/${currentOrganization.id}`, {});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to fetch identity information. Some banks may not support this feature.",
        variant: "destructive",
      });
    },
  });

  // Plaid Link configuration
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token) => {
      exchangeToken.mutate(public_token);
      setHasAttemptedAutoOpen(false);
    },
    onExit: () => {
      setLinkToken(null);
      setHasAttemptedAutoOpen(false);
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
    </div>
  );
}
