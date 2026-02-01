import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Calendar, File, Upload, FolderOpen, Download, MoreHorizontal, Trash2, Loader2, Plus, Edit2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Organization, Document as DocumentType, ComplianceEvent } from "@shared/schema";

// Extended document type with uploader name
interface DocumentWithUploader extends DocumentType {
  uploaderName?: string;
}

interface OperationsHubProps {
  currentOrganization: Organization;
  userId: string;
}

// Document categories - some are nonprofit-specific
const ALL_DOCUMENT_CATEGORIES = [
  { id: 'grant-agreements', label: 'Grant Agreements', color: 'bg-blue-500', nonprofitOnly: true },
  { id: '990-forms', label: '990 Forms', color: 'bg-purple-500', nonprofitOnly: true },
  { id: 'audits', label: 'Audits', color: 'bg-green-500', nonprofitOnly: false },
  { id: 'contracts', label: 'Contracts', color: 'bg-orange-500', nonprofitOnly: false },
  { id: 'policies', label: 'Policies', color: 'bg-yellow-500', nonprofitOnly: false },
  { id: 'invoices', label: 'Invoices', color: 'bg-pink-500', nonprofitOnly: false },
  { id: 'receipts', label: 'Receipts', color: 'bg-teal-500', nonprofitOnly: false },
  { id: 'other', label: 'Other', color: 'bg-gray-500', nonprofitOnly: false },
];

// Compliance event types with distinct colors
const COMPLIANCE_EVENT_TYPES = [
  { id: 'financial_audit', label: 'Financial Audit', color: 'bg-red-500', textColor: 'text-red-600' },
  { id: 'budget_draft', label: 'Budget Draft', color: 'bg-blue-500', textColor: 'text-blue-600' },
  { id: 'final_budget', label: 'Final Budget', color: 'bg-blue-700', textColor: 'text-blue-700' },
  { id: 'updated_budget', label: 'Updated Budget', color: 'bg-blue-400', textColor: 'text-blue-500' },
  { id: 'cyber_compliance', label: 'Cyber Compliance', color: 'bg-purple-500', textColor: 'text-purple-600' },
  { id: 'other', label: 'Other', color: 'bg-gray-500', textColor: 'text-gray-600' },
];

const getComplianceEventColor = (eventType: string) => {
  const type = COMPLIANCE_EVENT_TYPES.find(t => t.id === eventType);
  return type?.color || 'bg-gray-500';
};

const getComplianceEventLabel = (eventType: string) => {
  const type = COMPLIANCE_EVENT_TYPES.find(t => t.id === eventType);
  return type?.label || 'Other';
};

const getDaysUntil = (date: Date | string) => {
  const dueDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};


export default function OperationsHub({ currentOrganization, userId }: OperationsHubProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("documents");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
  
  // Compliance event state
  const [complianceDialogOpen, setComplianceDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ComplianceEvent | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    eventType: 'other' as string,
    dueDate: '',
    completedDate: '',
    description: '',
  });

  // Filter document categories based on organization type
  const isNonprofit = currentOrganization?.type === 'nonprofit';
  const DOCUMENT_CATEGORIES = ALL_DOCUMENT_CATEGORIES.filter(cat => 
    !cat.nonprofitOnly || isNonprofit
  );

  // Load documents from the API
  const { data: documents = [], isLoading: documentsLoading, isError: documentsError } = useQuery<DocumentWithUploader[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/documents`],
    enabled: !!currentOrganization?.id,
  });

  // Load compliance events
  const { data: complianceEvents = [], isLoading: complianceLoading } = useQuery<ComplianceEvent[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/compliance-events`],
    enabled: !!currentOrganization?.id,
  });

  // Count upcoming events within 30 days
  const upcomingEvents = complianceEvents.filter(e => {
    if (e.isCompleted) return false;
    const days = getDaysUntil(e.dueDate);
    return days >= 0 && days <= 30;
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: number) => {
      await apiRequest('DELETE', `/api/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/documents`] });
      toast({ title: "Document deleted", description: "The document has been removed." });
      setDeleteDocId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete document", variant: "destructive" });
    }
  });

  // Create compliance event mutation
  const createComplianceEventMutation = useMutation({
    mutationFn: async (data: typeof newEvent) => {
      await apiRequest('POST', '/api/compliance-events', {
        ...data,
        organizationId: currentOrganization.id,
        dueDate: new Date(data.dueDate),
        completedDate: data.completedDate ? new Date(data.completedDate) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/compliance-events`] });
      toast({ title: "Compliance event created" });
      setComplianceDialogOpen(false);
      setNewEvent({ title: '', eventType: 'other', dueDate: '', completedDate: '', description: '' });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create event", variant: "destructive" });
    }
  });

  // Update compliance event mutation
  const updateComplianceEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof newEvent> }) => {
      await apiRequest('PATCH', `/api/compliance-events/${id}`, {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        completedDate: data.completedDate ? new Date(data.completedDate) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/compliance-events`] });
      toast({ title: "Compliance event updated" });
      setComplianceDialogOpen(false);
      setEditingEvent(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update event", variant: "destructive" });
    }
  });

  // Delete compliance event mutation
  const deleteComplianceEventMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/compliance-events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/compliance-events`] });
      toast({ title: "Compliance event deleted" });
      setDeleteEventId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete event", variant: "destructive" });
    }
  });

  // Mark event as completed
  const markCompletedMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('PATCH', `/api/compliance-events/${id}`, {
        isCompleted: 1,
        completedDate: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/organizations/${currentOrganization?.id}/compliance-events`] });
      toast({ title: "Event marked as completed" });
    },
  });

  const openEditDialog = (event: ComplianceEvent) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      eventType: event.eventType,
      dueDate: new Date(event.dueDate).toISOString().split('T')[0],
      completedDate: event.completedDate ? new Date(event.completedDate).toISOString().split('T')[0] : '',
      description: event.description || '',
    });
    setComplianceDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingEvent(null);
    setNewEvent({ title: '', eventType: 'other', dueDate: '', completedDate: '', description: '' });
    setComplianceDialogOpen(true);
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !newEvent.dueDate) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    if (editingEvent) {
      updateComplianceEventMutation.mutate({ id: editingEvent.id, data: newEvent });
    } else {
      createComplianceEventMutation.mutate(newEvent);
    }
  };

  // Map documentType to category for filtering
  const mapDocTypeToCategory = (docType: string) => {
    const mapping: Record<string, string> = {
      'grant_document': 'grant-agreements',
      'compliance': '990-forms',
      'contract': 'contracts',
      'invoice': 'invoices',
      'receipt': 'receipts',
      'report': 'audits',
      'certificate': 'policies',
      'other': 'other',
    };
    return mapping[docType] || 'other';
  };

  const filteredDocuments = selectedCategory === "all" 
    ? documents 
    : documents.filter(d => mapDocTypeToCategory(d.documentType) === selectedCategory);

  // Format file size
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get category label from document type
  const getCategoryLabel = (docType: string) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.id === mapDocTypeToCategory(docType));
    return cat?.label || 'Other';
  };

  const getCategoryColor = (docType: string) => {
    const cat = ALL_DOCUMENT_CATEGORIES.find(c => c.id === mapDocTypeToCategory(docType));
    return cat?.color || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operations Hub</h1>
          <p className="text-muted-foreground">Document management and compliance tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <Card className={upcomingEvents.length > 0 ? "border-amber-500 dark:border-amber-400" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Compliance</CardTitle>
            {upcomingEvents.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <Calendar className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${upcomingEvents.length > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`} data-testid="text-metric-compliance-pending">
              {upcomingEvents.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {upcomingEvents.length > 0 ? 'Due within 30 days' : 'No upcoming items'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="h-4 w-4 mr-2" />
            Document Center
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">
            <Calendar className="h-4 w-4 mr-2" />
            Compliance Calendar
          </TabsTrigger>
        </TabsList>

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
                    <DialogTitle>Upload Documents</DialogTitle>
                    <DialogDescription>Documents are organized by their related entities</DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      To upload documents, navigate to the specific entity they relate to:
                    </p>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <strong>Contracts:</strong> Go to Contracts page and select a contract
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <strong>Proposals:</strong> Go to Proposals page and select a proposal
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <strong>Change Orders:</strong> Go to Contract Change Orders section
                      </li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-4">
                      All uploaded documents will automatically appear here in the Document Center.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setUploadDialogOpen(false)} data-testid="button-close-upload-dialog">
                      Got it
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Category Quick Filters */}
          <div className="flex flex-wrap gap-2">
            {DOCUMENT_CATEGORIES.map(cat => {
              const count = documents.filter(d => mapDocTypeToCategory(d.documentType) === cat.id).length;
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
                {documentsError ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-destructive mb-4" />
                    <p className="text-destructive">Failed to load documents</p>
                    <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page.</p>
                  </div>
                ) : documentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading documents...</span>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No documents uploaded yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Documents uploaded to contracts, proposals, and other entities will appear here.</p>
                  </div>
                ) : (
                  filteredDocuments.map((doc) => (
                    <div key={doc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 last:border-0 gap-3" data-testid={`item-document-${doc.id}`}>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className={`p-2 rounded ${getCategoryColor(doc.documentType)} bg-opacity-20`}>
                          <File className="h-6 w-6 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" data-testid={`text-document-name-${doc.id}`}>{doc.fileName}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs" data-testid={`badge-doc-category-${doc.id}`}>{getCategoryLabel(doc.documentType)}</Badge>
                            {doc.relatedEntityType && (
                              <>
                                <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                                <p className="text-xs text-muted-foreground capitalize" data-testid={`text-document-entity-${doc.id}`}>
                                  {doc.relatedEntityType.replace('_', ' ')} #{doc.relatedEntityId}
                                </p>
                              </>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground" data-testid={`text-document-metadata-${doc.id}`}>
                              v{doc.version} • {doc.uploaderName || 'Unknown'} • {new Date(doc.createdAt).toLocaleDateString()} • {formatFileSize(doc.fileSize)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => window.open(`/api/documents/download/${doc.id}`, '_blank')}
                          data-testid={`button-download-doc-${doc.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-doc-menu-${doc.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => window.open(`/api/documents/download/${doc.id}`, '_blank')}
                              data-testid={`button-download-menu-${doc.id}`}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteDocId(doc.id)}
                              data-testid={`button-delete-doc-${doc.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Document</DialogTitle>
                <DialogDescription>Are you sure you want to delete this document? This action cannot be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDocId(null)} data-testid="button-cancel-delete">
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteDocId && deleteDocumentMutation.mutate(deleteDocId)}
                  disabled={deleteDocumentMutation.isPending}
                  data-testid="button-confirm-delete"
                >
                  {deleteDocumentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold">Compliance Calendar</h2>
            <Button onClick={openAddDialog} data-testid="button-add-compliance-event">
              <Plus className="h-4 w-4 mr-2" />
              Add Compliance Item
            </Button>
          </div>

          {/* Type Legend */}
          <div className="flex flex-wrap gap-3">
            {COMPLIANCE_EVENT_TYPES.map(type => (
              <div key={type.id} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${type.color}`} />
                <span className="text-sm text-muted-foreground">{type.label}</span>
              </div>
            ))}
          </div>

          <Card>
            <CardContent className="pt-6">
              {complianceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading compliance items...</span>
                </div>
              ) : complianceEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No Compliance Items Yet</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                    Track important deadlines, filing dates, and compliance requirements.
                  </p>
                  <Button onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {complianceEvents.map(event => {
                    const daysUntil = getDaysUntil(event.dueDate);
                    const isOverdue = daysUntil < 0 && !event.isCompleted;
                    const isUrgent = daysUntil >= 0 && daysUntil <= 30 && !event.isCompleted;
                    
                    return (
                      <div 
                        key={event.id} 
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 last:border-0 gap-3 ${isUrgent ? 'bg-amber-50 dark:bg-amber-950/20 -mx-2 px-2 py-2 rounded' : ''} ${isOverdue ? 'bg-red-50 dark:bg-red-950/20 -mx-2 px-2 py-2 rounded' : ''}`}
                        data-testid={`item-compliance-${event.id}`}
                      >
                        <div className="flex items-start gap-4 w-full sm:w-auto">
                          <div className={`p-2 rounded ${getComplianceEventColor(event.eventType)} bg-opacity-20 mt-1`}>
                            <div className={`w-3 h-3 rounded-full ${getComplianceEventColor(event.eventType)}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${event.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {event.title}
                              </p>
                              {event.isCompleted && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                              {isOverdue && (
                                <Badge variant="destructive">Overdue</Badge>
                              )}
                              {isUrgent && !isOverdue && (
                                <Badge className="bg-amber-500 hover:bg-amber-600">Due Soon</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getComplianceEventLabel(event.eventType)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Due: {new Date(event.dueDate).toLocaleDateString()}
                              </span>
                              {event.completedDate && (
                                <span className="text-xs text-green-600">
                                  Completed: {new Date(event.completedDate).toLocaleDateString()}
                                </span>
                              )}
                              {!event.isCompleted && daysUntil >= 0 && (
                                <span className={`text-xs ${daysUntil <= 7 ? 'text-red-600 font-medium' : daysUntil <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                  ({daysUntil} day{daysUntil !== 1 ? 's' : ''} left)
                                </span>
                              )}
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                          {!event.isCompleted && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => markCompletedMutation.mutate(event.id)}
                              disabled={markCompletedMutation.isPending}
                              data-testid={`button-complete-event-${event.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-event-menu-${event.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(event)} data-testid={`menu-edit-event-${event.id}`}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteEventId(event.id)}
                                data-testid={`menu-delete-event-${event.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add/Edit Compliance Event Dialog */}
          <Dialog open={complianceDialogOpen} onOpenChange={(open) => {
            setComplianceDialogOpen(open);
            if (!open) setEditingEvent(null);
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Edit Compliance Item' : 'Add Compliance Item'}</DialogTitle>
                <DialogDescription>
                  Track important compliance deadlines and when they were last completed.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input 
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Annual Financial Audit"
                    data-testid="input-event-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={newEvent.eventType} onValueChange={(v) => setNewEvent(prev => ({ ...prev, eventType: v }))}>
                    <SelectTrigger data-testid="select-event-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLIANCE_EVENT_TYPES.map(type => (
                        <SelectItem key={type.id} value={type.id} data-testid={`item-event-type-${type.id}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Input 
                    type="date"
                    value={newEvent.dueDate}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, dueDate: e.target.value }))}
                    data-testid="input-event-due-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Completed Date</Label>
                  <Input 
                    type="date"
                    value={newEvent.completedDate}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, completedDate: e.target.value }))}
                    data-testid="input-event-completed-date"
                  />
                  <p className="text-xs text-muted-foreground">When was this compliance action last completed?</p>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional notes or details..."
                    rows={3}
                    data-testid="input-event-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setComplianceDialogOpen(false)} data-testid="button-cancel-event">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEvent}
                  disabled={createComplianceEventMutation.isPending || updateComplianceEventMutation.isPending}
                  data-testid="button-save-event"
                >
                  {(createComplianceEventMutation.isPending || updateComplianceEventMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {editingEvent ? 'Update' : 'Add'} Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Compliance Item</DialogTitle>
                <DialogDescription>Are you sure you want to delete this compliance item? This action cannot be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteEventId(null)} data-testid="button-cancel-delete-event">
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteEventId && deleteComplianceEventMutation.mutate(deleteEventId)}
                  disabled={deleteComplianceEventMutation.isPending}
                  data-testid="button-confirm-delete-event"
                >
                  {deleteComplianceEventMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
