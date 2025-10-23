import { useState } from "react";
import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";

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

    // Custom upload implementation
    uppyInstance.on("upload", async () => {
      const files = uppyInstance.getFiles();
      
      for (const file of files) {
        try {
          // Get signed upload URL from server
          const uploadUrlResponse = await fetch(`/api/transactions/${transactionId}/attachments/upload-url`, {
            method: "POST",
          });
          
          if (!uploadUrlResponse.ok) {
            throw new Error("Failed to get upload URL");
          }
          
          const { uploadUrl } = await uploadUrlResponse.json();

          // Upload file directly to object storage using signed URL
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

          // Save attachment metadata to database with the raw upload URL
          // The backend will normalize it to the canonical object path
          const saveResponse = await fetch(`/api/transactions/${transactionId}/attachments`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileName: file.name,
              fileSize: file.size as number,
              fileType: file.type || "application/octet-stream",
              objectPath: uploadUrl,
            }),
          });

          if (!saveResponse.ok) {
            throw new Error("Failed to save attachment metadata");
          }

          // Mark file as successfully uploaded
          uppyInstance.emit("upload-success", file, {});
        } catch (error: any) {
          uppyInstance.emit("upload-error", file, error);
        }
      }
      
      // Trigger complete event
      uppyInstance.emit("complete", { successful: uppyInstance.getFiles(), failed: [] });
    });

    uppyInstance.on("complete", (result: any) => {
      if (result.successful && result.successful.length > 0 && onUploadComplete) {
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
