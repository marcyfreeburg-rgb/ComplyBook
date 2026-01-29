import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  DollarSign,
  Target,
  Calendar,
  Download
} from "lucide-react";
import type { Organization } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface ProgramExpenseReportProps {
  currentOrganization: Organization;
  userId: string;
}

interface ProgramBudgetItem {
  programId: number;
  programName: string;
  budget: string;
  actual: string;
  variance: string;
  percentUsed: number;
  status: 'under_budget' | 'on_track' | 'over_budget';
}

export default function ProgramExpenseReport({ currentOrganization, userId }: ProgramExpenseReportProps) {
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { data: programBudgets = [], isLoading, error } = useQuery<ProgramBudgetItem[]>({
    queryKey: [`/api/programs/budget-vs-actual`, currentOrganization.id, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.set('startDate', dateFilter.startDate);
      if (dateFilter.endDate) params.set('endDate', dateFilter.endDate);
      const response = await fetch(`/api/programs/budget-vs-actual/${currentOrganization.id}?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch program budget data');
      }
      return response.json();
    },
  });

  const totalBudget = programBudgets.reduce((sum, p) => sum + parseFloat(p.budget), 0);
  const totalActual = programBudgets.reduce((sum, p) => sum + parseFloat(p.actual), 0);
  const totalVariance = totalBudget - totalActual;
  const overallPercentUsed = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  const overBudgetPrograms = programBudgets.filter(p => p.status === 'over_budget');
  const onTrackPrograms = programBudgets.filter(p => p.status === 'on_track');
  const underBudgetPrograms = programBudgets.filter(p => p.status === 'under_budget');

  const getStatusBadge = (status: string, percentUsed: number) => {
    switch (status) {
      case 'over_budget':
        return <Badge variant="destructive" data-testid="badge-status-over">Over Budget ({percentUsed.toFixed(1)}%)</Badge>;
      case 'on_track':
        return <Badge variant="default" className="bg-amber-500" data-testid="badge-status-ontrack">On Track ({percentUsed.toFixed(1)}%)</Badge>;
      case 'under_budget':
        return <Badge variant="secondary" className="bg-green-500 text-white" data-testid="badge-status-under">Under Budget ({percentUsed.toFixed(1)}%)</Badge>;
      default:
        return <Badge variant="outline">{percentUsed.toFixed(1)}%</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'over_budget':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'on_track':
        return <TrendingUp className="h-5 w-5 text-amber-500" />;
      case 'under_budget':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  const exportReport = () => {
    const csvContent = [
      ['Program', 'Budget', 'Actual', 'Variance', '% Used', 'Status'].join(','),
      ...programBudgets.map(p => [
        `"${p.programName}"`,
        p.budget,
        p.actual,
        p.variance,
        p.percentUsed.toFixed(1),
        p.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `program-expense-report-${dateFilter.startDate}-${dateFilter.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground" data-testid="text-error-message">
              {error instanceof Error ? error.message : 'Failed to load program budget report. Please try again.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Program Expense Report</h1>
          <p className="text-muted-foreground">Budget vs. actual analysis with variance tracking</p>
        </div>
        <Button onClick={exportReport} variant="outline" data-testid="button-export-report">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row gap-4 items-end flex-wrap">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                data-testid="input-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-budget">{formatCurrency(totalBudget, 'USD')}</div>
            <p className="text-xs text-muted-foreground">Across {programBudgets.length} programs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-spent">{formatCurrency(totalActual, 'USD')}</div>
            <Progress value={Math.min(overallPercentUsed, 100)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            {totalVariance >= 0 ? (
              <TrendingDown className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-green-600' : 'text-destructive'}`} data-testid="text-remaining">
              {formatCurrency(Math.abs(totalVariance), 'USD')}
              {totalVariance < 0 && ' over'}
            </div>
            <p className="text-xs text-muted-foreground">{overallPercentUsed.toFixed(1)}% of budget used</p>
          </CardContent>
        </Card>

        <Card className={overBudgetPrograms.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overBudgetPrograms.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-alerts-count">{overBudgetPrograms.length}</div>
            <p className="text-xs text-muted-foreground">
              {overBudgetPrograms.length === 0 ? 'All programs within budget' : 'Programs over budget'}
            </p>
          </CardContent>
        </Card>
      </div>

      {overBudgetPrograms.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Budget Variance Alerts
            </CardTitle>
            <CardDescription>The following programs have exceeded their budgets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overBudgetPrograms.map((program) => (
                <div key={program.programId} className="flex items-center justify-between p-3 bg-background rounded-lg border" data-testid={`alert-program-${program.programId}`}>
                  <div>
                    <p className="font-medium">{program.programName}</p>
                    <p className="text-sm text-muted-foreground">
                      Budget: {formatCurrency(parseFloat(program.budget), 'USD')} | 
                      Spent: {formatCurrency(parseFloat(program.actual), 'USD')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-destructive font-bold">
                      -{formatCurrency(Math.abs(parseFloat(program.variance)), 'USD')}
                    </p>
                    <p className="text-sm text-muted-foreground">{program.percentUsed.toFixed(1)}% used</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All Programs ({programBudgets.length})</TabsTrigger>
          <TabsTrigger value="over" data-testid="tab-over">Over Budget ({overBudgetPrograms.length})</TabsTrigger>
          <TabsTrigger value="ontrack" data-testid="tab-ontrack">On Track ({onTrackPrograms.length})</TabsTrigger>
          <TabsTrigger value="under" data-testid="tab-under">Under Budget ({underBudgetPrograms.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ProgramTable programs={programBudgets} getStatusBadge={getStatusBadge} getStatusIcon={getStatusIcon} />
        </TabsContent>
        <TabsContent value="over">
          <ProgramTable programs={overBudgetPrograms} getStatusBadge={getStatusBadge} getStatusIcon={getStatusIcon} />
        </TabsContent>
        <TabsContent value="ontrack">
          <ProgramTable programs={onTrackPrograms} getStatusBadge={getStatusBadge} getStatusIcon={getStatusIcon} />
        </TabsContent>
        <TabsContent value="under">
          <ProgramTable programs={underBudgetPrograms} getStatusBadge={getStatusBadge} getStatusIcon={getStatusIcon} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProgramTable({ 
  programs, 
  getStatusBadge, 
  getStatusIcon 
}: { 
  programs: ProgramBudgetItem[];
  getStatusBadge: (status: string, percentUsed: number) => React.ReactNode;
  getStatusIcon: (status: string) => React.ReactNode;
}) {
  if (programs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No programs found for this filter
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Program</th>
                <th className="text-right p-4 font-medium">Budget</th>
                <th className="text-right p-4 font-medium">Actual</th>
                <th className="text-right p-4 font-medium">Variance</th>
                <th className="text-center p-4 font-medium">Progress</th>
                <th className="text-center p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((program) => (
                <tr key={program.programId} className="border-b hover-elevate" data-testid={`row-program-${program.programId}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(program.status)}
                      <span className="font-medium">{program.programName}</span>
                    </div>
                  </td>
                  <td className="text-right p-4 font-mono">{formatCurrency(parseFloat(program.budget), 'USD')}</td>
                  <td className="text-right p-4 font-mono">{formatCurrency(parseFloat(program.actual), 'USD')}</td>
                  <td className={`text-right p-4 font-mono ${parseFloat(program.variance) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {parseFloat(program.variance) >= 0 ? '+' : ''}{formatCurrency(parseFloat(program.variance), 'USD')}
                  </td>
                  <td className="p-4">
                    <div className="w-24 mx-auto">
                      <Progress 
                        value={Math.min(program.percentUsed, 100)} 
                        className={program.status === 'over_budget' ? '[&>div]:bg-destructive' : ''}
                      />
                    </div>
                  </td>
                  <td className="text-center p-4">
                    {getStatusBadge(program.status, program.percentUsed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
