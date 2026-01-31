import { useState, useEffect } from "react";
import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Trash2, Upload, X, FileIcon, FileSpreadsheet, FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxFileSize,
        maxNumberOfFiles,
        allowedFileTypes,
      },
      autoProceed: false,
    });

    uppyInstance.on("upload", async () => {
      setIsUploading(true);
      const files = uppyInstance.getFiles();
      
      for (const file of files) {
        try {
          const uploadUrlResponse = await fetch("/api/documents/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
          
          const { uploadUrl } = await uploadUrlResponse.json();

          const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            body: file.data,
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
          });

          if (!uploadResponse.ok) {
            throw new Error("Upload to storage failed");
          }

          const saveResponse = await fetch("/api/documents", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              organizationId,
              fileName: file.name,
              fileSize: file.size as number,
              mimeType: file.type || "application/octet-stream",
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

          uppyInstance.emit("upload-success", file, {});
        } catch (error: any) {
          uppyInstance.emit("upload-error", file, error);
          toast({ 
            title: "Upload failed", 
            description: error.message || "Failed to upload document", 
            variant: "destructive" 
          });
        }
      }
      
      uppyInstance.emit("complete", { successful: uppyInstance.getFiles(), failed: [] });
    });

    uppyInstance.on("complete", (result: any) => {
      setIsUploading(false);
      if (result.successful && result.successful.length > 0) {
        queryClient.invalidateQueries({ queryKey: [`/api/documents/${entityType}/${entityId}`] });
        toast({ title: `${result.successful.length} document(s) uploaded successfully` });
        uppyInstance.cancelAll();
        setUploadDialogOpen(false);
      }
    });

    return uppyInstance;
  });

  useEffect(() => {
    return () => {
      if (uppy && typeof uppy.close === 'function') {
        uppy.close();
      }
    };
  }, [uppy]);

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

  const entityLabel = entityType === "contract" ? "Contract" : entityType === "proposal" ? "Proposal" : "Change Order";

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documents ({documents.length})
        </CardTitle>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" data-testid="button-upload-document">
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Documents to {entityLabel}</DialogTitle>
            </DialogHeader>
            <Dashboard
              uppy={uppy}
              proudlyDisplayPoweredByUppy={false}
              height={350}
              note={`Upload documents (max ${Math.floor(maxFileSize / 1024 / 1024)}MB per file)`}
            />
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
