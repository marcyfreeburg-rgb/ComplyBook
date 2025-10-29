import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Target, 
  TrendingUp,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { format, differenceInDays, isBefore, parseISO } from "date-fns";
import type { Organization, Grant } from "@shared/schema";
import { useLocation } from "wouter";

interface ComplianceDashboardProps {
  currentOrganization: Organization;
}

interface ComplianceMetrics {
  totalGrants: number;
  activeGrants: number;
  upcomingDeadlines: number;
  overdueItems: number;
  completedReports: number;
  pendingReports: number;
}

interface GrantCompliance {
  grant: Grant;
  timeEffortReports: { total: number; pending: number; certified: number };
  costAllowabilityChecks: { total: number; pending: number; approved: number };
  federalReports: { total: number; pending: number; submitted: number };
  auditPrepItems: { total: number; pending: number; completed: number };
  nextDeadline: Date | null;
  complianceScore: number;
}

export default function ComplianceDashboard({ currentOrganization }: ComplianceDashboardProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: grants = [], isLoading: grantsLoading, error } = useQuery<Grant[]>({
    queryKey: [`/api/grants/${currentOrganization.id}`],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<ComplianceMetrics>({
    queryKey: [`/api/compliance/${currentOrganization.id}/metrics`],
  });

  const { data: grantCompliance = [], isLoading: complianceLoading } = useQuery<GrantCompliance[]>({
    queryKey: [`/api/compliance/${currentOrganization.id}/grants`],
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Session expired",
        description: "Please log in again",
        variant: "destructive",
      });
      setLocation("/login");
    }
  }, [error, toast, setLocation]);

  const getComplianceColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getComplianceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Needs Attention</Badge>;
  };

  const getDaysUntil = (date: Date | null) => {
    if (!date) return null;
    return differenceInDays(date, new Date());
  };

  if (grantsLoading || metricsLoading || complianceLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="compliance-dashboard">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor grant compliance, deadlines, and audit readiness
        </p>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Grants</p>
                <p className="text-2xl font-bold" data-testid="metric-active-grants">
                  {metrics?.activeGrants || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-md">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Deadlines</p>
                <p className="text-2xl font-bold" data-testid="metric-upcoming-deadlines">
                  {metrics?.upcomingDeadlines || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-md">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Items</p>
                <p className="text-2xl font-bold" data-testid="metric-overdue-items">
                  {metrics?.overdueItems || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-md">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Reports</p>
                <p className="text-2xl font-bold" data-testid="metric-completed-reports">
                  {metrics?.completedReports || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grant Compliance Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Grant Compliance Status</CardTitle>
              <CardDescription>Overview of compliance for all active grants</CardDescription>
            </div>
            <Button onClick={() => setLocation("/government-grants")} data-testid="button-manage-grants">
              Manage Grants
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {grantCompliance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No active grants to monitor</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setLocation("/government-grants")}
                data-testid="button-add-first-grant"
              >
                Add Your First Grant
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {grantCompliance.map((gc) => (
                <Card key={gc.grant.id} className="hover-elevate active-elevate-2">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Grant Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold" data-testid={`grant-name-${gc.grant.id}`}>
                              {gc.grant.name}
                            </h3>
                            {getComplianceBadge(gc.complianceScore)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Grantor: {gc.grant.grantorContact || 'N/A'}</span>
                            <span>Award: ${parseFloat(gc.grant.amount).toLocaleString()}</span>
                            {gc.nextDeadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Next deadline: {format(gc.nextDeadline, 'MMM dd, yyyy')} 
                                ({getDaysUntil(gc.nextDeadline)} days)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getComplianceColor(gc.complianceScore)}`}>
                            {gc.complianceScore}%
                          </div>
                          <div className="text-xs text-muted-foreground">Compliance Score</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <Progress value={gc.complianceScore} className="h-2" />

                      {/* Compliance Items Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Time/Effort Reports */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Time/Effort Reports</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              {gc.timeEffortReports.certified}/{gc.timeEffortReports.total} certified
                            </div>
                            {gc.timeEffortReports.pending > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {gc.timeEffortReports.pending} pending
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Cost Allowability */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Cost Checks</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              {gc.costAllowabilityChecks.approved}/{gc.costAllowabilityChecks.total} approved
                            </div>
                            {gc.costAllowabilityChecks.pending > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {gc.costAllowabilityChecks.pending} pending
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Federal Reports */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Federal Reports</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              {gc.federalReports.submitted}/{gc.federalReports.total} submitted
                            </div>
                            {gc.federalReports.pending > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {gc.federalReports.pending} pending
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Audit Prep */}
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Audit Prep</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              {gc.auditPrepItems.completed}/{gc.auditPrepItems.total} completed
                            </div>
                            {gc.auditPrepItems.pending > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {gc.auditPrepItems.pending} pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common compliance tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => setLocation("/government-grants")}
              data-testid="button-submit-time-effort"
            >
              <Clock className="h-8 w-8" />
              <span className="font-medium">Submit Time/Effort Report</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => setLocation("/government-grants")}
              data-testid="button-review-costs"
            >
              <Target className="h-8 w-8" />
              <span className="font-medium">Review Cost Allowability</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => setLocation("/government-grants")}
              data-testid="button-file-federal-report"
            >
              <FileText className="h-8 w-8" />
              <span className="font-medium">File Federal Report</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-4"
              onClick={() => setLocation("/government-grants")}
              data-testid="button-audit-checklist"
            >
              <CheckCircle2 className="h-8 w-8" />
              <span className="font-medium">Audit Checklist</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
