import { db } from "~/server/db";
import { auditLogs, type AuditAction, type AuditEntityType, type AuditChange } from "~/server/db/schema-audit";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface AuditLogEntry {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  userId?: string;
  userName?: string;
  deviceId?: string;
  changes?: AuditChange[];
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQueryOptions {
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class AuditService {
  async log(entry: AuditLogEntry): Promise<string> {
    try {
      const [result] = await db
        .insert(auditLogs)
        .values({
          entityType: entry.entityType,
          entityId: entry.entityId,
          action: entry.action,
          userId: entry.userId || null,
          userName: entry.userName || null,
          deviceId: entry.deviceId || null,
          changes: entry.changes || null,
          metadata: entry.metadata || null,
          ipAddress: entry.ipAddress || null,
          userAgent: entry.userAgent || null,
        })
        .returning({ id: auditLogs.id });

      return result.id;
    } catch (error) {
      console.error("[Audit] Failed to write audit log:", error);
      return "";
    }
  }

  async query(options: AuditQueryOptions = {}) {
    const conditions = [];

    if (options.entityType) {
      conditions.push(eq(auditLogs.entityType, options.entityType));
    }
    if (options.entityId) {
      conditions.push(eq(auditLogs.entityId, options.entityId));
    }
    if (options.action) {
      conditions.push(eq(auditLogs.action, options.action));
    }
    if (options.userId) {
      conditions.push(eq(auditLogs.userId, options.userId));
    }
    if (options.startDate) {
      conditions.push(gte(auditLogs.timestamp, options.startDate));
    }
    if (options.endDate) {
      conditions.push(lte(auditLogs.timestamp, options.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(options.limit || 100)
      .offset(options.offset || 0);

    return results;
  }

  async getEntityHistory(entityType: AuditEntityType, entityId: string, limit = 50) {
    return this.query({
      entityType,
      entityId,
      limit,
    });
  }

  async getUserActivity(userId: string, limit = 100) {
    return this.query({
      userId,
      limit,
    });
  }

  async getRecentActivity(limit = 100) {
    return this.query({ limit });
  }

  async getChangesBetween(
    entityType: AuditEntityType,
    entityId: string,
    startDate: Date,
    endDate: Date
  ) {
    return this.query({
      entityType,
      entityId,
      startDate,
      endDate,
    });
  }

  async getStatsByEntity(entityType: AuditEntityType, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        action: auditLogs.action,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.entityType, entityType),
        gte(auditLogs.timestamp, startDate)
      ))
      .groupBy(auditLogs.action);

    return results;
  }

  async getActivityHeatmap(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        hour: sql<number>`extract(hour from timestamp)::int`,
        dayOfWeek: sql<number>`extract(dow from timestamp)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.userId, userId),
        gte(auditLogs.timestamp, startDate)
      ))
      .groupBy(sql`1, 2`);

    return results;
  }

  async trackCreate(
    entityType: AuditEntityType,
    entityId: string,
    data: Record<string, any>,
    user?: { id: string; name: string }
  ) {
    return this.log({
      entityType,
      entityId,
      action: "CREATE",
      userId: user?.id,
      userName: user?.name,
      changes: Object.keys(data).map((key) => ({
        field: key,
        oldValue: null,
        newValue: data[key],
      })),
    });
  }

  async trackUpdate(
    entityType: AuditEntityType,
    entityId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    user?: { id: string; name: string }
  ) {
    const changes: AuditChange[] = [];

    for (const key of Object.keys(newData)) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.push({
          field: key,
          oldValue: oldData[key],
          newValue: newData[key],
        });
      }
    }

    if (changes.length === 0) return;

    return this.log({
      entityType,
      entityId,
      action: "UPDATE",
      userId: user?.id,
      userName: user?.name,
      changes,
    });
  }

  async trackDelete(
    entityType: AuditEntityType,
    entityId: string,
    data: Record<string, any>,
    user?: { id: string; name: string }
  ) {
    return this.log({
      entityType,
      entityId,
      action: "DELETE",
      userId: user?.id,
      userName: user?.name,
      changes: Object.keys(data).map((key) => ({
        field: key,
        oldValue: data[key],
        newValue: null,
      })),
    });
  }

  async trackLogin(userId: string, userName: string, metadata?: Record<string, any>) {
    return this.log({
      entityType: "STAFF",
      entityId: userId,
      action: "LOGIN",
      userId,
      userName,
      metadata,
    });
  }

  async trackLogout(userId: string, userName: string) {
    return this.log({
      entityType: "STAFF",
      entityId: userId,
      action: "LOGOUT",
      userId,
      userName,
    });
  }

  async trackSync(deviceId: string, stats: { transactions: number; expenses: number }) {
    return this.log({
      entityType: "TRANSACTION",
      entityId: `sync-${Date.now()}`,
      action: "SYNC",
      deviceId,
      metadata: stats,
    });
  }

  async trackExport(userId: string, userName: string, format: string) {
    return this.log({
      entityType: "SETTINGS",
      entityId: "export",
      action: "EXPORT",
      userId,
      userName,
      metadata: { format },
    });
  }

  async trackBackup(userId: string, userName: string, size: number) {
    return this.log({
      entityType: "SETTINGS",
      entityId: "backup",
      action: "BACKUP",
      userId,
      userName,
      metadata: { size },
    });
  }

  async trackRestore(userId: string, userName: string, backupId: string) {
    return this.log({
      entityType: "SETTINGS",
      entityId: backupId,
      action: "RESTORE",
      userId,
      userName,
    });
  }
}

export const auditService = new AuditService();
