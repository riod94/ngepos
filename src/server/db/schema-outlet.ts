import { pgTable, text, uuid, boolean, timestamp, decimal, jsonb, index } from "drizzle-orm/pg-core";

export const outlets = pgTable("outlets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").default(true).notNull(),
  isHeadquarters: boolean("is_headquarters").default(false).notNull(),
  settings: jsonb("settings").$type<{
    currency?: string;
    timezone?: string;
    taxRate?: number;
    receiptFooter?: string;
    operatingHours?: { open: string; close: string };
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_outlets_code").on(table.code),
  index("idx_outlets_active").on(table.isActive),
]);

export const userOutlets = pgTable("user_outlets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }).notNull(),
  role: text("role", { enum: ["OWNER", "MANAGER", "CASHIER"] }).notNull().default("CASHIER"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_outlets_user").on(table.userId),
  index("idx_user_outlets_outlet").on(table.outletId),
]);

export const outletSyncQueue = pgTable("outlet_sync_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  outletId: uuid("outlet_id").references(() => outlets.id, { onDelete: "cascade" }).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action", { enum: ["CREATE", "UPDATE", "DELETE"] }).notNull(),
  data: jsonb("data"),
  status: text("status", { enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] }).default("PENDING").notNull(),
  priority: text("priority", { enum: ["LOW", "NORMAL", "HIGH", "CRITICAL"] }).default("NORMAL").notNull(),
  retryCount: decimal("retry_count", { precision: 3, scale: 0 }).default("0").notNull(),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_outlet_sync_queue_outlet").on(table.outletId),
  index("idx_outlet_sync_queue_status").on(table.status),
  index("idx_outlet_sync_queue_priority").on(table.priority),
]);
