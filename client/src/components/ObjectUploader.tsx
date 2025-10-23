import { useState } from "react";
import Uppy from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import { Dashboard } from "@uppy/react";

import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

interface ObjectUploaderProps {
  transactionId: number;
  onUploadComplete?: () => void;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  maxNumberOfFiles?: number;
}

export function ObjectUploader({
  transactionId,
  onUploadComplete,
  allowedFileTypes = ["image/*", "application/pdf", ".xlsx", ".xls", ".csv", ".txt", ".doc", ".docx"],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  maxNumberOfFiles = 5,
}: ObjectUploaderProps) {
  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxFileSize,
        maxNumberOfFiles,
        allowedFileTypes,
      },
      autoProceed: false,
    });

    uppyInstance.use(XHRUpload, {
      endpoint: `/api/transactions/${transactionId}/attachments`,
      method: "POST",
      fieldName: "file",
      getResponseData: (responseText, response) => {
        return JSON.parse(responseText);
      },
      async getResponseError(responseText, response) {
        let error = new Error("Upload failed");
        try {
          const json = JSON.parse(responseText);
          error = new Error(json.message || "Upload failed");
        } catch {
          // Keep default error
        }
        return error;
      },
    });

    // Before upload, get the signed upload URL and set up the file upload
    uppyInstance.on("file-added", async (file) => {
      try {
        // Get upload URL from server
        const response = await fetch(`/api/transactions/${transactionId}/attachments/upload-url`, {
          method: "POST",
        });
        
        if (!response.ok) {
          throw new Error("Failed to get upload URL");
        }
        
        const { uploadUrl } = await response.json();
        
        // Store metadata for later
        uppyInstance.setFileMeta(file.id, {
          uploadUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || "application/octet-stream",
        });
      } catch (error) {
        console.error("Error getting upload URL:", error);
        uppyInstance.removeFile(file.id);
      }
    });

    // Override the upload to use the signed URL
    uppyInstance.on("upload", async () => {
      const files = uppyInstance.getFiles();
      
      for (const file of files) {
        const meta = uppyInstance.getFile(file.id)?.meta;
        if (!meta?.uploadUrl) {
          uppyInstance.setFileState(file.id, {
            error: "No upload URL available",
          });
          continue;
        }

        try {
          // Upload directly to object storage using signed URL
          const uploadResponse = await fetch(meta.uploadUrl, {
            method: "PUT",
            body: file.data,
            headers: {
              "Content-Type": meta.fileType,
            },
          });

          if (!uploadResponse.ok) {
            throw new Error("Upload to storage failed");
          }

          // Save attachment metadata to database
          const saveResponse = await fetch(`/api/transactions/${transactionId}/attachments`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileName: meta.fileName,
              fileSize: meta.fileSize,
              fileType: meta.fileType,
              objectPath: meta.uploadUrl,
            }),
          });

          if (!saveResponse.ok) {
            throw new Error("Failed to save attachment metadata");
          }

          uppyInstance.setFileState(file.id, {
            progress: { uploadComplete: true, uploadStarted: true },
          });
        } catch (error: any) {
          uppyInstance.setFileState(file.id, {
            error: error.message || "Upload failed",
          });
        }
      }
    });

    uppyInstance.on("complete", (result) => {
      if (result.successful.length > 0 && onUploadComplete) {
        onUploadComplete();
      }
    });

    return uppyInstance;
  });

  return (
    <Dashboard
      uppy={uppy}
      proudlyDisplayPoweredByUppy={false}
      height={350}
      note={`Upload receipts and documents (max ${Math.floor(maxFileSize / 1024 / 1024)}MB per file)`}
    />
  );
}
