import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Receipt, Target, BarChart3, PieChart } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { useLocation } from "wouter";
import type { Organization, Transaction, Budget } from "@shared/schema";
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
  const [, setLocation] = useLocation();
  
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: [`/api/dashboard/${currentOrganization.id}`],
    retry: false,
  });

  const { data: budgets = [] } = useQuery<Budget[]>({
    queryKey: ["/api/budgets", currentOrganization.id],
  });

  // Find active budget for current month
  const now = new Date();
  const activeBudget = budgets.find(budget => 
    isWithinInterval(now, {
      start: new Date(budget.startDate),
      end: new Date(budget.endDate),
    })
  );

  const { data: budgetVsActual = [] } = useQuery<Array<{
    categoryId: number;
    categoryName: string;
    budgeted: string;
    actual: string;
    difference: string;
    percentUsed: number;
  }>>({
    queryKey: ["/api/budgets", activeBudget?.id, "vs-actual"],
    enabled: !!activeBudget,
  });

  const { data: monthlyTrends = [] } = useQuery<Array<{
    month: string;
    income: string;
    expenses: string;
    netIncome: string;
  }>>({
    queryKey: [`/api/dashboard/${currentOrganization.id}/monthly-trends`],
  });

  const { data: categoryBreakdown } = useQuery<{
    incomeByCategory: Array<{ categoryName: string; amount: string }>;
    expensesByCategory: Array<{ categoryName: string; amount: string }>;
  }>({
    queryKey: [`/api/dashboard/${currentOrganization.id}/category-breakdown`],
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

      {/* Budget Performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <div>
            <CardTitle>Budget Performance</CardTitle>
            {activeBudget && (
              <p className="text-sm text-muted-foreground mt-1">
                {activeBudget.name} • {format(new Date(activeBudget.startDate), 'MMM dd')} - {format(new Date(activeBudget.endDate), 'MMM dd, yyyy')}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setLocation('/budgets')} data-testid="button-view-budgets">
            <Target className="h-4 w-4 mr-2" />
            Manage Budgets
          </Button>
        </CardHeader>
        <CardContent>
          {!activeBudget ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground mb-1">No active budget for this period</p>
              <p className="text-xs text-muted-foreground mb-4">
                Create a budget to track your spending goals
              </p>
              <Button variant="outline" onClick={() => setLocation('/budgets')} data-testid="button-create-budget">
                Create Budget
              </Button>
            </div>
          ) : budgetVsActual.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-1">Budget has no categories yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Add categories to your budget to start tracking
              </p>
              <Button variant="outline" onClick={() => setLocation('/budgets')} data-testid="button-add-categories">
                Add Categories
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetVsActual.slice(0, 5).map((item) => {
                const isOverBudget = item.percentUsed > 100;
                const isNearLimit = item.percentUsed > 80 && item.percentUsed <= 100;
                return (
                  <div key={item.categoryId} className="space-y-2" data-testid={`budget-category-${item.categoryId}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.categoryName}</span>
                      <span className="text-sm text-muted-foreground font-mono">
                        ${parseFloat(item.actual).toFixed(2)} / ${parseFloat(item.budgeted).toFixed(2)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(item.percentUsed, 100)} 
                      className={isOverBudget ? 'bg-red-200' : isNearLimit ? 'bg-yellow-200' : ''} 
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className={
                        isOverBudget ? 'text-red-600 font-semibold' : 
                        isNearLimit ? 'text-yellow-600 font-semibold' : 
                        'text-muted-foreground'
                      }>
                        {item.percentUsed}% used
                      </span>
                      {parseFloat(item.difference) < 0 ? (
                        <span className="text-red-600 font-semibold">
                          ${Math.abs(parseFloat(item.difference)).toFixed(2)} over
                        </span>
                      ) : (
                        <span className="text-chart-2">
                          ${parseFloat(item.difference).toFixed(2)} remaining
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {budgetVsActual.length > 5 && (
                <Button 
                  variant="ghost" 
                  className="w-full mt-2" 
                  onClick={() => setLocation('/budgets')}
                  data-testid="button-view-all-budgets"
                >
                  View all {budgetVsActual.length} categories
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-chart-1" />
              <CardTitle>Income vs Expenses Trend</CardTitle>
            </div>
            <CardDescription>Last 6 months comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyTrends.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
                Not enough data to display trends
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrends.map(t => ({
                  month: t.month,
                  Income: parseFloat(t.income),
                  Expenses: parseFloat(t.expenses),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: any) => `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Income" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Expenses" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-3))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Expense Category Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-chart-1" />
              <CardTitle>Expense Breakdown</CardTitle>
            </div>
            <CardDescription>Current month by category</CardDescription>
          </CardHeader>
          <CardContent>
            {!categoryBreakdown || categoryBreakdown.expensesByCategory.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
                No expense categories to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={categoryBreakdown.expensesByCategory.map(cat => ({
                      name: cat.categoryName,
                      value: parseFloat(cat.amount),
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                    outerRadius={100}
                    fill="hsl(var(--chart-1))"
                    dataKey="value"
                  >
                    {categoryBreakdown.expensesByCategory.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: any) => `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
