import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Bug, Clock, AlertTriangle, CheckCircle, XCircle, Loader2,
  ExternalLink, Monitor, Globe, MessageSquare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BugReport {
  id: number;
  reporterUserId: string | null;
  reporterName: string | null;
  reporterEmail: string | null;
  deviceInfo: string | null;
  appVersion: string | null;
  errorTimestamp: string | null;
  errorMessage: string | null;
  stepsToReproduce: string;
  screenshotUrl: string | null;
  additionalComments: string | null;
  status: string;
  priority: string | null;
  adminNotes: string | null;
  pageUrl: string | null;
  browserInfo: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Bug }> = {
  new: { label: "New", variant: "destructive", icon: AlertTriangle },
  in_progress: { label: "In Progress", variant: "default", icon: Clock },
  resolved: { label: "Resolved", variant: "secondary", icon: CheckCircle },
  closed: { label: "Closed", variant: "outline", icon: XCircle },
  wont_fix: { label: "Won't Fix", variant: "outline", icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-muted-foreground" },
  medium: { label: "Medium", color: "text-yellow-600 dark:text-yellow-400" },
  high: { label: "High", color: "text-orange-600 dark:text-orange-400" },
  critical: { label: "Critical", color: "text-red-600 dark:text-red-400" },
};

export default function AdminBugReports() {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: reports = [], isLoading, error } = useQuery<BugReport[]>({
    queryKey: ["/api/bug-reports"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/bug-reports/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bug-reports"] });
      setSelectedReport(null);
      toast({ title: "Bug report updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  function openDetail(report: BugReport) {
    setSelectedReport(report);
    setEditStatus(report.status);
    setEditPriority(report.priority || "medium");
    setEditNotes(report.adminNotes || "");
  }

  function handleSave() {
    if (!selectedReport) return;
    updateMutation.mutate({
      id: selectedReport.id,
      updates: {
        status: editStatus,
        priority: editPriority,
        adminNotes: editNotes || undefined,
      },
    });
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const filteredReports = statusFilter === "all"
    ? reports
    : reports.filter((r) => r.status === statusFilter);

  const statusCounts = reports.reduce((acc: Record<string, number>, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>Access denied or error loading bug reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
          <Bug className="w-6 h-6" />
          Bug Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and manage bug reports submitted by beta testers.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: "all", label: "All", count: reports.length },
          { key: "new", label: "New", count: statusCounts["new"] || 0 },
          { key: "in_progress", label: "In Progress", count: statusCounts["in_progress"] || 0 },
          { key: "resolved", label: "Resolved", count: statusCounts["resolved"] || 0 },
          { key: "closed", label: "Closed", count: (statusCounts["closed"] || 0) + (statusCounts["wont_fix"] || 0) },
        ].map((item) => (
          <Card
            key={item.key}
            className={`cursor-pointer hover-elevate ${statusFilter === item.key ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(item.key === "closed" && statusFilter === "closed" ? "all" : item.key)}
            data-testid={`filter-${item.key}`}
          >
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <p className="text-2xl font-bold" data-testid={`count-${item.key}`}>{item.count}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bug className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No bug reports found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => {
                    const sc = statusConfig[report.status] || statusConfig.new;
                    const pc = priorityConfig[report.priority || "medium"];
                    return (
                      <TableRow key={report.id} data-testid={`row-bug-report-${report.id}`}>
                        <TableCell className="font-mono text-sm" data-testid={`text-report-id-${report.id}`}>
                          {report.id}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{report.reporterName || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{report.reporterEmail || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm line-clamp-2 max-w-xs">{report.stepsToReproduce}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sc.variant} data-testid={`badge-status-${report.id}`}>
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${pc.color}`}>{pc.label}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(report.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetail(report)}
                            data-testid={`button-view-${report.id}`}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bug className="w-5 h-5" />
                  Bug Report #{selectedReport.id}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Reporter</p>
                    <p className="text-sm font-medium">{selectedReport.reporterName || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{selectedReport.reporterEmail || ""}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Submitted</p>
                    <p className="text-sm">{formatDate(selectedReport.createdAt)}</p>
                  </div>
                </div>

                {(selectedReport.deviceInfo || selectedReport.appVersion) && (
                  <div className="flex items-start gap-2">
                    <Monitor className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Device / Version</p>
                      <p className="text-sm">{selectedReport.deviceInfo}{selectedReport.appVersion ? ` - ${selectedReport.appVersion}` : ""}</p>
                    </div>
                  </div>
                )}

                {selectedReport.errorTimestamp && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Error Timestamp</p>
                    <p className="text-sm">{formatDate(selectedReport.errorTimestamp)}</p>
                  </div>
                )}

                {selectedReport.errorMessage && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Error Message</p>
                    <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto">{selectedReport.errorMessage}</pre>
                  </div>
                )}

                {selectedReport.pageUrl && (
                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Page URL</p>
                      <p className="text-sm break-all">{selectedReport.pageUrl}</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Steps to Reproduce</p>
                  <p className="text-sm whitespace-pre-line bg-muted p-3 rounded-md">{selectedReport.stepsToReproduce}</p>
                </div>

                {selectedReport.screenshotUrl && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Screenshot</p>
                    <a href={selectedReport.screenshotUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" /> View Screenshot
                    </a>
                    <img
                      src={selectedReport.screenshotUrl}
                      alt="Bug screenshot"
                      className="mt-2 max-h-48 rounded-md border object-contain"
                      data-testid="img-detail-screenshot"
                    />
                  </div>
                )}

                {selectedReport.additionalComments && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Additional Comments</p>
                      <p className="text-sm whitespace-pre-line">{selectedReport.additionalComments}</p>
                    </div>
                  </div>
                )}

                {selectedReport.browserInfo && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Browser Info</summary>
                    <p className="mt-1 break-all text-muted-foreground">{selectedReport.browserInfo}</p>
                  </details>
                )}

                <hr />

                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Admin Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="wont_fix">Won't Fix</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={editPriority} onValueChange={setEditPriority}>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Admin Notes</Label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Internal notes about this bug..."
                      data-testid="input-admin-notes"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedReport(null)} data-testid="button-cancel-edit">
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-changes">
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
