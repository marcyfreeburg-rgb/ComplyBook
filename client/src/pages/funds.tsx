import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import type { Organization, Grant } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface FundsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Funds({ currentOrganization }: FundsProps) {
  interface GrantWithBalances extends Grant {
    totalSpent: string;
    totalIncome: string;
    remainingBalance: string;
  }
  const { data: grants = [] } = useQuery<GrantWithBalances[]>({
    queryKey: [`/api/grants/${currentOrganization.id}`],
    enabled: currentOrganization.type === 'nonprofit',
  });

  interface FundAccountingSummary {
    bankBalance: number;
    grantFunding: number;
    grantSpending: number;
    restrictedFunds: number;
    generalFund: number;
  }
  const { data: fundAccountingSummary } = useQuery<FundAccountingSummary>({
    queryKey: [`/api/fund-accounting/${currentOrganization.id}`],
    enabled: currentOrganization.type === 'nonprofit',
  });

  const bankBalance = fundAccountingSummary?.bankBalance || 0;
  const grantFunding = fundAccountingSummary?.grantFunding || 0;
  const grantSpending = fundAccountingSummary?.grantSpending || 0;
  const restrictedFunds = fundAccountingSummary?.restrictedFunds || 0;
  const generalFund = fundAccountingSummary?.generalFund || 0;

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-funds">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-funds">Fund Accounting</h1>
          <p className="text-muted-foreground">
            Manage restricted and unrestricted funds for nonprofit accountability
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">General Fund (Unrestricted)</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-unrestricted">
              {formatCurrency(generalFund, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for general use
            </p>
            <div className="text-xs text-muted-foreground mt-3 p-2 bg-muted/50 rounded space-y-1">
              <div className="font-medium">How this is calculated:</div>
              <div>Bank Balance: {formatCurrency(bankBalance, 'USD')}</div>
              <div>- Restricted Funds: {formatCurrency(restrictedFunds, 'USD')}</div>
              <div className="border-t pt-1 font-medium">= General Fund: {formatCurrency(generalFund, 'USD')}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Grant Funds (Restricted)</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-restricted">
              {formatCurrency(restrictedFunds, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              Reserved for grant purposes
            </p>
            <div className="text-xs text-muted-foreground mt-3 p-2 bg-muted/50 rounded space-y-1">
              <div className="font-medium">How this is calculated:</div>
              <div className="text-green-600">Grant Funding: {formatCurrency(grantFunding, 'USD')}</div>
              <div className="text-red-600">- Grant Spending: {formatCurrency(grantSpending, 'USD')}</div>
              <div className="border-t pt-1 font-medium">= Remaining: {formatCurrency(restrictedFunds, 'USD')}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Bank Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-all-funds">
              {formatCurrency(bankBalance, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined from all connected accounts
            </p>
            <div className="text-xs text-muted-foreground mt-3 p-2 bg-muted/50 rounded space-y-1">
              <div className="font-medium">Breakdown:</div>
              <div>General Fund: {formatCurrency(generalFund, 'USD')}</div>
              <div>+ Restricted Funds: {formatCurrency(restrictedFunds, 'USD')}</div>
              <div className="border-t pt-1 font-medium">= Bank Balance: {formatCurrency(bankBalance, 'USD')}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grant-by-Grant Breakdown */}
      {grants.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Grant-by-Grant Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grants.map((grant) => (
              <Card key={grant.id} className="hover-elevate" data-testid={`card-grant-${grant.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg" data-testid={`text-grant-name-${grant.id}`}>
                    {grant.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Grant Amount:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(parseFloat(grant.amount), 'USD')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spent:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(parseFloat(grant.totalSpent || "0"), 'USD')}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Remaining:</span>
                      <span className="font-bold">
                        {formatCurrency(parseFloat(grant.remainingBalance || grant.amount), 'USD')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
