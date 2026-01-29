import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { FileText, Calendar, Database, Check, X, Clock, File, AlertCircle, Upload, Share2, History, FolderOpen, Bell, GripVertical, Download, Eye, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Organization } from "@shared/schema";

interface Document {
  id: number;
  name: string;
  type: string;
  category: string;
  entity: string;
  uploadedBy: string;
  date: string;
  size: string;
  versions: { version: number; date: string; uploadedBy: string; size: string }[];
  sharedWith: string[];
}

interface ComplianceEvent {
  id: number;
  title: string;
  type: string;
  dueDate: string;
  status: string;
  daysUntil: number;
  entity: string;
  grantId?: number;
  color?: string;
  reminder?: { days: number; sent: boolean };
}

interface OperationsHubProps {
  currentOrganization: Organization;
  userId: string;
}

const DOCUMENT_CATEGORIES = [
  { id: 'grant-agreements', label: 'Grant Agreements', color: 'bg-blue-500' },
  { id: '990-forms', label: '990 Forms', color: 'bg-purple-500' },
  { id: 'audits', label: 'Audits', color: 'bg-green-500' },
  { id: 'contracts', label: 'Contracts', color: 'bg-orange-500' },
  { id: 'policies', label: 'Policies', color: 'bg-yellow-500' },
  { id: 'invoices', label: 'Invoices', color: 'bg-pink-500' },
  { id: 'receipts', label: 'Receipts', color: 'bg-teal-500' },
  { id: 'other', label: 'Other', color: 'bg-gray-500' },
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  filing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  renewal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  deadline: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  audit: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  grant: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export default function OperationsHub({ currentOrganization, userId }: OperationsHubProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("reconciliation");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [versionHistoryDoc, setVersionHistoryDoc] = useState<Document | null>(null);
  const [shareDialogDoc, setShareDialogDoc] = useState<Document | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [calendarView, setCalendarView] = useState<'list' | 'calendar'>('list');
  const [addEventDialogOpen, setAddEventDialogOpen] = useState(false);

  const reconciliations = [
    { id: 1, account: "Operating Account - Wells Fargo", statementDate: "2025-10-31", statementBalance: 125450.32, bookBalance: 125450.32, difference: 0, status: "reconciled" },
    { id: 2, account: "Payroll Account - Chase", statementDate: "2025-10-31", statementBalance: 48200.15, bookBalance: 48550.15, difference: 350, status: "pending", daysPending: 8 },
  ];

  const [documents, setDocuments] = useState<Document[]>([
    { 
      id: 1, 
      name: "Grant-Agreement-Ford-2025.pdf", 
      type: "pdf", 
      category: "grant-agreements",
      entity: "Ford Foundation Grant", 
      uploadedBy: "John Doe", 
      date: "2025-10-25", 
      size: "2.4 MB",
      versions: [
        { version: 2, date: "2025-10-25", uploadedBy: "John Doe", size: "2.4 MB" },
        { version: 1, date: "2025-09-15", uploadedBy: "John Doe", size: "2.1 MB" },
      ],
      sharedWith: ["finance@org.com", "board@org.com"]
    },
    { 
      id: 2, 
      name: "Form990-2024.pdf", 
      type: "pdf", 
      category: "990-forms",
      entity: "Tax Filing 2024", 
      uploadedBy: "Admin User", 
      date: "2025-10-15", 
      size: "1.2 MB",
      versions: [
        { version: 3, date: "2025-10-15", uploadedBy: "Admin User", size: "1.2 MB" },
        { version: 2, date: "2025-10-10", uploadedBy: "Admin User", size: "1.1 MB" },
        { version: 1, date: "2025-09-30", uploadedBy: "Admin User", size: "1.0 MB" },
      ],
      sharedWith: ["cpa@accounting.com"]
    },
    { 
      id: 3, 
      name: "Annual-Audit-2024.pdf", 
      type: "pdf", 
      category: "audits",
      entity: "FY2024 Audit", 
      uploadedBy: "Jane Smith", 
      date: "2025-10-28", 
      size: "856 KB",
      versions: [
        { version: 1, date: "2025-10-28", uploadedBy: "Jane Smith", size: "856 KB" },
      ],
      sharedWith: []
    },
  ]);

  const [complianceEvents, setComplianceEvents] = useState<ComplianceEvent[]>([
    { id: 1, title: "Form 990 Filing", type: "filing", dueDate: "2025-11-15", status: "pending", daysUntil: 17, entity: "IRS", color: "purple", reminder: { days: 7, sent: false } },
    { id: 2, title: "Insurance Renewal", type: "renewal", dueDate: "2025-12-01", status: "pending", daysUntil: 33, entity: "General Liability", color: "blue", reminder: { days: 14, sent: false } },
    { id: 3, title: "Grant Report Submission", type: "deadline", dueDate: "2025-10-31", status: "completed", daysUntil: 0, entity: "Grant #45-2024", grantId: 45, color: "green" },
    { id: 4, title: "Ford Foundation Report", type: "grant", dueDate: "2025-11-30", status: "pending", daysUntil: 32, entity: "Ford Foundation", grantId: 12, color: "green", reminder: { days: 7, sent: true } },
    { id: 5, title: "Annual Audit", type: "audit", dueDate: "2025-12-15", status: "pending", daysUntil: 47, entity: "External Auditor", color: "red", reminder: { days: 30, sent: false } },
  ]);

  const filteredDocuments = selectedCategory === "all" 
    ? documents 
    : documents.filter(d => d.category === selectedCategory);

  const handleShareDocument = () => {
    if (shareDialogDoc && shareEmail) {
      setDocuments(prev => prev.map(doc => 
        doc.id === shareDialogDoc.id 
          ? { ...doc, sharedWith: [...doc.sharedWith, shareEmail] }
          : doc
      ));
      toast({ title: "Document shared", description: `Shared with ${shareEmail}` });
      setShareEmail("");
      setShareDialogDoc(null);
    }
  };

  const handleSetReminder = (eventId: number, days: number) => {
    setComplianceEvents(prev => prev.map(event =>
      event.id === eventId
        ? { ...event, reminder: { days, sent: false } }
        : event
    ));
    toast({ title: "Reminder set", description: `You'll be notified ${days} days before the deadline` });
  };

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
            <div className="text-2xl font-bold" data-testid="text-metric-reconciliations">{reconciliations.filter(r => r.status === "reconciled").length}/{reconciliations.length}</div>
            <p className="text-xs text-muted-foreground">Accounts reconciled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-metric-documents">{documents.length}</div>
            <p className="text-xs text-muted-foreground">Files stored</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Items</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-metric-compliance-pending">{complianceEvents.filter(e => e.status === "pending").length}</div>
            <p className="text-xs text-muted-foreground">Pending deadlines</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-metric-urgent-items">
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
              <Card key={recon.id} data-testid={`card-recon-${recon.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle data-testid={`text-recon-account-${recon.id}`}>{recon.account}</CardTitle>
                      <CardDescription>Statement Date: {recon.statementDate}</CardDescription>
                    </div>
                    <Badge variant={getStatusColor(recon.status)} data-testid={`badge-recon-status-${recon.id}`}>
                      {recon.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Statement Balance</p>
                      <p className="text-lg font-semibold" data-testid={`text-statement-balance-${recon.id}`}>${recon.statementBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Book Balance</p>
                      <p className="text-lg font-semibold" data-testid={`text-book-balance-${recon.id}`}>${recon.bookBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Difference</p>
                      <p className={`text-lg font-semibold ${recon.difference === 0 ? 'text-green-600' : 'text-destructive'}`} data-testid={`text-difference-${recon.id}`}>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold">Document Center</h2>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]" data-testid="select-doc-category">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="item-category-all">All Categories</SelectItem>
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id} data-testid={`item-category-${cat.id}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-upload-document">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>Upload a new document or a new version of an existing document</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select defaultValue="other">
                        <SelectTrigger data-testid="select-upload-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_CATEGORIES.map(cat => (
                            <SelectItem key={cat.id} value={cat.id} data-testid={`item-upload-category-${cat.id}`}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>File</Label>
                      <Input type="file" data-testid="input-upload-file" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input placeholder="Brief description of this document" data-testid="input-upload-description" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setUploadDialogOpen(false)} data-testid="button-cancel-upload">Cancel</Button>
                    <Button onClick={() => { setUploadDialogOpen(false); toast({ title: "Document uploaded" }); }} data-testid="button-confirm-upload">
                      Upload
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Category Quick Filters */}
          <div className="flex flex-wrap gap-2">
            {DOCUMENT_CATEGORIES.map(cat => {
              const count = documents.filter(d => d.category === cat.id).length;
              if (count === 0) return null;
              return (
                <Badge 
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? "all" : cat.id)}
                  data-testid={`badge-category-${cat.id}`}
                >
                  <div className={`w-2 h-2 rounded-full ${cat.color} mr-2`} />
                  {cat.label} ({count})
                </Badge>
              );
            })}
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {filteredDocuments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No documents in this category</p>
                ) : (
                  filteredDocuments.map((doc) => {
                    const category = DOCUMENT_CATEGORIES.find(c => c.id === doc.category);
                    return (
                      <div key={doc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 last:border-0 gap-3" data-testid={`item-document-${doc.id}`}>
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          <div className={`p-2 rounded ${category?.color || 'bg-muted'} bg-opacity-20`}>
                            <File className="h-6 w-6 text-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" data-testid={`text-document-name-${doc.id}`}>{doc.name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs" data-testid={`badge-doc-category-${doc.id}`}>{category?.label || doc.category}</Badge>
                              <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                              <p className="text-xs text-muted-foreground" data-testid={`text-document-entity-${doc.id}`}>{doc.entity}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground" data-testid={`text-document-metadata-${doc.id}`}>
                                v{doc.versions[0]?.version || 1} • {doc.uploadedBy} • {doc.date} • {doc.size}
                              </p>
                              {doc.sharedWith.length > 0 && (
                                <Badge variant="secondary" className="text-xs" data-testid={`badge-document-shared-${doc.id}`}>
                                  <Share2 className="h-3 w-3 mr-1" />
                                  Shared ({doc.sharedWith.length})
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                          <Button variant="ghost" size="icon" data-testid={`button-download-doc-${doc.id}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-doc-menu-${doc.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setVersionHistoryDoc(doc)} data-testid={`button-versions-${doc.id}`}>
                                <History className="h-4 w-4 mr-2" />
                                Version History ({doc.versions.length})
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setShareDialogDoc(doc)} data-testid={`button-share-${doc.id}`}>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share Document
                              </DropdownMenuItem>
                              <DropdownMenuItem data-testid={`button-preview-${doc.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" data-testid={`button-delete-doc-${doc.id}`}>
                                <X className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Version History Dialog */}
          <Dialog open={!!versionHistoryDoc} onOpenChange={() => setVersionHistoryDoc(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Version History</DialogTitle>
                <DialogDescription>{versionHistoryDoc?.name}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-3">
                  {versionHistoryDoc?.versions.map((v, i) => (
                    <div key={v.version} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`item-version-${v.version}`}>
                      <div className="flex items-center gap-3">
                        <Badge variant={i === 0 ? "default" : "outline"} data-testid={`badge-version-${v.version}`}>v{v.version}</Badge>
                        <div>
                          <p className="text-sm font-medium" data-testid={`text-version-date-${v.version}`}>{v.date}</p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-version-metadata-${v.version}`}>
                            {v.uploadedBy} • {v.size}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" data-testid={`button-download-version-${v.version}`}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Share Dialog */}
          <Dialog open={!!shareDialogDoc} onOpenChange={() => setShareDialogDoc(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Document</DialogTitle>
                <DialogDescription>{shareDialogDoc?.name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Add Email</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="email@example.com" 
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      data-testid="input-share-email"
                    />
                    <Button onClick={handleShareDocument} data-testid="button-add-share">Add</Button>
                  </div>
                </div>
                {shareDialogDoc?.sharedWith.length ? (
                  <div className="space-y-2">
                    <Label>Currently Shared With</Label>
                    <div className="space-y-2">
                      {shareDialogDoc.sharedWith.map((email, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg border" data-testid={`item-shared-email-${i}`}>
                          <span className="text-sm" data-testid={`text-shared-email-${i}`}>{email}</span>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setDocuments(prev => prev.map(d => 
                              d.id === shareDialogDoc.id 
                                ? { ...d, sharedWith: d.sharedWith.filter(e => e !== email) }
                                : d
                            ));
                          }} data-testid={`button-remove-share-${i}`}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not shared with anyone yet</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold">Compliance Calendar</h2>
            <div className="flex gap-2">
              <div className="flex rounded-lg border overflow-hidden">
                <Button 
                  variant={calendarView === 'list' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setCalendarView('list')}
                  className="rounded-none"
                  data-testid="button-view-list"
                >
                  List
                </Button>
                <Button 
                  variant={calendarView === 'calendar' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setCalendarView('calendar')}
                  className="rounded-none"
                  data-testid="button-view-calendar"
                >
                  Calendar
                </Button>
              </div>
              <Button data-testid="button-add-compliance-event" onClick={() => setAddEventDialogOpen(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(EVENT_TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`px-2 py-0.5 rounded text-xs ${color}`}>{type}</div>
              </div>
            ))}
          </div>

          {calendarView === 'calendar' ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Calendar View Coming Soon</p>
                  <p className="text-sm text-muted-foreground">Use List view to manage your compliance events</p>
                </div>
              </CardContent>
            </Card>
          ) : (
          <div className="grid gap-4">
            {complianceEvents
              .sort((a, b) => a.daysUntil - b.daysUntil)
              .map((event) => (
              <Card key={event.id} className="overflow-hidden" data-testid={`card-event-${event.id}`}>
                <div className={`h-1 ${EVENT_TYPE_COLORS[event.type]?.split(' ')[0] || 'bg-gray-500'}`} />
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-move hidden sm:block" />
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2" data-testid={`text-event-title-${event.id}`}>
                          {event.title}
                          {event.grantId && (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-grant-id-${event.id}`}>
                              Grant #{event.grantId}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription data-testid={`text-event-entity-${event.id}`}>{event.entity}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={EVENT_TYPE_COLORS[event.type] || ''} data-testid={`badge-event-type-${event.id}`}>
                        {event.type}
                      </Badge>
                      <Badge variant={getStatusColor(event.status)} data-testid={`badge-event-status-${event.id}`}>
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="text-sm font-semibold" data-testid={`text-event-due-date-${event.id}`}>{event.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Days Until Due</p>
                      <p className={`text-sm font-semibold ${getUrgencyColor(event.daysUntil)}`} data-testid={`text-event-days-until-${event.id}`}>
                        {event.status === "completed" ? "Completed" : `${event.daysUntil} days`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reminder</p>
                      {event.reminder ? (
                        <div className="flex items-center gap-1 text-sm" data-testid={`text-event-reminder-${event.id}`}>
                          <Bell className="h-3 w-3" />
                          <span>{event.reminder.days} days before</span>
                          {event.reminder.sent && (
                            <Badge variant="secondary" className="text-xs ml-1" data-testid={`badge-reminder-sent-${event.id}`}>Sent</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground" data-testid={`text-reminder-not-set-${event.id}`}>Not set</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Actions</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2" data-testid={`button-reminder-${event.id}`}>
                            <Bell className="h-3 w-3 mr-1" />
                            Set Reminder
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleSetReminder(event.id, 3)} data-testid={`menuitem-reminder-3-${event.id}`}>3 days before</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSetReminder(event.id, 7)} data-testid={`menuitem-reminder-7-${event.id}`}>7 days before</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSetReminder(event.id, 14)} data-testid={`menuitem-reminder-14-${event.id}`}>14 days before</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSetReminder(event.id, 30)} data-testid={`menuitem-reminder-30-${event.id}`}>30 days before</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {event.daysUntil <= 7 && event.status === "pending" && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <p className="text-sm text-destructive">Due within 7 days - immediate attention required</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" data-testid={`button-view-event-${event.id}`}>
                      View Details
                    </Button>
                    {event.status === "pending" && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setComplianceEvents(prev => prev.map(e => 
                              e.id === event.id ? { ...e, status: 'completed', daysUntil: 0 } : e
                            ));
                            toast({ title: "Event completed" });
                          }}
                          data-testid={`button-complete-event-${event.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark Complete
                        </Button>
                      </>
                    )}
                    {event.grantId && (
                      <Link href={`/grants/${event.grantId}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-view-grant-${event.id}`}>
                          View Grant
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}

          {/* Add Event Dialog */}
          <Dialog open={addEventDialogOpen} onOpenChange={setAddEventDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Compliance Event</DialogTitle>
                <DialogDescription>Add a new deadline or compliance event to track</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Event Title</Label>
                  <Input placeholder="e.g., Form 990 Filing Deadline" data-testid="input-event-title" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select defaultValue="deadline">
                      <SelectTrigger data-testid="select-event-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filing" data-testid="item-event-type-filing">Filing</SelectItem>
                        <SelectItem value="renewal" data-testid="item-event-type-renewal">Renewal</SelectItem>
                        <SelectItem value="deadline" data-testid="item-event-type-deadline">Deadline</SelectItem>
                        <SelectItem value="audit" data-testid="item-event-type-audit">Audit</SelectItem>
                        <SelectItem value="grant" data-testid="item-event-type-grant">Grant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" data-testid="input-event-date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Related Entity</Label>
                  <Input placeholder="e.g., IRS, Ford Foundation, etc." data-testid="input-event-entity" />
                </div>
                <div className="space-y-2">
                  <Label>Reminder</Label>
                  <Select defaultValue="7">
                    <SelectTrigger data-testid="select-event-reminder">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" data-testid="item-event-reminder-0">No reminder</SelectItem>
                      <SelectItem value="3" data-testid="item-event-reminder-3">3 days before</SelectItem>
                      <SelectItem value="7" data-testid="item-event-reminder-7">7 days before</SelectItem>
                      <SelectItem value="14" data-testid="item-event-reminder-14">14 days before</SelectItem>
                      <SelectItem value="30" data-testid="item-event-reminder-30">30 days before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddEventDialogOpen(false)} data-testid="button-cancel-event">Cancel</Button>
                <Button onClick={() => { setAddEventDialogOpen(false); toast({ title: "Event added" }); }} data-testid="button-confirm-add-event">
                  Add Event
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
