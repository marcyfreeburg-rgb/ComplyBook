import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Database, Check, X, Clock, File, AlertCircle } from "lucide-react";
import type { Organization } from "@shared/schema";

interface OperationsHubProps {
  currentOrganization: Organization;
  userId: string;
}

export default function OperationsHub({ currentOrganization, userId }: OperationsHubProps) {
  const [activeTab, setActiveTab] = useState("reconciliation");

  const reconciliations = [
    { id: 1, account: "Operating Account - Wells Fargo", statementDate: "2025-10-31", statementBalance: 125450.32, bookBalance: 125450.32, difference: 0, status: "reconciled" },
    { id: 2, account: "Payroll Account - Chase", statementDate: "2025-10-31", statementBalance: 48200.15, bookBalance: 48550.15, difference: 350, status: "pending" },
  ];

  const documents = [
    { id: 1, name: "Contract-ABC-2025.pdf", type: "contract", entity: "Contract #ABC123", uploadedBy: "John Doe", date: "2025-10-25", size: "2.4 MB" },
    { id: 2, name: "Invoice-10001.pdf", type: "invoice", entity: "Invoice #10001", uploadedBy: "Jane Smith", date: "2025-10-28", size: "856 KB" },
    { id: 3, name: "Form990-2024.pdf", type: "compliance", entity: "Tax Filing 2024", uploadedBy: "Admin User", date: "2025-10-15", size: "1.2 MB" },
  ];

  const complianceEvents = [
    { id: 1, title: "Form 990 Filing", type: "filing", dueDate: "2025-11-15", status: "pending", daysUntil: 17, entity: "IRS" },
    { id: 2, title: "Insurance Renewal", type: "renewal", dueDate: "2025-12-01", status: "pending", daysUntil: 33, entity: "General Liability" },
    { id: 3, title: "Grant Report Submission", type: "deadline", dueDate: "2025-10-31", status: "completed", daysUntil: 0, entity: "Grant #45-2024" },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case "reconciled": case "completed": return "default";
      case "pending": case "unreconciled": return "secondary";
      default: return "outline";
    }
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil <= 7) return "text-destructive";
    if (daysUntil <= 14) return "text-yellow-600";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operations Hub</h1>
          <p className="text-muted-foreground">Bank reconciliation, documents, and compliance tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reconciliations</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reconciliations.filter(r => r.status === "reconciled").length}/{reconciliations.length}</div>
            <p className="text-xs text-muted-foreground">Accounts reconciled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground">Files stored</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Items</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceEvents.filter(e => e.status === "pending").length}</div>
            <p className="text-xs text-muted-foreground">Pending deadlines</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {complianceEvents.filter(e => e.daysUntil <= 7 && e.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">Due within 7 days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="reconciliation" data-testid="tab-reconciliation">
            <Database className="h-4 w-4 mr-2" />
            Bank Reconciliation
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="h-4 w-4 mr-2" />
            Document Center
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">
            <Calendar className="h-4 w-4 mr-2" />
            Compliance Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reconciliation" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Bank Reconciliation</h2>
            <Button data-testid="button-new-reconciliation">
              <Database className="h-4 w-4 mr-2" />
              New Reconciliation
            </Button>
          </div>

          <div className="grid gap-4">
            {reconciliations.map((recon) => (
              <Card key={recon.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{recon.account}</CardTitle>
                      <CardDescription>Statement Date: {recon.statementDate}</CardDescription>
                    </div>
                    <Badge variant={getStatusColor(recon.status)}>
                      {recon.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Statement Balance</p>
                      <p className="text-lg font-semibold">${recon.statementBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Book Balance</p>
                      <p className="text-lg font-semibold">${recon.bookBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Difference</p>
                      <p className={`text-lg font-semibold ${recon.difference === 0 ? 'text-green-600' : 'text-destructive'}`}>
                        ${Math.abs(recon.difference).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        {recon.status === "reconciled" ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        )}
                        <p className="text-sm font-medium capitalize">{recon.status}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" data-testid={`button-view-recon-${recon.id}`}>
                      View Details
                    </Button>
                    {recon.status === "pending" && (
                      <Button variant="outline" size="sm" data-testid={`button-reconcile-${recon.id}`}>
                        Reconcile Account
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Document Center</h2>
            <Button data-testid="button-upload-document">
              <FileText className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded">
                        <File className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs text-muted-foreground">{doc.entity}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Uploaded by {doc.uploadedBy} on {doc.date} • {doc.size}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" data-testid={`button-download-doc-${doc.id}`}>
                        Download
                      </Button>
                      <Button variant="ghost" size="sm" data-testid={`button-delete-doc-${doc.id}`}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Compliance Calendar</h2>
            <Button data-testid="button-add-compliance-event">
              <Calendar className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>

          <div className="grid gap-4">
            {complianceEvents.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{event.title}</CardTitle>
                      <CardDescription>{event.entity}</CardDescription>
                    </div>
                    <Badge variant={getStatusColor(event.status)}>
                      {event.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="text-sm font-medium capitalize">{event.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="text-sm font-semibold">{event.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Days Until Due</p>
                      <p className={`text-sm font-semibold ${getUrgencyColor(event.daysUntil)}`}>
                        {event.status === "completed" ? "Completed" : `${event.daysUntil} days`}
                      </p>
                    </div>
                  </div>
                  {event.daysUntil <= 7 && event.status === "pending" && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <p className="text-sm text-destructive">Due within 7 days - immediate attention required</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" data-testid={`button-view-event-${event.id}`}>
                      View Details
                    </Button>
                    {event.status === "pending" && (
                      <Button variant="outline" size="sm" data-testid={`button-complete-event-${event.id}`}>
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
