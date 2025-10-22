import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { Organization, Transaction } from "@shared/schema";

interface DashboardProps {
  currentOrganization: Organization;
}

interface DashboardStats {
  totalIncome: string;
  totalExpenses: string;
  netIncome: string;
  transactionCount: number;
  recentTransactions: Transaction[];
}

export default function Dashboard({ currentOrganization }: DashboardProps) {
  const { toast } = useToast();
  
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: [`/api/dashboard/${currentOrganization.id}`],
    retry: false,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  const currentMonth = format(new Date(), 'MMMM yyyy');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentOrganization.name} • {currentMonth}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentOrganization.name}
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const income = parseFloat(stats.totalIncome);
  const expenses = parseFloat(stats.totalExpenses);
  const netIncome = parseFloat(stats.netIncome);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {currentOrganization.name} • {currentMonth}
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Income
            </CardTitle>
            <div className="h-8 w-8 rounded-md bg-chart-2/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-chart-2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-medium text-foreground" data-testid="text-total-income">
              ${income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
            <div className="h-8 w-8 rounded-md bg-chart-3/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-chart-3" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-medium text-foreground" data-testid="text-total-expenses">
              ${expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Income
            </CardTitle>
            <div className="h-8 w-8 rounded-md bg-chart-1/10 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-chart-1" />
            </div>
          </CardHeader>
          <CardContent>
            <div 
              className={`text-3xl font-mono font-medium ${netIncome >= 0 ? 'text-chart-2' : 'text-chart-3'}`}
              data-testid="text-net-income"
            >
              ${netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start by adding your first transaction
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover-elevate"
                  data-testid={`transaction-${transaction.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                      transaction.type === 'income' ? 'bg-chart-2/10' : 'bg-chart-3/10'
                    }`}>
                      {transaction.type === 'income' ? (
                        <ArrowUpRight className="h-4 w-4 text-chart-2" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-chart-3" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className={`text-base font-mono font-medium ${
                    transaction.type === 'income' ? 'text-chart-2' : 'text-chart-3'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}
                    ${parseFloat(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
