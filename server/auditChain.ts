import crypto from 'crypto';
import type { InsertAuditLog, AuditLog } from '@shared/schema';

let cachedHmacKey: Buffer | null = null;

function getHmacKey(): Buffer {
  if (cachedHmacKey) {
    return cachedHmacKey;
  }
  
  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY environment variable required for audit log HMAC');
  }
  
  cachedHmacKey = crypto.scryptSync(masterKey, 'audit-hmac-salt', 32);
  return cachedHmacKey;
}

export function computeAuditLogHash(logEntry: AuditLog, timestamp: Date): string {
  const hashInput = JSON.stringify({
    id: logEntry.id,
    organizationId: logEntry.organizationId,
    userId: logEntry.userId,
    action: logEntry.action,
    entityType: logEntry.entityType,
    entityId: logEntry.entityId,
    oldValues: logEntry.oldValues,
    newValues: logEntry.newValues,
    changes: logEntry.changes,
    timestamp: timestamp.toISOString(),
    previousHash: logEntry.previousHash,
  });
  
  const hmac = crypto.createHmac('sha256', getHmacKey());
  hmac.update(hashInput);
  return hmac.digest('hex');
}

export function verifyAuditLogChain(logs: AuditLog[]): {
  isValid: boolean;
  tamperedIndices: number[];
  brokenChainIndices: number[];
  nullHashIndices: number[];
} {
  const tamperedIndices: number[] = [];
  const brokenChainIndices: number[] = [];
  const nullHashIndices: number[] = [];
  
  if (logs.length === 0) {
    return { isValid: true, tamperedIndices, brokenChainIndices, nullHashIndices };
  }
  
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    
    if (!log.chainHash) {
      nullHashIndices.push(i);
      continue;
    }
    
    if (!log.timestamp) {
      tamperedIndices.push(i);
      continue;
    }
    
    const computedHash = computeAuditLogHash(log, log.timestamp);
    if (log.chainHash !== computedHash) {
      tamperedIndices.push(i);
    }
    
    if (i > 0) {
      const previousLog = logs[i - 1];
      
      if (!previousLog.chainHash) {
        continue;
      }
      
      if (log.previousHash !== previousLog.chainHash) {
        brokenChainIndices.push(i);
      }
    } else {
      if (log.previousHash !== null) {
        brokenChainIndices.push(i);
      }
    }
  }
  
  return {
    isValid: tamperedIndices.length === 0 && brokenChainIndices.length === 0 && nullHashIndices.length === 0,
    tamperedIndices,
    brokenChainIndices,
    nullHashIndices,
  };
}
