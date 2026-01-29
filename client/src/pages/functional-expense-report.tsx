import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, BarChart3, PieChart, TrendingUp, AlertCircle } from "lucide-react";
import type { Organization } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface FunctionalExpenseReportProps {
  currentOrganization: Organization;
  userId: string;
}

interface FunctionalExpenseData {
  programExpenses: string;
  administrativeExpenses: string;
  fundraisingExpenses: string;
  totalExpenses: string;
  programPercentage: number;
  administrativePercentage: number;
  fundraisingPercentage: number;
  expensesByProgram: Array<{
    programId: number;
    programName: string;
    amount: string;
  }>;
  expensesByCategory: Array<{
    functionalCategory: string;
    categoryName: string;
    amount: string;
  }>;
}

export default function FunctionalExpenseReport({ currentOrganization, userId }: FunctionalExpenseReportProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(currentYear, 0, 1).toISOString().split('T')[0],
    endDate: new Date(currentYear, 11, 31).toISOString().split('T')[0],
  });

  const { data: reportData, isLoading, error } = useQuery<FunctionalExpenseData>({
    queryKey: [`/api/reports/functional-expenses`, dateRange],
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });

  const handleExportCSV = () => {
    if (!reportData) return;

    const csvRows = [
      ["Functional Expense Report"],
      [`Organization: ${currentOrganization.name}`],
      [`Period: ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`],
      [],
      ["Summary by Function"],
      ["Function", "Amount", "Percentage"],
      ["Program Services", reportData.programExpenses, `${reportData.programPercentage.toFixed(2)}%`],
      ["Management & General", reportData.administrativeExpenses, `${reportData.administrativePercentage.toFixed(2)}%`],
      ["Fundraising", reportData.fundraisingExpenses, `${reportData.fundraisingPercentage.toFixed(2)}%`],
      ["Total", reportData.totalExpenses, "100.00%"],
      [],
      ["Expenses by Program"],
      ["Program", "Amount"],
      ...reportData.expensesByProgram.map(p => [p.programName, p.amount]),
      [],
      ["Expenses by Category"],
      ["Function", "Category", "Amount"],
      ...reportData.expensesByCategory.map(c => [c.functionalCategory, c.categoryName, c.amount]),
    ];

    const csvContent = csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `functional-expense-report-${dateRange.startDate}-${dateRange.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report exported",
      description: "The functional expense report has been downloaded as CSV.",
    });
  };

  const calculateColor = (percentage: number, type: string) => {
    if (type === 'program') {
      // Program expenses should be high (good if > 70%)
      return percentage >= 70 ? "text-green-600" : percentage >= 50 ? "text-yellow-600" : "text-red-600";
    } else if (type === 'administrative') {
      // Administrative expenses should be moderate (good if < 20%)
      return percentage <= 20 ? "text-green-600" : percentage <= 30 ? "text-yellow-600" : "text-red-600";
    } else {
      // Fundraising expenses should be low (good if < 15%)
      return percentage <= 15 ? "text-green-600" : percentage <= 25 ? "text-yellow-600" : "text-red-600";
    }
  };

  const getFeedback = (programPercentage: number, adminPercentage: number, fundraisingPercentage: number) => {
    if (programPercentage >= 70 && adminPercentage <= 20 && fundraisingPercentage <= 15) {
      return {
        message: "Excellent! Your functional expense allocation meets best practices for nonprofit organizations.",
        variant: "success" as const,
      };
    } else if (programPercentage >= 60) {
      return {
        message: "Good allocation. Consider optimizing administrative and fundraising costs for better efficiency.",
        variant: "warning" as const,
      };
    } else {
      return {
        message: "Your program expenses are below recommended levels. Donors prefer seeing more resources directed to programs.",
        variant: "destructive" as const,
      };
    }
  };

  const feedback = reportData ? getFeedback(
    reportData.programPercentage,
    reportData.administrativePercentage,
    reportData.fundraisingPercentage
  ) : null;

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-functional-expense-report">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-functional-expense-report">
            Functional Expense Report
          </h1>
          <p className="text-muted-foreground">
            Analyze expenses by program, administrative, and fundraising functions
          </p>
        </div>
        {reportData && (
          <Button onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Report Period</CardTitle>
          <CardDescription>Select the date range for the functional expense analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                data-testid="input-start-date"
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                data-testid="input-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Generating functional expense report...</p>
              <p className="text-xs text-muted-foreground mt-2">Analyzing expense categories and allocations</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Report</h3>
              <p className="text-muted-foreground mb-4">
                Failed to load the functional expense report. This may occur if there are no transactions in the selected date range.
              </p>
              <div className="bg-muted rounded-md p-3 mb-4 max-w-md mx-auto text-left">
                <p className="text-xs font-mono text-muted-foreground">
                  Error: {(error as Error)?.message || "Unknown error"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Date range: {dateRange.startDate} to {dateRange.endDate}
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                data-testid="button-retry-report"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !reportData ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Expense Data</h3>
              <p className="text-muted-foreground">
                No expenses found for the selected date range. Try adjusting the date filters.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : reportData ? (
        <>
          {/* Feedback Banner */}
          {feedback && (
            <Card className={`border-l-4 ${
              feedback.variant === 'success' ? 'border-l-green-500' :
              feedback.variant === 'warning' ? 'border-l-yellow-500' :
              'border-l-red-500'
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${
                    feedback.variant === 'success' ? 'text-green-600' :
                    feedback.variant === 'warning' ? 'text-yellow-600' :
                    'text-red-600'
                  }`} />
                  <div>
                    <p className="font-medium">{feedback.message}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recommended: 70%+ Program, 20% or less Administrative, 15% or less Fundraising
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-expenses">
                  {formatCurrency(parseFloat(reportData.totalExpenses))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Program Services</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-program-expenses">
                  {formatCurrency(parseFloat(reportData.programExpenses))}
                </div>
                <p className={`text-xs font-semibold mt-1 ${calculateColor(reportData.programPercentage, 'program')}`}>
                  {reportData.programPercentage.toFixed(2)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Management & General</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-admin-expenses">
                  {formatCurrency(parseFloat(reportData.administrativeExpenses))}
                </div>
                <p className={`text-xs font-semibold mt-1 ${calculateColor(reportData.administrativePercentage, 'administrative')}`}>
                  {reportData.administrativePercentage.toFixed(2)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fundraising</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-fundraising-expenses">
                  {formatCurrency(parseFloat(reportData.fundraisingExpenses))}
                </div>
                <p className={`text-xs font-semibold mt-1 ${calculateColor(reportData.fundraisingPercentage, 'fundraising')}`}>
                  {reportData.fundraisingPercentage.toFixed(2)}% of total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Visual Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Distribution</CardTitle>
              <CardDescription>Proportional breakdown by functional category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Program Services</span>
                    <span className={calculateColor(reportData.programPercentage, 'program')}>
                      {reportData.programPercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                    <div 
                      className="bg-green-600 h-3 rounded-full" 
                      style={{ width: `${reportData.programPercentage}%` }}
                      data-testid="bar-program-percentage"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Management & General</span>
                    <span className={calculateColor(reportData.administrativePercentage, 'administrative')}>
                      {reportData.administrativePercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                    <div 
                      className="bg-blue-600 h-3 rounded-full" 
                      style={{ width: `${reportData.administrativePercentage}%` }}
                      data-testid="bar-admin-percentage"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Fundraising</span>
                    <span className={calculateColor(reportData.fundraisingPercentage, 'fundraising')}>
                      {reportData.fundraisingPercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                    <div 
                      className="bg-purple-600 h-3 rounded-full" 
                      style={{ width: `${reportData.fundraisingPercentage}%` }}
                      data-testid="bar-fundraising-percentage"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses by Program */}
          {reportData.expensesByProgram.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Program</CardTitle>
                <CardDescription>Breakdown of program service expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.expensesByProgram.map((program, index) => (
                    <div key={index} className="flex justify-between items-center" data-testid={`program-expense-${index}`}>
                      <span className="font-medium" data-testid={`program-name-${index}`}>
                        {program.programName}
                      </span>
                      <span className="font-bold" data-testid={`program-amount-${index}`}>
                        {formatCurrency(parseFloat(program.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expenses by Category */}
          {reportData.expensesByCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>Detailed breakdown by expense category and function</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Function</th>
                        <th className="text-left p-2">Category</th>
                        <th className="text-right p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.expensesByCategory.map((item, index) => (
                        <tr key={index} className="border-b" data-testid={`category-expense-${index}`}>
                          <td className="p-2 capitalize" data-testid={`category-function-${index}`}>
                            {item.functionalCategory}
                          </td>
                          <td className="p-2" data-testid={`category-name-${index}`}>
                            {item.categoryName}
                          </td>
                          <td className="p-2 text-right font-medium" data-testid={`category-amount-${index}`}>
                            {formatCurrency(parseFloat(item.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
