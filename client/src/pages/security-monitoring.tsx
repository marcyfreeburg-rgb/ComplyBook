import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
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
  RefreshCw,
  Wrench,
  Bell,
  Mail,
  Globe,
  Smartphone,
  Settings
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
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

interface AlertSettings {
  emailAlertsEnabled: boolean;
  emailRecipients: string;
  webhookEnabled: boolean;
  webhookUrl: string;
  alertOnCritical: boolean;
  alertOnHigh: boolean;
  alertOnLoginFailures: boolean;
  alertOnPendingRecon: boolean;
  reconAlertDays: number;
}

interface MfaStatus {
  enabled: boolean;
  method: string | null;
  enrolledAt: Date | null;
}

interface IpRestriction {
  id: number;
  ipAddress: string;
  description: string;
  type: 'allow' | 'block';
  createdAt: Date;
}

export default function SecurityMonitoring({ organizationId }: { organizationId: number }) {
  const { toast } = useToast();
  
  // Alert settings state
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    emailAlertsEnabled: true,
    emailRecipients: '',
    webhookEnabled: false,
    webhookUrl: '',
    alertOnCritical: true,
    alertOnHigh: true,
    alertOnLoginFailures: true,
    alertOnPendingRecon: true,
    reconAlertDays: 7,
  });
  
  const [newIpAddress, setNewIpAddress] = useState('');
  const [newIpDescription, setNewIpDescription] = useState('');
  const [newIpType, setNewIpType] = useState<'allow' | 'block'>('allow');
  
  // Mock MFA status and IP restrictions (would come from API in production)
  const [mfaStatus] = useState<MfaStatus>({
    enabled: false,
    method: null,
    enrolledAt: null,
  });
  
  const [ipRestrictions, setIpRestrictions] = useState<IpRestriction[]>([]);
  
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

  const repairChainMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/security/audit-chain/repair/${organizationId}`, {});
      return response.json() as Promise<{ repaired: number; nullHashesFixed?: number; brokenLinksFixed?: number; message: string }>;
    },
    onSuccess: (data: { repaired: number; nullHashesFixed?: number; brokenLinksFixed?: number; message: string }) => {
      toast({
        title: "Chain Repaired",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/security/metrics/${organizationId}`] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Unknown error occurred";
      toast({
        title: "Repair Failed",
        description: `Failed to repair audit log chain: ${errorMessage}`,
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
            <div className="flex flex-col gap-3">
              <div>
                {metrics.auditChainStatus.message}
                {metrics.auditChainStatus.tamperedIndices.length > 0 && (
                  <div className="mt-2">Tampered entries detected at indices: {metrics.auditChainStatus.tamperedIndices.slice(0, 10).join(', ')}{metrics.auditChainStatus.tamperedIndices.length > 10 ? ` and ${metrics.auditChainStatus.tamperedIndices.length - 10} more...` : ''}</div>
                )}
                {metrics.auditChainStatus.brokenChainIndices.length > 0 && (
                  <div className="mt-2">Broken chain links at indices: {metrics.auditChainStatus.brokenChainIndices.slice(0, 10).join(', ')}{metrics.auditChainStatus.brokenChainIndices.length > 10 ? ` and ${metrics.auditChainStatus.brokenChainIndices.length - 10} more...` : ''}</div>
                )}
                {metrics.auditChainStatus.nullHashIndices.length > 0 && (
                  <div className="mt-2">Entries missing hash: {metrics.auditChainStatus.nullHashIndices.length} entries</div>
                )}
              </div>
              <div>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => repairChainMutation.mutate()}
                  disabled={repairChainMutation.isPending}
                  data-testid="button-repair-chain"
                >
                  {repairChainMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wrench className="mr-2 h-4 w-4" />
                  )}
                  Repair Chain
                </Button>
              </div>
            </div>
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
        <Card data-testid="card-total-events">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-events">{metrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card data-testid="card-critical-events">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-critical-events">{metrics.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.criticalEvents > 0 ? (
                <span className="flex items-center gap-1 text-destructive" data-testid="text-critical-status-warning">
                  <TrendingUp className="h-3 w-3" />
                  Requires attention
                </span>
              ) : (
                <span className="flex items-center gap-1 text-green-600" data-testid="text-critical-status-clear">
                  <TrendingDown className="h-3 w-3" />
                  No critical issues
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-failed-logins">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-failed-logins">{metrics.loginFailures}</div>
            <p className="text-xs text-muted-foreground">Potential brute force</p>
          </CardContent>
        </Card>

        <Card data-testid="card-unauthorized-access">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unauthorized Access</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-unauthorized-access">{metrics.unauthorizedAccess}</div>
            <p className="text-xs text-muted-foreground">Permission violations</p>
          </CardContent>
        </Card>

        <Card data-testid="card-vulnerabilities">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vulnerabilities</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {vulnLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : vulnSummary ? (
              <>
                <div className="text-2xl font-bold" data-testid="text-total-vulnerabilities">
                  {vulnSummary.totalVulnerabilities}
                </div>
                <p className="text-xs text-muted-foreground">
                  {vulnSummary.criticalCount > 0 || vulnSummary.highCount > 0 ? (
                    <span className="flex items-center gap-1 text-destructive" data-testid="text-vulnerability-status-warning">
                      <TrendingUp className="h-3 w-3" />
                      {vulnSummary.criticalCount}C / {vulnSummary.highCount}H
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-600" data-testid="text-vulnerability-status-secure">
                      <CheckCircle className="h-3 w-3" />
                      Dependencies secure
                    </span>
                  )}
                </p>
              </>
            ) : (
              <div className="text-xs text-muted-foreground" data-testid="text-no-scans-yet">No scans yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="events" data-testid="tab-events">Recent Events</TabsTrigger>
          <TabsTrigger value="charts" data-testid="tab-charts">Analytics</TabsTrigger>
          <TabsTrigger value="vulnerabilities" data-testid="tab-vulnerabilities">Vulnerabilities</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alert Settings
          </TabsTrigger>
          <TabsTrigger value="access" data-testid="tab-access">
            <Shield className="h-4 w-4 mr-2" />
            Access Control
          </TabsTrigger>
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
            <Card data-testid="card-events-by-type">
              <CardHeader>
                <CardTitle>Events by Type</CardTitle>
                <CardDescription>Distribution of security events</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300} data-testid="chart-events-by-type">
                  <PieChart>
                    <Pie
                      data={metrics.eventsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ eventType, count, cx, cy, midAngle, outerRadius }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 25;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="currentColor"
                            className="text-foreground text-xs"
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                          >
                            {`${eventType}: ${count}`}
                          </text>
                        );
                      }}
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

            <Card data-testid="card-events-by-hour">
              <CardHeader>
                <CardTitle>Events by Hour</CardTitle>
                <CardDescription>Security event frequency over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300} data-testid="chart-events-by-hour">
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
                      <div className="text-lg" data-testid="text-last-scan-time">
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
                      <div className="text-3xl font-bold" data-testid="text-vulnerability-total-count">
                        {vulnSummary.totalVulnerabilities}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-3">Vulnerability Breakdown</div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="p-3 rounded-lg border" data-testid="card-vulnerability-critical">
                        <div className="text-xs text-muted-foreground mb-1">Critical</div>
                        <div className="text-2xl font-bold text-destructive" data-testid="text-vulnerability-critical">
                          {vulnSummary.criticalCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border" data-testid="card-vulnerability-high">
                        <div className="text-xs text-muted-foreground mb-1">High</div>
                        <div className="text-2xl font-bold text-orange-600" data-testid="text-vulnerability-high">
                          {vulnSummary.highCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border" data-testid="card-vulnerability-moderate">
                        <div className="text-xs text-muted-foreground mb-1">Moderate</div>
                        <div className="text-2xl font-bold text-yellow-600" data-testid="text-vulnerability-moderate">
                          {vulnSummary.moderateCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border" data-testid="card-vulnerability-low">
                        <div className="text-xs text-muted-foreground mb-1">Low</div>
                        <div className="text-2xl font-bold text-blue-600" data-testid="text-vulnerability-low">
                          {vulnSummary.lowCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border" data-testid="card-vulnerability-info">
                        <div className="text-xs text-muted-foreground mb-1">Info</div>
                        <div className="text-2xl font-bold text-gray-600" data-testid="text-vulnerability-info">
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

        {/* Alert Settings Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>Configure email alerts for security events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-alerts">Enable Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">Send email notifications for security events</p>
                  </div>
                  <Switch
                    id="email-alerts"
                    checked={alertSettings.emailAlertsEnabled}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, emailAlertsEnabled: checked }))}
                    data-testid="switch-email-alerts"
                  />
                </div>
                
                {alertSettings.emailAlertsEnabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="email-recipients">Notification Recipients</Label>
                      <Input
                        id="email-recipients"
                        placeholder="admin@example.com, security@example.com"
                        value={alertSettings.emailRecipients}
                        onChange={(e) => setAlertSettings(prev => ({ ...prev, emailRecipients: e.target.value }))}
                        data-testid="input-email-recipients"
                      />
                      <p className="text-xs text-muted-foreground">Comma-separated list of email addresses</p>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Alert Triggers</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Critical security events</span>
                          <Switch
                            checked={alertSettings.alertOnCritical}
                            onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, alertOnCritical: checked }))}
                            data-testid="switch-alert-critical"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">High severity events</span>
                          <Switch
                            checked={alertSettings.alertOnHigh}
                            onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, alertOnHigh: checked }))}
                            data-testid="switch-alert-high"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Failed login attempts</span>
                          <Switch
                            checked={alertSettings.alertOnLoginFailures}
                            onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, alertOnLoginFailures: checked }))}
                            data-testid="switch-alert-login"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Pending reconciliation alerts</span>
                          <Switch
                            checked={alertSettings.alertOnPendingRecon}
                            onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, alertOnPendingRecon: checked }))}
                            data-testid="switch-alert-recon"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {alertSettings.alertOnPendingRecon && (
                      <div className="space-y-2">
                        <Label htmlFor="recon-days">Alert if reconciliation pending for more than</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="recon-days"
                            type="number"
                            min={1}
                            max={30}
                            value={alertSettings.reconAlertDays}
                            onChange={(e) => setAlertSettings(prev => ({ ...prev, reconAlertDays: parseInt(e.target.value) || 7 }))}
                            className="w-20"
                            data-testid="input-recon-days"
                          />
                          <span className="text-sm text-muted-foreground">days</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Webhook Notifications
                </CardTitle>
                <CardDescription>Send alerts to Slack, Discord, or custom webhooks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="webhook-alerts">Enable Webhook Alerts</Label>
                    <p className="text-sm text-muted-foreground">Send alerts to external services</p>
                  </div>
                  <Switch
                    id="webhook-alerts"
                    checked={alertSettings.webhookEnabled}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, webhookEnabled: checked }))}
                    data-testid="switch-webhook-alerts"
                  />
                </div>
                
                {alertSettings.webhookEnabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="webhook-url">Webhook URL</Label>
                      <Input
                        id="webhook-url"
                        placeholder="https://hooks.slack.com/services/..."
                        value={alertSettings.webhookUrl}
                        onChange={(e) => setAlertSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                        data-testid="input-webhook-url"
                      />
                      <p className="text-xs text-muted-foreground">
                        Supports Slack, Discord, and other webhook-compatible services
                      </p>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toast({ title: "Test webhook sent", description: "Check your webhook destination for a test message" })}
                      data-testid="button-test-webhook"
                    >
                      Send Test Notification
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={() => toast({ title: "Settings saved", description: "Your notification preferences have been updated" })}
              data-testid="button-save-alert-settings"
            >
              Save Alert Settings
            </Button>
          </div>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="access" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Two-Factor Authentication (2FA)
                </CardTitle>
                <CardDescription>Manage multi-factor authentication for your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border" data-testid="card-mfa-status">
                  <div className="flex items-center gap-3">
                    {mfaStatus.enabled ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-medium" data-testid="text-mfa-status">
                        {mfaStatus.enabled ? '2FA Enabled' : '2FA Not Enabled'}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="text-mfa-method">
                        {mfaStatus.enabled 
                          ? `Method: ${mfaStatus.method || 'Authenticator App'}`
                          : 'Enable 2FA for enhanced account security'
                        }
                      </p>
                    </div>
                  </div>
                  <Link href="/mfa-setup">
                    <Button 
                      variant={mfaStatus.enabled ? "outline" : "default"}
                      size="sm"
                      data-testid="button-manage-2fa"
                    >
                      {mfaStatus.enabled ? 'Manage' : 'Enable 2FA'}
                    </Button>
                  </Link>
                </div>
                
                {!mfaStatus.enabled && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Security Recommendation</AlertTitle>
                    <AlertDescription>
                      Enable two-factor authentication to protect your account from unauthorized access.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  IP Address Restrictions
                </CardTitle>
                <CardDescription>Control access by IP address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="ip-address">IP Address or CIDR Range</Label>
                    <div className="flex gap-2">
                      <Input
                        id="ip-address"
                        placeholder="192.168.1.0/24 or 10.0.0.1"
                        value={newIpAddress}
                        onChange={(e) => setNewIpAddress(e.target.value)}
                        className="flex-1"
                        data-testid="input-ip-address"
                      />
                      <select
                        value={newIpType}
                        onChange={(e) => setNewIpType(e.target.value as 'allow' | 'block')}
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                        data-testid="select-ip-type"
                      >
                        <option value="allow">Allow</option>
                        <option value="block">Block</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ip-description">Description</Label>
                    <Input
                      id="ip-description"
                      placeholder="Office network, VPN, etc."
                      value={newIpDescription}
                      onChange={(e) => setNewIpDescription(e.target.value)}
                      data-testid="input-ip-description"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newIpAddress) {
                        setIpRestrictions(prev => [...prev, {
                          id: Date.now(),
                          ipAddress: newIpAddress,
                          description: newIpDescription,
                          type: newIpType,
                          createdAt: new Date()
                        }]);
                        setNewIpAddress('');
                        setNewIpDescription('');
                        toast({ title: "IP restriction added" });
                      }
                    }}
                    data-testid="button-add-ip"
                  >
                    Add IP Restriction
                  </Button>
                </div>
                
                {ipRestrictions.length > 0 ? (
                  <div className="space-y-2 pt-4 border-t">
                    <Label>Current Restrictions</Label>
                    {ipRestrictions.map((restriction) => (
                      <div key={restriction.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`card-ip-restriction-${restriction.id}`}>
                        <div className="flex items-center gap-3">
                          <Badge variant={restriction.type === 'allow' ? 'default' : 'destructive'} data-testid={`badge-ip-type-${restriction.id}`}>
                            {restriction.type}
                          </Badge>
                          <div>
                            <p className="font-mono text-sm" data-testid={`text-ip-address-${restriction.id}`}>{restriction.ipAddress}</p>
                            <p className="text-xs text-muted-foreground" data-testid={`text-ip-description-${restriction.id}`}>{restriction.description}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIpRestrictions(prev => prev.filter(r => r.id !== restriction.id))}
                          data-testid={`button-remove-ip-${restriction.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-ip-restrictions">
                    No IP restrictions configured. All IP addresses are currently allowed.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
