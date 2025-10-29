import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  AlertTriangle,
  Target,
  PieChart as PieChartIcon,
  BarChart3,
  Zap
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { Organization } from "@shared/schema";

interface AnalyticsProps {
  currentOrganization: Organization;
}

export default function Analytics({ currentOrganization }: AnalyticsProps) {
  const { data: yearOverYear, isLoading: yoyLoading } = useQuery({
    queryKey: [`/api/analytics/${currentOrganization.id}/year-over-year`],
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: [`/api/analytics/${currentOrganization.id}/forecast?months=6`],
  });

  const { data: financialHealth, isLoading: healthLoading } = useQuery({
    queryKey: [`/api/analytics/${currentOrganization.id}/financial-health`],
  });

  const { data: spendingInsights, isLoading: insightsLoading } = useQuery({
    queryKey: [`/api/analytics/${currentOrganization.id}/spending-insights`],
  });

  const isLoading = yoyLoading || forecastLoading || healthLoading || insightsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Enhanced Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentOrganization.name} • Advanced Insights
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Enhanced Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {currentOrganization.name} • Advanced Financial Insights & Forecasting
        </p>
      </div>

      {/* Financial Health Overview */}
      {financialHealth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-medium text-foreground" data-testid="text-health-score">
                {financialHealth.healthScore}
              </div>
              <Badge className={getHealthColor(financialHealth.healthStatus)} data-testid="badge-health-status">
                {financialHealth.healthStatus.toUpperCase()}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Burn Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-medium text-foreground" data-testid="text-burn-rate">
                ${parseFloat(financialHealth.burnRate).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                per month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Runway
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-medium text-foreground" data-testid="text-runway">
                {financialHealth.runway !== null ? financialHealth.runway : '∞'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {financialHealth.runway !== null ? 'months remaining' : 'sustainable'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Profit Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-mono font-medium ${
                financialHealth.profitMargin >= 0 ? 'text-chart-2' : 'text-chart-3'
              }`} data-testid="text-profit-margin">
                {financialHealth.profitMargin.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {financialHealth.profitMargin >= 0 ? 'positive' : 'negative'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabbed Analytics */}
      <Tabs defaultValue="yoy" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="yoy" data-testid="tab-yoy">Year-over-Year</TabsTrigger>
          <TabsTrigger value="forecast" data-testid="tab-forecast">Forecast</TabsTrigger>
          <TabsTrigger value="spending" data-testid="tab-spending">Spending Insights</TabsTrigger>
          <TabsTrigger value="savings" data-testid="tab-savings">Savings</TabsTrigger>
        </TabsList>

        {/* Year-over-Year Analysis */}
        <TabsContent value="yoy" className="space-y-6">
          {yearOverYear && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Income Change</CardTitle>
                    <CardDescription>Current vs Previous Year</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Year</span>
                        <span className="font-mono font-medium">${parseFloat(yearOverYear.currentYear.income).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Previous Year</span>
                        <span className="font-mono font-medium">${parseFloat(yearOverYear.previousYear.income).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium">Change</span>
                        <div className="flex items-center gap-2">
                          {yearOverYear.change.incomePercent >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-chart-2" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-chart-3" />
                          )}
                          <span className={`font-mono font-semibold ${
                            yearOverYear.change.incomePercent >= 0 ? 'text-chart-2' : 'text-chart-3'
                          }`}>
                            {yearOverYear.change.incomePercent >= 0 ? '+' : ''}{yearOverYear.change.incomePercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Expense Change</CardTitle>
                    <CardDescription>Current vs Previous Year</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Year</span>
                        <span className="font-mono font-medium">${parseFloat(yearOverYear.currentYear.expenses).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Previous Year</span>
                        <span className="font-mono font-medium">${parseFloat(yearOverYear.previousYear.expenses).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium">Change</span>
                        <div className="flex items-center gap-2">
                          {yearOverYear.change.expensesPercent >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-chart-3" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-chart-2" />
                          )}
                          <span className={`font-mono font-semibold ${
                            yearOverYear.change.expensesPercent >= 0 ? 'text-chart-3' : 'text-chart-2'
                          }`}>
                            {yearOverYear.change.expensesPercent >= 0 ? '+' : ''}{yearOverYear.change.expensesPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Net Income Change</CardTitle>
                    <CardDescription>Current vs Previous Year</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Year</span>
                        <span className="font-mono font-medium">${parseFloat(yearOverYear.currentYear.netIncome).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Previous Year</span>
                        <span className="font-mono font-medium">${parseFloat(yearOverYear.previousYear.netIncome).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium">Change</span>
                        <div className="flex items-center gap-2">
                          {yearOverYear.change.netIncomePercent >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-chart-2" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-chart-3" />
                          )}
                          <span className={`font-mono font-semibold ${
                            yearOverYear.change.netIncomePercent >= 0 ? 'text-chart-2' : 'text-chart-3'
                          }`}>
                            {yearOverYear.change.netIncomePercent >= 0 ? '+' : ''}{yearOverYear.change.netIncomePercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Comparison Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-chart-1" />
                    <CardTitle>Monthly Comparison</CardTitle>
                  </div>
                  <CardDescription>Income and expenses comparison by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={yearOverYear.monthlyComparison.map(m => ({
                      month: m.month.split(' ')[0],
                      'This Year Income': parseFloat(m.currentYearIncome),
                      'Last Year Income': parseFloat(m.previousYearIncome),
                      'This Year Expenses': parseFloat(m.currentYearExpenses),
                      'Last Year Expenses': parseFloat(m.previousYearExpenses),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                        formatter={(value: any) => `$${parseFloat(value).toLocaleString()}`}
                      />
                      <Legend />
                      <Bar dataKey="This Year Income" fill="hsl(var(--chart-2))" />
                      <Bar dataKey="Last Year Income" fill="hsl(var(--chart-2))" opacity={0.5} />
                      <Bar dataKey="This Year Expenses" fill="hsl(var(--chart-3))" />
                      <Bar dataKey="Last Year Expenses" fill="hsl(var(--chart-3))" opacity={0.5} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Forecast Analysis */}
        <TabsContent value="forecast" className="space-y-6">
          {forecast && forecast.forecast.length > 0 && (
            <>
              {/* Trend Analysis Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Income Growth Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-mono font-medium ${
                      forecast.trendAnalysis.incomeGrowthRate >= 0 ? 'text-chart-2' : 'text-chart-3'
                    }`}>
                      {forecast.trendAnalysis.incomeGrowthRate >= 0 ? '+' : ''}{forecast.trendAnalysis.incomeGrowthRate}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Expense Growth Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-mono font-medium ${
                      forecast.trendAnalysis.expenseGrowthRate >= 0 ? 'text-chart-3' : 'text-chart-2'
                    }`}>
                      {forecast.trendAnalysis.expenseGrowthRate >= 0 ? '+' : ''}{forecast.trendAnalysis.expenseGrowthRate}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Monthly Income</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-mono font-medium text-foreground">
                      ${parseFloat(forecast.trendAnalysis.averageMonthlyIncome).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Monthly Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-mono font-medium text-foreground">
                      ${parseFloat(forecast.trendAnalysis.averageMonthlyExpenses).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Forecast Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-chart-1" />
                    <CardTitle>6-Month Forecast</CardTitle>
                  </div>
                  <CardDescription>Projected income and expenses based on historical trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={forecast.forecast.map(f => ({
                      month: f.month,
                      'Projected Income': parseFloat(f.projectedIncome),
                      'Projected Expenses': parseFloat(f.projectedExpenses),
                      'Projected Net Income': parseFloat(f.projectedNetIncome),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                        formatter={(value: any) => `$${parseFloat(value).toLocaleString()}`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="Projected Income" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-2))' }} />
                      <Line type="monotone" dataKey="Projected Expenses" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-3))' }} />
                      <Line type="monotone" dataKey="Projected Net Income" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-1))' }} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}

          {forecast && forecast.forecast.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Not enough historical data to generate forecast
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    At least 3 months of transaction data is required
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Spending Insights */}
        <TabsContent value="spending" className="space-y-6">
          {spendingInsights && (
            <>
              {/* Top Expense Categories */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-chart-1" />
                    <CardTitle>Top Expense Categories</CardTitle>
                  </div>
                  <CardDescription>Highest spending categories this month</CardDescription>
                </CardHeader>
                <CardContent>
                  {spendingInsights.topExpenseCategories.length > 0 ? (
                    <div className="space-y-4">
                      {spendingInsights.topExpenseCategories.map((cat, index) => (
                        <div key={index} className="flex items-center justify-between" data-testid={`expense-category-${index}`}>
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center gap-2 min-w-[200px]">
                              <span className="text-sm font-medium">{cat.categoryName}</span>
                              {cat.trend === 'up' && <TrendingUp className="h-4 w-4 text-chart-3" />}
                              {cat.trend === 'down' && <TrendingDown className="h-4 w-4 text-chart-2" />}
                            </div>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className="bg-chart-1 h-2 rounded-full"
                                style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="ml-4 text-right">
                            <div className="text-sm font-mono font-medium">${parseFloat(cat.amount).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No expense data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Unusual Spending */}
              {spendingInsights.unusualSpending.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <CardTitle>Unusual Spending Detected</CardTitle>
                    </div>
                    <CardDescription>Categories with significantly higher spending than average</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {spendingInsights.unusualSpending.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-md bg-yellow-50 border border-yellow-200" data-testid={`unusual-spending-${index}`}>
                          <div>
                            <p className="text-sm font-medium">{item.categoryName}</p>
                            <p className="text-xs text-muted-foreground">
                              Average: ${parseFloat(item.averageAmount).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono font-semibold text-yellow-700">
                              ${parseFloat(item.currentAmount).toLocaleString()}
                            </p>
                            <p className="text-xs text-yellow-600">
                              +{item.percentDiff.toFixed(0)}% above average
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recurring Expenses */}
              {spendingInsights.recurringExpenses.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-chart-1" />
                      <CardTitle>Recurring Expenses</CardTitle>
                    </div>
                    <CardDescription>Scheduled automatic expenses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {spendingInsights.recurringExpenses.map((item, index) => (
                        <div key={index} className="flex items-center justify-between" data-testid={`recurring-expense-${index}`}>
                          <div>
                            <p className="text-sm font-medium">{item.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.frequency} • Next: {new Date(item.nextDate).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm font-mono font-medium">
                            ${parseFloat(item.amount).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Savings Opportunities */}
        <TabsContent value="savings" className="space-y-6">
          {spendingInsights && spendingInsights.savingsOpportunities.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {spendingInsights.savingsOpportunities.map((opportunity, index) => (
                <Card key={index} data-testid={`savings-opportunity-${index}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-chart-2" />
                        <CardTitle>{opportunity.category}</CardTitle>
                      </div>
                      <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20">
                        Potential Savings: ${parseFloat(opportunity.potentialSavings).toLocaleString()}/mo
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{opportunity.recommendation}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No savings opportunities identified
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your spending patterns are currently optimal
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
