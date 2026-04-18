import Dexie, { type EntityTable } from "dexie";

export interface LocalAuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  userName?: string;
  deviceId?: string;
  changes?: Array<{ field: string; oldValue: any; newValue: any }>;
  metadata?: Record<string, any>;
  timestamp: number;
  synced: number;
}

export interface AuditDB extends Dexie {
  auditLogs: EntityTable<LocalAuditLog, "id">;
}

export const auditDB = new Dexie("ngepos_audit") as AuditDB;

auditDB.version(1).stores({
  auditLogs: "id, entityType, entityId, action, userId, timestamp, synced",
});

export async function logLocalAudit(entry: Omit<LocalAuditLog, "id" | "timestamp" | "synced">) {
  const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await auditDB.auditLogs.add({
    ...entry,
    id,
    timestamp: Date.now(),
    synced: 0,
  });

  return id;
}

export async function getUnsyncedAuditLogs(limit = 100) {
  return auditDB.auditLogs
    .where("synced")
    .equals(0)
    .limit(limit)
    .toArray();
}

export async function markAuditLogsSynced(ids: string[]) {
  await auditDB.auditLogs
    .where("id")
    .anyOf(ids)
    .modify({ synced: 1 });
}

export async function getLocalAuditHistory(
  entityType?: string,
  entityId?: string,
  limit = 50
) {
  let collection = auditDB.auditLogs.orderBy("timestamp").reverse();

  if (entityType && entityId) {
    return collection
      .filter((log) => log.entityType === entityType && log.entityId === entityId)
      .limit(limit)
      .toArray();
  }

  if (entityType) {
    return collection.filter((log) => log.entityType === entityType).limit(limit).toArray();
  }

  return collection.limit(limit).toArray();
}

export async function getRecentLocalAudits(limit = 100) {
  return auditDB.auditLogs.orderBy("timestamp").reverse().limit(limit).toArray();
}

export async function cleanupOldAuditLogs(keepDays = 30) {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;

  await auditDB.auditLogs
    .where("timestamp")
    .below(cutoff)
    .delete();
}

export async function getAuditStats(days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const logs = await auditDB.auditLogs
    .filter((log) => log.timestamp >= cutoff)
    .toArray();

  const byAction: Record<string, number> = {};
  const byEntity: Record<string, number> = {};

  for (const log of logs) {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
    byEntity[log.entityType] = (byEntity[log.entityType] || 0) + 1;
  }

  return {
    total: logs.length,
    byAction,
    byEntity,
    unsynced: logs.filter((l) => l.synced === 0).length,
  };
}
