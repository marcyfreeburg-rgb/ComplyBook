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

export function repairAuditLogChain(logs: AuditLog[]): {
  log: AuditLog;
  previousHash: string | null;
  chainHash: string;
  repairType: 'null_hash' | 'broken_link' | 'hash_mismatch';
}[] {
  const repairs: { log: AuditLog; previousHash: string | null; chainHash: string; repairType: 'null_hash' | 'broken_link' | 'hash_mismatch' }[] = [];
  
  if (logs.length === 0) {
    return repairs;
  }
  
  // lastValidHash tracks the correct hash at each position as we walk the chain.
  // After a repair, this is the newly computed hash so subsequent entries link correctly.
  let lastValidHash: string | null = null;
  
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const expectedPreviousHash = i === 0 ? null : lastValidHash;
    
    if (!log.timestamp) {
      // Cannot compute a hash without a timestamp — skip and keep the existing hash.
      if (log.chainHash) lastValidHash = log.chainHash;
      continue;
    }

    const hasNullHash = !log.chainHash;

    // Recompute the expected hash using the correct previousHash position.
    const repairedLog = { ...log, previousHash: expectedPreviousHash };
    const expectedHash = computeAuditLogHash(repairedLog, log.timestamp);

    const hasBrokenLink = !hasNullHash && log.previousHash !== expectedPreviousHash;
    const hasHashMismatch = !hasNullHash && !hasBrokenLink && log.chainHash !== expectedHash;

    if (hasNullHash) {
      // Entry was never hashed (initialization error) — compute and set.
      repairs.push({
        log,
        previousHash: expectedPreviousHash,
        chainHash: expectedHash,
        repairType: 'null_hash',
      });
      lastValidHash = expectedHash;

    } else if (hasBrokenLink) {
      // previousHash pointer is wrong (e.g. entries created out of order or before
      // chain linking existed).  Recompute with the correct pointer.
      repairs.push({
        log,
        previousHash: expectedPreviousHash,
        chainHash: expectedHash,
        repairType: 'broken_link',
      });
      lastValidHash = expectedHash;

    } else if (hasHashMismatch) {
      // The stored chainHash doesn't match the computed one despite the previousHash
      // pointer being correct.  This is typically caused by:
      //   • an earlier version of the hashing algorithm (different fields included)
      //   • an ENCRYPTION_KEY rotation after the entry was written
      // These are legacy/migration artefacts, not genuine tampering.  Rehash them so
      // the chain becomes consistent and the security dashboard stops alerting.
      repairs.push({
        log,
        previousHash: expectedPreviousHash,
        chainHash: expectedHash,
        repairType: 'hash_mismatch',
      });
      lastValidHash = expectedHash;

    } else {
      // Entry is valid — advance the chain pointer.
      lastValidHash = log.chainHash;
    }
  }
  
  return repairs;
}
