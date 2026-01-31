import { ObjectStorageService } from "./objectStorage";
import { FilesystemStorageService, filesystemStorage } from "./filesystemStorage";

export type StorageType = "replit" | "filesystem" | "none";

export function getStorageType(): StorageType {
  if (process.env.PRIVATE_OBJECT_DIR && process.env.PUBLIC_OBJECT_SEARCH_PATHS) {
    return "replit";
  }
  if (process.env.STORAGE_TYPE === "filesystem" || process.env.STORAGE_PATH) {
    return "filesystem";
  }
  return "none";
}

export function isStorageAvailable(): boolean {
  return getStorageType() !== "none";
}

export interface UnifiedStorageService {
  type: StorageType;
  generateObjectPath(organizationId: number, entityType: string, entityId: number, fileName: string): string;
  getPublicUrl(objectPath: string): string;
  validateOrganizationAccess(objectPath: string, organizationId: number): boolean;
}

export function getStorageService(): UnifiedStorageService | null {
  const storageType = getStorageType();
  
  if (storageType === "replit") {
    const replitStorage = new ObjectStorageService();
    return {
      type: "replit",
      generateObjectPath: (orgId, entityType, entityId, fileName) => {
        const privateDir = replitStorage.getPrivateObjectDir();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-_]/g, "_");
        const uniqueId = Date.now().toString(36);
        return `${privateDir}/documents/org-${orgId}/${entityType}/${entityId}/${uniqueId}-${sanitizedFileName}`;
      },
      getPublicUrl: (objectPath) => `/api/files/${encodeURIComponent(objectPath)}`,
      validateOrganizationAccess: (objectPath, orgId) => objectPath.includes(`/org-${orgId}/`),
    };
  }
  
  if (storageType === "filesystem") {
    return {
      type: "filesystem",
      generateObjectPath: (orgId, entityType, entityId, fileName) => 
        filesystemStorage.generateObjectPath(orgId, entityType, entityId, fileName),
      getPublicUrl: (objectPath) => filesystemStorage.getPublicUrl(objectPath),
      validateOrganizationAccess: (objectPath, orgId) => 
        filesystemStorage.validateOrganizationAccess(objectPath, orgId),
    };
  }
  
  return null;
}

export { filesystemStorage };
