import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Lock, 
  Unlock, 
  User, 
  Activity,
  TrendingUp,
  TrendingDown,
  Package,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface SecurityEvent {
  id: number;
  eventType: string;
  severity: string;
  userId: string | null;
  email: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  eventData: any;
  timestamp: Date;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  warningEvents: number;
  loginFailures: number;
  unauthorizedAccess: number;
  permissionDenials: number;
  accountLockouts: number;
  recentEvents: SecurityEvent[];
  eventsByType: Array<{ eventType: string; count: number }>;
  eventsByHour: Array<{ hour: string; count: number }>;
  auditChainStatus: {
    isValid: boolean;
    message: string;
    tamperedIndices: number[];
    brokenChainIndices: number[];
    nullHashIndices: number[];
  };
}

interface VulnerabilityScanSummary {
  lastScan: Date | null;
  status: string;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  infoCount: number;
}

export default function SecurityMonitoring({ organizationId }: { organizationId: number }) {
  const { toast } = useToast();
  
  const { data: metrics, isLoading } = useQuery<SecurityMetrics>({
    queryKey: [`/api/security/metrics/${organizationId}`],
  });

  const { data: vulnSummary, isLoading: vulnLoading } = useQuery<VulnerabilityScanSummary>({
    queryKey: ['/api/security/vulnerability-scan/summary'],
  });

  const runScanMutation = useMutation({
    mutationFn: () => apiRequest('/api/security/vulnerability-scan', 'POST', {}),
    onSuccess: () => {
      toast({
        title: "Scan Started",
        description: "Vulnerability scan is now running. Results will be available shortly.",
      });
      // Refetch after a delay to get updated results
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/security/vulnerability-scan/summary'] });
      }, 5000);
    },
    onError: () => {
      toast({
        title: "Scan Failed",
        description: "Failed to start vulnerability scan. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load security metrics</AlertDescription>
        </Alert>
      </div>
    );
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'secondary';
    }
  };

  const eventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'login_failure': return <XCircle className="h-4 w-4" />;
      case 'login_success': return <CheckCircle className="h-4 w-4" />;
      case 'account_locked': return <Lock className="h-4 w-4" />;
      case 'account_unlocked': return <Unlock className="h-4 w-4" />;
      case 'unauthorized_access': return <AlertTriangle className="h-4 w-4" />;
      case 'permission_denied': return <Shield className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Monitoring</h1>
        <p className="text-muted-foreground">
          Real-time security event tracking and threat detection
        </p>
      </div>

      {!metrics.auditChainStatus.isValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Audit Log Integrity Compromised</AlertTitle>
          <AlertDescription>
            {metrics.auditChainStatus.message}
            {metrics.auditChainStatus.tamperedIndices.length > 0 && (
              <div className="mt-2">Tampered entries detected at indices: {metrics.auditChainStatus.tamperedIndices.join(', ')}</div>
            )}
            {metrics.auditChainStatus.brokenChainIndices.length > 0 && (
              <div className="mt-2">Broken chain links at indices: {metrics.auditChainStatus.brokenChainIndices.join(', ')}</div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {metrics.auditChainStatus.isValid && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Audit Log Chain Verified</AlertTitle>
          <AlertDescription>{metrics.auditChainStatus.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.criticalEvents > 0 ? (
                <span className="flex items-center gap-1 text-destructive">
                  <TrendingUp className="h-3 w-3" />
                  Requires attention
                </span>
              ) : (
                <span className="flex items-center gap-1 text-green-600">
                  <TrendingDown className="h-3 w-3" />
                  No critical issues
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.loginFailures}</div>
            <p className="text-xs text-muted-foreground">Potential brute force</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unauthorized Access</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.unauthorizedAccess}</div>
            <p className="text-xs text-muted-foreground">Permission violations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vulnerabilities</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {vulnLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : vulnSummary ? (
              <>
                <div className="text-2xl font-bold">
                  {vulnSummary.totalVulnerabilities}
                </div>
                <p className="text-xs text-muted-foreground">
                  {vulnSummary.criticalCount > 0 || vulnSummary.highCount > 0 ? (
                    <span className="flex items-center gap-1 text-destructive">
                      <TrendingUp className="h-3 w-3" />
                      {vulnSummary.criticalCount}C / {vulnSummary.highCount}H
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Dependencies secure
                    </span>
                  )}
                </p>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">No scans yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events" data-testid="tab-events">Recent Events</TabsTrigger>
          <TabsTrigger value="charts" data-testid="tab-charts">Analytics</TabsTrigger>
          <TabsTrigger value="vulnerabilities" data-testid="tab-vulnerabilities">Vulnerabilities</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Last 50 security events across all users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.recentEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No security events recorded</p>
                ) : (
                  metrics.recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                      data-testid={`event-${event.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div>{eventTypeIcon(event.eventType)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{event.eventType.replace(/_/g, ' ').toUpperCase()}</span>
                            <Badge variant={severityColor(event.severity) as any}>
                              {event.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {event.email || 'Unknown user'} from {event.ipAddress || 'Unknown IP'}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Events by Type</CardTitle>
                <CardDescription>Distribution of security events</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.eventsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ eventType, count }) => `${eventType}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics.eventsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Events by Hour</CardTitle>
                <CardDescription>Security event frequency over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.eventsByHour}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vulnerabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dependency Vulnerability Scan</CardTitle>
                  <CardDescription>
                    Automated npm audit scanning for security vulnerabilities
                  </CardDescription>
                </div>
                <Button
                  onClick={() => runScanMutation.mutate()}
                  disabled={runScanMutation.isPending}
                  data-testid="button-run-scan"
                >
                  {runScanMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Run Scan
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {vulnLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : !vulnSummary || !vulnSummary.lastScan ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No Scans Available</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Run your first vulnerability scan to check for security issues in dependencies
                  </p>
                  <Button
                    onClick={() => runScanMutation.mutate()}
                    disabled={runScanMutation.isPending}
                  >
                    Run First Scan
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-2">Last Scan</div>
                      <div className="text-lg">
                        {format(new Date(vulnSummary.lastScan), 'MMM d, yyyy h:mm a')}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Status: <Badge variant={
                          vulnSummary.status === 'completed' ? 'secondary' :
                          vulnSummary.status === 'running' ? 'default' : 'destructive'
                        } data-testid="badge-scan-status">
                          {vulnSummary.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Total Vulnerabilities</div>
                      <div className="text-3xl font-bold">
                        {vulnSummary.totalVulnerabilities}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-3">Vulnerability Breakdown</div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="p-3 rounded-lg border">
                        <div className="text-xs text-muted-foreground mb-1">Critical</div>
                        <div className="text-2xl font-bold text-destructive">
                          {vulnSummary.criticalCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <div className="text-xs text-muted-foreground mb-1">High</div>
                        <div className="text-2xl font-bold text-orange-600">
                          {vulnSummary.highCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <div className="text-xs text-muted-foreground mb-1">Moderate</div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {vulnSummary.moderateCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <div className="text-xs text-muted-foreground mb-1">Low</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {vulnSummary.lowCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <div className="text-xs text-muted-foreground mb-1">Info</div>
                        <div className="text-2xl font-bold text-gray-600">
                          {vulnSummary.infoCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  {(vulnSummary.criticalCount > 0 || vulnSummary.highCount > 0) && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Action Required</AlertTitle>
                      <AlertDescription>
                        Your dependencies have {vulnSummary.criticalCount} critical and {vulnSummary.highCount} high severity vulnerabilities. 
                        Run <code className="bg-destructive/10 px-1 rounded">npm audit fix</code> to automatically fix compatible issues, 
                        or review each vulnerability with <code className="bg-destructive/10 px-1 rounded">npm audit</code>.
                      </AlertDescription>
                    </Alert>
                  )}

                  {vulnSummary.totalVulnerabilities === 0 && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>All Clear</AlertTitle>
                      <AlertDescription>
                        No known vulnerabilities detected in your dependencies. Keep your packages up to date for continued security.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
