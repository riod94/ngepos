import { pgTable, text, integer, boolean, timestamp, uuid, real, decimal, jsonb } from "drizzle-orm/pg-core";

// ─── ROLES ──────────────────────────────────────────────────────────────────
export const roles = pgTable("roles", {
	id: text("id").primaryKey(), // Using text to match admin/kasir static IDs
	name: text("name").notNull(),
	permissions: text("permissions").array().notNull(), // PostgreSQL array of strings
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── STAFF ──────────────────────────────────────────────────────────────────
export const staff = pgTable("staff", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	roleId: text("role_id").references(() => roles.id),
	email: text("email").notNull().unique(),
	password: text("password"),
	isEmailVerified: boolean("is_email_verified").default(false).notNull(),
	otpCode: text("otp_code"),
	otpExpiresAt: timestamp("otp_expires_at"),
	phone: text("phone"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── SETTINGS ───────────────────────────────────────────────────────────────
export const settings = pgTable("settings", {
	key: text("key").primaryKey(),
	value: text("value").notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── TRANSACTIONS ──────────────────────────────────────────────────────────
export const transactions = pgTable("transactions", {
	id: uuid("id").primaryKey(), // UUID from client
	receiptNumber: text("receipt_number").notNull(),
	totalAmount: decimal("total_amount", { precision: 20, scale: 2 }).notNull(),
	originalAmount: decimal("original_amount", { precision: 20, scale: 2 }).notNull(),
	cogsTotal: decimal("cogs_total", { precision: 20, scale: 2 }).notNull(),
	paymentMethod: text("payment_method").notNull(),
	timestamp: timestamp("timestamp").notNull(),
	status: text("status", { enum: ["PENDING", "SYNCED"] }).default("SYNCED"),
	isBackdated: boolean("is_backdated").default(false),
	backdatedNote: text("backdated_note"),
	discountTotal: decimal("discount_total", { precision: 20, scale: 2 }).default("0"),
	customerId: text("customer_id"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── TRANSACTION ITEMS ──────────────────────────────────────────────────────
export const transactionItems = pgTable("transaction_items", {
	id: uuid("id").primaryKey(),
	transactionId: uuid("transaction_id").references(() => transactions.id, { onDelete: "cascade" }),
	productId: text("product_id").notNull(),
	productName: text("product_name").notNull(),
	quantity: real("quantity").notNull(),
	priceAtTime: decimal("price_at_time", { precision: 20, scale: 2 }).notNull(),
	cogsAtTime: decimal("cogs_at_time", { precision: 20, scale: 2 }).notNull(),
	selectedVariants: jsonb("selected_variants"),
});

// ─── EXPENSES ───────────────────────────────────────────────────────────────
export const expenses = pgTable("expenses", {
	id: uuid("id").primaryKey(),
	amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
	category: text("category").notNull(),
	description: text("description").notNull(),
	timestamp: timestamp("timestamp").notNull(),
	isBackdated: boolean("is_backdated").default(false),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
