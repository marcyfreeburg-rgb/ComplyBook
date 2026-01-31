import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getCsrfToken } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Trash2, Upload, X, FileIcon, FileSpreadsheet, FileImage, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface EntityDocumentUploaderProps {
  organizationId: number;
  entityType: "contract" | "proposal" | "change_order";
  entityId: number;
  documentType?: "contract" | "invoice" | "receipt" | "report" | "certificate" | "grant_document" | "compliance" | "other";
  allowedFileTypes?: string[];
  maxFileSize?: number;
  maxNumberOfFiles?: number;
}

interface Document {
  id: number;
  organizationId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  documentType: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  version: number;
  description: string | null;
  uploadedBy: string;
  createdAt: string;
}

interface SelectedFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export function EntityDocumentUploader({
  organizationId,
  entityType,
  entityId,
  documentType = "other",
  allowedFileTypes = ["image/*", "application/pdf", ".xlsx", ".xls", ".csv", ".txt", ".doc", ".docx"],
  maxFileSize = 10 * 1024 * 1024,
  maxNumberOfFiles = 10,
}: EntityDocumentUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: [`/api/documents/${entityType}/${entityId}`],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${entityType}/${entityId}`] });
      toast({ title: "Document deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete document", variant: "destructive" });
    },
  });

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileIcon className="h-4 w-4" />;
    if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4" />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) 
      return <FileSpreadsheet className="h-4 w-4" />;
    if (mimeType.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/download/${doc.id}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to download document");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({ 
        title: "Download failed", 
        description: error.message || "Failed to download document", 
        variant: "destructive" 
      });
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File exceeds maximum size of ${Math.floor(maxFileSize / 1024 / 1024)}MB`;
    }
    return null;
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles: SelectedFile[] = [];
    const maxToAdd = maxNumberOfFiles - selectedFiles.length;
    
    for (let i = 0; i < Math.min(files.length, maxToAdd); i++) {
      const file = files[i];
      const error = validateFile(file);
      newFiles.push({
        file,
        id: `${Date.now()}-${i}`,
        status: error ? "error" : "pending",
        progress: 0,
        error: error || undefined,
      });
    }
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  }, [selectedFiles.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    let successCount = 0;
    
    for (const selectedFile of selectedFiles) {
      if (selectedFile.status === "error") continue;
      
      setSelectedFiles(prev => prev.map(f => 
        f.id === selectedFile.id ? { ...f, status: "uploading" as const, progress: 10 } : f
      ));
      
      try {
        const csrfToken = getCsrfToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (csrfToken) {
          headers["x-csrf-token"] = csrfToken;
        }
        
        const uploadUrlResponse = await fetch("/api/documents/upload-url", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            organizationId,
            entityType,
            entityId,
          }),
        });
        
        if (!uploadUrlResponse.ok) {
          throw new Error("Failed to get upload URL");
        }
        
        setSelectedFiles(prev => prev.map(f => 
          f.id === selectedFile.id ? { ...f, progress: 30 } : f
        ));
        
        const { uploadUrl } = await uploadUrlResponse.json();

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: selectedFile.file,
          headers: {
            "Content-Type": selectedFile.file.type || "application/octet-stream",
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload to storage failed");
        }

        setSelectedFiles(prev => prev.map(f => 
          f.id === selectedFile.id ? { ...f, progress: 70 } : f
        ));

        const saveHeaders: Record<string, string> = { "Content-Type": "application/json" };
        const saveToken = getCsrfToken();
        if (saveToken) {
          saveHeaders["x-csrf-token"] = saveToken;
        }
        
        const saveResponse = await fetch("/api/documents", {
          method: "POST",
          headers: saveHeaders,
          credentials: "include",
          body: JSON.stringify({
            organizationId,
            fileName: selectedFile.file.name,
            fileSize: selectedFile.file.size,
            mimeType: selectedFile.file.type || "application/octet-stream",
            objectPath: uploadUrl,
            documentType,
            relatedEntityType: entityType,
            relatedEntityId: entityId,
            description: null,
          }),
        });

        if (!saveResponse.ok) {
          throw new Error("Failed to save document metadata");
        }

        setSelectedFiles(prev => prev.map(f => 
          f.id === selectedFile.id ? { ...f, status: "success" as const, progress: 100 } : f
        ));
        successCount++;
      } catch (error: any) {
        setSelectedFiles(prev => prev.map(f => 
          f.id === selectedFile.id ? { ...f, status: "error" as const, error: error.message } : f
        ));
      }
    }
    
    setIsUploading(false);
    
    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${entityType}/${entityId}`] });
      toast({ title: `${successCount} document(s) uploaded successfully` });
      
      setTimeout(() => {
        setSelectedFiles([]);
        setUploadDialogOpen(false);
      }, 1000);
    }
  };

  const entityLabel = entityType === "contract" ? "Contract" : entityType === "proposal" ? "Proposal" : "Change Order";

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documents ({documents.length})
        </CardTitle>
        <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) {
            setSelectedFiles([]);
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" data-testid="button-upload-document">
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Documents to {entityLabel}</DialogTitle>
              <DialogDescription>
                Drag and drop files or click to browse. Max {Math.floor(maxFileSize / 1024 / 1024)}MB per file.
              </DialogDescription>
            </DialogHeader>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-upload"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
                accept={allowedFileTypes.join(",")}
                data-testid="input-file-upload"
              />
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-1">
                {isDragging ? "Drop files here" : "Drag and drop files here"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse your computer
              </p>
              <Button type="button" variant="outline" size="sm" onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}>
                Browse Files
              </Button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2 mt-4 max-h-48 overflow-y-auto">
                {selectedFiles.map((sf) => (
                  <div 
                    key={sf.id} 
                    className={`flex items-center gap-2 p-2 rounded-md border ${
                      sf.status === "error" ? "bg-destructive/10 border-destructive/30" :
                      sf.status === "success" ? "bg-green-500/10 border-green-500/30" :
                      "bg-muted/30"
                    }`}
                    data-testid={`selected-file-${sf.id}`}
                  >
                    {getFileIcon(sf.file.type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{sf.file.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {formatFileSize(sf.file.size)}
                        {sf.status === "uploading" && (
                          <Progress value={sf.progress} className="h-1 w-20" />
                        )}
                        {sf.status === "success" && (
                          <span className="text-green-600">Uploaded</span>
                        )}
                        {sf.status === "error" && (
                          <span className="text-destructive">{sf.error}</span>
                        )}
                      </div>
                    </div>
                    {sf.status === "pending" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFile(sf.id)}
                        className="h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    {sf.status === "uploading" && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedFiles([]);
                  setUploadDialogOpen(false);
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button 
                onClick={uploadFiles}
                disabled={selectedFiles.filter(f => f.status === "pending").length === 0 || isUploading}
                data-testid="button-start-upload"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {selectedFiles.filter(f => f.status === "pending").length} File(s)
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No documents uploaded yet
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center justify-between p-2 rounded-md border bg-muted/30 hover-elevate"
                data-testid={`document-item-${doc.id}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(doc.mimeType)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{doc.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDownload(doc)}
                    data-testid={`button-download-${doc.id}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${doc.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
