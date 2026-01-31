import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

function getStoragePath(): string {
  return process.env.STORAGE_PATH || "./uploads/documents";
}

export class FilesystemStorageService {
  private _basePath: string | null = null;

  private get basePath(): string {
    if (!this._basePath) {
      this._basePath = getStoragePath();
      this.ensureDirectoryExists(this._basePath);
    }
    return this._basePath;
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private getOrganizationPath(organizationId: number): string {
    const orgPath = path.join(this.basePath, `org-${organizationId}`);
    this.ensureDirectoryExists(orgPath);
    return orgPath;
  }

  private getEntityPath(organizationId: number, entityType: string, entityId: number): string {
    const entityPath = path.join(
      this.getOrganizationPath(organizationId),
      entityType,
      `${entityId}`
    );
    this.ensureDirectoryExists(entityPath);
    return entityPath;
  }

  generateObjectPath(organizationId: number, entityType: string, entityId: number, fileName: string): string {
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-_]/g, "_");
    const uniqueId = randomUUID().slice(0, 8);
    const finalFileName = `${uniqueId}-${sanitizedFileName}`;
    return path.join(`org-${organizationId}`, entityType, `${entityId}`, finalFileName);
  }

  async uploadFile(
    organizationId: number,
    entityType: string,
    entityId: number,
    fileName: string,
    fileBuffer: Buffer
  ): Promise<{ objectPath: string; fullPath: string }> {
    const objectPath = this.generateObjectPath(organizationId, entityType, entityId, fileName);
    const fullPath = path.join(this.basePath, objectPath);
    
    const dirPath = path.dirname(fullPath);
    this.ensureDirectoryExists(dirPath);
    
    await fs.promises.writeFile(fullPath, fileBuffer);
    
    return { objectPath, fullPath };
  }

  async getFile(objectPath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, objectPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error("File not found");
    }
    
    return fs.promises.readFile(fullPath);
  }

  async deleteFile(objectPath: string): Promise<void> {
    const fullPath = path.join(this.basePath, objectPath);
    
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  async fileExists(objectPath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, objectPath);
    return fs.existsSync(fullPath);
  }

  getPublicUrl(objectPath: string): string {
    return `/api/files/${objectPath}`;
  }

  async getSignedUploadUrl(
    organizationId: number,
    entityType: string,
    entityId: number,
    fileName: string
  ): Promise<{ uploadUrl: string; objectPath: string }> {
    const objectPath = this.generateObjectPath(organizationId, entityType, entityId, fileName);
    return {
      uploadUrl: `/api/files/upload`,
      objectPath,
    };
  }

  validateOrganizationAccess(objectPath: string, organizationId: number): boolean {
    const expectedPrefix = `org-${organizationId}/`;
    return objectPath.startsWith(expectedPrefix);
  }
}

export const filesystemStorage = new FilesystemStorageService();
