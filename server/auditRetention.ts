// NIST 800-53 AU-11: Audit Record Retention
// 90-day active retention, 7-year archival policy

import { db } from './db';
import { auditLogs } from '@shared/schema';
import { and, eq, lte, sql } from 'drizzle-orm';

const ACTIVE_RETENTION_DAYS = 90;
const ARCHIVAL_RETENTION_YEARS = 7;

/**
 * Archive audit logs older than 90 days
 * Marks logs as archived rather than deleting them
 * NIST 800-53 AU-11: Retain audit records for compliance period
 */
export async function archiveOldAuditLogs(): Promise<{ archivedCount: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ACTIVE_RETENTION_DAYS);

  const result = await db
    .update(auditLogs)
    .set({
      archived: true,
      archivedAt: new Date(),
    })
    .where(
      and(
        eq(auditLogs.archived, false),
        lte(auditLogs.timestamp, cutoffDate)
      )
    )
    .returning();

  return { archivedCount: result.length };
}

/**
 * Permanently delete audit logs older than 7 years
 * Only deletes logs that have been archived
 * NIST 800-53 AU-11: Comply with retention requirements
 */
export async function deleteExpiredAuditLogs(): Promise<{ deletedCount: number }> {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - ARCHIVAL_RETENTION_YEARS);

  const result = await db
    .delete(auditLogs)
    .where(
      and(
        eq(auditLogs.archived, true),
        lte(auditLogs.timestamp, cutoffDate)
      )
    )
    .returning();

  return { deletedCount: result.length };
}

/**
 * Get audit log retention statistics
 */
export async function getAuditRetentionStats(): Promise<{
  totalLogs: number;
  activeLogs: number;
  archivedLogs: number;
  oldestActiveLog: Date | null;
  oldestArchivedLog: Date | null;
}> {
  const [stats] = await db
    .select({
      totalLogs: sql<number>`count(*)::int`,
      activeLogs: sql<number>`count(*) filter (where archived = false)::int`,
      archivedLogs: sql<number>`count(*) filter (where archived = true)::int`,
      oldestActiveLog: sql<Date | null>`min(timestamp) filter (where archived = false)`,
      oldestArchivedLog: sql<Date | null>`min(timestamp) filter (where archived = true)`,
    })
    .from(auditLogs);

  return stats;
}

/**
 * Manual trigger to run retention policies
 * This would typically be called by a scheduled job (cron)
 */
export async function runAuditRetentionPolicies(): Promise<{
  archived: number;
  deleted: number;
  stats: Awaited<ReturnType<typeof getAuditRetentionStats>>;
}> {
  const archiveResult = await archiveOldAuditLogs();
  const deleteResult = await deleteExpiredAuditLogs();
  const stats = await getAuditRetentionStats();

  return {
    archived: archiveResult.archivedCount,
    deleted: deleteResult.deletedCount,
    stats,
  };
}
