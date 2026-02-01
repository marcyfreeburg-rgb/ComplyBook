import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Calendar, File, Upload, FolderOpen, Download, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Organization, Document as DocumentType } from "@shared/schema";

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


export default function OperationsHub({ currentOrganization, userId }: OperationsHubProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("documents");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);

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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground" data-testid="text-metric-compliance-pending">--</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
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
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Compliance Calendar Coming Soon</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Track important deadlines, filing dates, and compliance requirements. 
                  This feature will integrate with your grants, contracts, and tax reporting.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
