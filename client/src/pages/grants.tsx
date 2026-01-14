import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Gift, ArrowLeft, Edit, Trash2, TrendingUp, AlertTriangle, Calendar, DollarSign, PieChart, BarChart3 } from "lucide-react";
import { format, differenceInDays, isAfter, isBefore, addDays } from "date-fns";
import { safeFormatDate } from "@/lib/utils";
import { Link } from "wouter";
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Organization, Grant, InsertGrant } from "@shared/schema";

interface GrantsProps {
  currentOrganization: Organization;
}

interface GrantWithSpent extends Grant {
  totalSpent: string;
}

export default function Grants({ currentOrganization }: GrantsProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  const [deleteGrantId, setDeleteGrantId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    organizationId: currentOrganization.id,
    name: '',
    amount: '',
    fundType: 'unrestricted' as 'restricted' | 'unrestricted',
    restrictions: '',
    status: 'active' as 'active' | 'completed' | 'pending',
    startDate: null as string | null,
    endDate: null as string | null,
  });

  const { data: grants, isLoading, error } = useQuery<GrantWithSpent[]>({
    queryKey: [`/api/grants/${currentOrganization.id}`],
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

  const createMutation = useMutation({
    mutationFn: async (data: InsertGrant) => {
      return await apiRequest('POST', '/api/grants', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${currentOrganization.id}`] });
      toast({
        title: "Grant created",
        description: "Your grant has been added successfully.",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create grant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest('PATCH', `/api/grants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${currentOrganization.id}`] });
      toast({
        title: "Grant updated",
        description: "Your grant has been updated successfully.",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update grant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/grants/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${currentOrganization.id}`] });
      toast({
        title: "Grant deleted",
        description: "The grant has been deleted successfully.",
      });
      setDeleteGrantId(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete grant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingGrant(null);
    setFormData({
      organizationId: currentOrganization.id,
      name: '',
      amount: '',
      fundType: 'unrestricted' as 'restricted' | 'unrestricted',
      restrictions: '',
      status: 'active' as 'active' | 'completed' | 'pending',
      startDate: null as string | null,
      endDate: null as string | null,
    });
  };

  const handleEditGrant = (grant: Grant) => {
    setEditingGrant(grant);
    setFormData({
      organizationId: grant.organizationId,
      name: grant.name,
      amount: grant.amount,
      fundType: grant.fundType || 'unrestricted',
      restrictions: grant.restrictions || '',
      status: grant.status,
      startDate: grant.startDate ? (typeof grant.startDate === 'string' ? grant.startDate : grant.startDate.toISOString().split('T')[0]) : null,
      endDate: grant.endDate ? (typeof grant.endDate === 'string' ? grant.endDate : grant.endDate.toISOString().split('T')[0]) : null,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteGrant = (id: number) => {
    setDeleteGrantId(id);
  };

  const confirmDelete = () => {
    if (deleteGrantId) {
      deleteMutation.mutate(deleteGrantId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (editingGrant) {
      updateMutation.mutate({ id: editingGrant.id, data: formData });
    } else {
      createMutation.mutate(formData as any);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'default';
    }
  };

  // Calculate dashboard metrics
  const dashboardMetrics = grants ? {
    totalGrants: grants.length,
    activeGrants: grants.filter(g => g.status === 'active').length,
    pendingGrants: grants.filter(g => g.status === 'pending').length,
    completedGrants: grants.filter(g => g.status === 'completed').length,
    totalFunding: grants.reduce((sum, g) => sum + parseFloat(g.amount), 0),
    totalSpent: grants.reduce((sum, g) => sum + parseFloat(g.totalSpent), 0),
    restrictedFunds: grants.filter(g => g.fundType === 'restricted').reduce((sum, g) => sum + parseFloat(g.amount), 0),
    unrestrictedFunds: grants.filter(g => g.fundType === 'unrestricted').reduce((sum, g) => sum + parseFloat(g.amount), 0),
  } : null;

  // Status distribution for pie chart
  const statusData = dashboardMetrics ? [
    { name: 'Active', value: dashboardMetrics.activeGrants, color: 'hsl(var(--chart-2))' },
    { name: 'Pending', value: dashboardMetrics.pendingGrants, color: 'hsl(var(--chart-4))' },
    { name: 'Completed', value: dashboardMetrics.completedGrants, color: 'hsl(var(--chart-1))' },
  ].filter(d => d.value > 0) : [];

  // Fund type distribution
  const fundTypeData = dashboardMetrics ? [
    { name: 'Restricted', value: dashboardMetrics.restrictedFunds, color: 'hsl(var(--chart-3))' },
    { name: 'Unrestricted', value: dashboardMetrics.unrestrictedFunds, color: 'hsl(var(--chart-5))' },
  ].filter(d => d.value > 0) : [];

  // Spending by grant for bar chart
  const spendingData = grants ? grants.slice(0, 6).map(g => ({
    name: g.name.length > 15 ? g.name.slice(0, 15) + '...' : g.name,
    budget: parseFloat(g.amount),
    spent: parseFloat(g.totalSpent),
    remaining: parseFloat(g.amount) - parseFloat(g.totalSpent),
  })) : [];

  // Upcoming deadlines (grants ending within 90 days)
  const today = new Date();
  const upcomingDeadlines = grants ? grants
    .filter(g => g.endDate && g.status === 'active')
    .map(g => ({
      ...g,
      daysUntilEnd: differenceInDays(new Date(g.endDate!), today),
    }))
    .filter(g => g.daysUntilEnd > 0 && g.daysUntilEnd <= 90)
    .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd)
    .slice(0, 5) : [];

  // Compliance alerts (grants over 90% spent or nearing deadline)
  const complianceAlerts = grants ? grants
    .filter(g => g.status === 'active')
    .map(g => {
      const percentSpent = (parseFloat(g.totalSpent) / parseFloat(g.amount)) * 100;
      const daysUntilEnd = g.endDate ? differenceInDays(new Date(g.endDate), today) : null;
      const alerts: string[] = [];
      
      if (percentSpent >= 90) {
        alerts.push(`${percentSpent.toFixed(0)}% of budget spent`);
      }
      if (daysUntilEnd !== null && daysUntilEnd <= 30 && daysUntilEnd > 0) {
        alerts.push(`Ends in ${daysUntilEnd} days`);
      }
      if (daysUntilEnd !== null && daysUntilEnd <= 0) {
        alerts.push('Grant period ended');
      }
      
      return { grant: g, alerts, percentSpent, daysUntilEnd };
    })
    .filter(a => a.alerts.length > 0)
    .slice(0, 5) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Grant Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentOrganization.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) handleCloseDialog();
          else setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-grant">
              <Plus className="h-4 w-4 mr-2" />
              Add Grant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingGrant ? 'Edit Grant' : 'Create Grant'}</DialogTitle>
              <DialogDescription>
                {editingGrant 
                  ? `Update grant details for ${currentOrganization.name}.`
                  : `Record a new grant for ${currentOrganization.name}.`
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Grant Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Community Development Grant"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-grant-name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Total Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  data-testid="input-grant-amount"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'completed' | 'pending') => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="status" data-testid="select-grant-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fundType">Fund Type</Label>
                  <Select
                    value={formData.fundType}
                    onValueChange={(value: 'restricted' | 'unrestricted') => setFormData({ ...formData, fundType: value })}
                  >
                    <SelectTrigger id="fundType" data-testid="select-grant-fund-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unrestricted">Unrestricted</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value || null })}
                    data-testid="input-grant-start-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value || null })}
                    data-testid="input-grant-end-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="restrictions">Restrictions (Optional)</Label>
                <Textarea
                  id="restrictions"
                  placeholder="Any specific requirements or restrictions for this grant..."
                  value={formData.restrictions || ''}
                  onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
                  data-testid="input-grant-restrictions"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel-grant"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-grant"
                >
                  {editingGrant 
                    ? (updateMutation.isPending ? "Updating..." : "Update")
                    : (createMutation.isPending ? "Creating..." : "Create")
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Portfolio Dashboard */}
      {grants && grants.length > 0 && dashboardMetrics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Grants</p>
                    <p className="text-2xl font-bold" data-testid="metric-total-grants">
                      {dashboardMetrics.totalGrants}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <Gift className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {dashboardMetrics.activeGrants} active, {dashboardMetrics.pendingGrants} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Funding</p>
                    <p className="text-2xl font-bold" data-testid="metric-total-funding">
                      ${dashboardMetrics.totalFunding.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-chart-2" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Across all grants
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold" data-testid="metric-total-spent">
                      ${dashboardMetrics.totalSpent.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-chart-3" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {((dashboardMetrics.totalSpent / dashboardMetrics.totalFunding) * 100).toFixed(1)}% of total budget
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Remaining</p>
                    <p className="text-2xl font-bold text-chart-2" data-testid="metric-remaining">
                      ${(dashboardMetrics.totalFunding - dashboardMetrics.totalSpent).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-md bg-chart-5/10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-chart-5" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Available to spend
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Grant Status
                </CardTitle>
                <CardDescription>Distribution by status</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <RechartsPieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [value, 'Grants']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spending by Grant */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Budget vs Spending
                </CardTitle>
                <CardDescription>Top grants by budget</CardDescription>
              </CardHeader>
              <CardContent>
                {spendingData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={spendingData} layout="vertical">
                      <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="spent" fill="hsl(var(--chart-3))" name="Spent" stackId="a" />
                      <Bar dataKey="remaining" fill="hsl(var(--chart-2))" name="Remaining" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Alerts and Deadlines Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming Deadlines
                </CardTitle>
                <CardDescription>Grants ending within 90 days</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingDeadlines.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingDeadlines.map((grant) => (
                      <div key={grant.id} className="flex items-center justify-between p-2 rounded-md border" data-testid={`deadline-${grant.id}`}>
                        <div>
                          <p className="font-medium text-sm">{grant.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Ends {safeFormatDate(grant.endDate, 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <Badge variant={grant.daysUntilEnd <= 30 ? 'destructive' : 'secondary'}>
                          {grant.daysUntilEnd} days
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No upcoming deadlines</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Compliance Alerts
                </CardTitle>
                <CardDescription>Grants requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {complianceAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {complianceAlerts.map(({ grant, alerts, percentSpent }) => (
                      <div key={grant.id} className="p-2 rounded-md border border-destructive/30 bg-destructive/5" data-testid={`alert-${grant.id}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{grant.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {alerts.map((alert, idx) => (
                                <Badge key={idx} variant="destructive" className="text-xs">
                                  {alert}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Progress value={Math.min(percentSpent, 100)} className="w-16 h-2 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No compliance alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Grants Grid */}
      {!grants || grants.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="h-12 w-12 rounded-md bg-muted mx-auto mb-4 flex items-center justify-center">
                <Gift className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No grants yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click 'Add Grant' to start tracking grants
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {grants.map((grant) => {
            const totalAmount = parseFloat(grant.amount);
            const totalSpent = parseFloat(grant.totalSpent);
            const remaining = totalAmount - totalSpent;
            const percentSpent = (totalSpent / totalAmount) * 100;

            return (
              <Card key={grant.id} data-testid={`grant-card-${grant.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{grant.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={grant.fundType === 'restricted' ? 'secondary' : 'outline'}>
                        {grant.fundType === 'restricted' ? 'Restricted' : 'Unrestricted'}
                      </Badge>
                      <Badge variant={getStatusVariant(grant.status)}>
                        {grant.status}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditGrant(grant)}
                        data-testid={`button-edit-${grant.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteGrant(grant.id)}
                        data-testid={`button-delete-${grant.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {grant.restrictions && (
                    <CardDescription className="mt-2">
                      {grant.restrictions}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-mono font-medium">
                        {percentSpent.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={percentSpent} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total</p>
                      <p className="text-base font-mono font-medium text-foreground">
                        ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Spent</p>
                      <p className="text-base font-mono font-medium text-chart-3">
                        ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                      <p className="text-base font-mono font-medium text-chart-2">
                        ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {(grant.startDate || grant.endDate) && (
                    <div className="pt-2 border-t border-border">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {grant.startDate && (
                          <span>
                            Start: {safeFormatDate(grant.startDate, 'MMM dd, yyyy')}
                          </span>
                        )}
                        {grant.endDate && (
                          <span>
                            End: {safeFormatDate(grant.endDate, 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteGrantId !== null} onOpenChange={(open) => !open && setDeleteGrantId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Grant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this grant? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
