import { pgTable, text, uuid, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VIEW"
  | "LOGIN"
  | "LOGOUT"
  | "SYNC"
  | "EXPORT"
  | "IMPORT"
  | "BACKUP"
  | "RESTORE";

export type AuditEntityType =
  | "PRODUCT"
  | "TRANSACTION"
  | "EXPENSE"
  | "CUSTOMER"
  | "STAFF"
  | "ROLE"
  | "CATEGORY"
  | "SETTINGS"
  | "LOYALTY_PROGRAM"
  | "CAMPAIGN"
  | "RAW_MATERIAL"
  | "INVENTORY_LOG";

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: text("entity_type", {
    enum: [
      "PRODUCT",
      "TRANSACTION",
      "EXPENSE",
      "CUSTOMER",
      "STAFF",
      "ROLE",
      "CATEGORY",
      "SETTINGS",
      "LOYALTY_PROGRAM",
      "CAMPAIGN",
      "RAW_MATERIAL",
      "INVENTORY_LOG",
    ],
  }).notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action", {
    enum: [
      "CREATE",
      "UPDATE",
      "DELETE",
      "VIEW",
      "LOGIN",
      "LOGOUT",
      "SYNC",
      "EXPORT",
      "IMPORT",
      "BACKUP",
      "RESTORE",
    ],
  }).notNull(),
  userId: text("user_id"),
  userName: text("user_name"),
  deviceId: text("device_id"),
  changes: jsonb("changes").$type<AuditChange[]>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_logs_entity").on(table.entityType, table.entityId),
  index("idx_audit_logs_user").on(table.userId),
  index("idx_audit_logs_timestamp").on(table.timestamp),
  index("idx_audit_logs_action").on(table.action),
]);
