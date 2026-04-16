import { pgTable, text, integer, boolean, timestamp, uuid, real, decimal, jsonb, index } from "drizzle-orm/pg-core";

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
	roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
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
	id: text("id").primaryKey(), // ID from client (flexible)
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
	cashierName: text("cashier_name"),
	isAdjustment: boolean("is_adjustment").default(false),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
	index("idx_transactions_customer_id").on(table.customerId),
	index("idx_transactions_payment_method").on(table.paymentMethod),
	index("idx_transactions_timestamp").on(table.timestamp),
]);

// ─── TRANSACTION ITEMS ──────────────────────────────────────────────────────
export const transactionItems = pgTable("transaction_items", {
	id: text("id").primaryKey(),
	transactionId: text("transaction_id").references(() => transactions.id, { onDelete: "cascade" }),
	productId: text("product_id").notNull(),
	productName: text("product_name").notNull(),
	quantity: real("quantity").notNull(),
	priceAtTime: decimal("price_at_time", { precision: 20, scale: 2 }).notNull(),
	cogsAtTime: decimal("cogs_at_time", { precision: 20, scale: 2 }).notNull(),
	selectedVariants: jsonb("selected_variants"),
}, (table) => [
	index("idx_transaction_items_product_id").on(table.productId),
]);

// ─── EXPENSES ───────────────────────────────────────────────────────────────
export const expenses = pgTable("expenses", {
	id: text("id").primaryKey(),
	amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
	category: text("category").notNull(),
	description: text("description").notNull(),
	timestamp: timestamp("timestamp").notNull(),
	isBackdated: boolean("is_backdated").default(false),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
	index("idx_expenses_timestamp").on(table.timestamp),
]);

// ─── PRODUCTS ───────────────────────────────────────────────────────────────
export const products = pgTable("products", {
	id: text("id").primaryKey(), // dexie id
	name: text("name").notNull(),
	category: text("category").notNull(),
	price: decimal("price", { precision: 20, scale: 2 }).notNull(),
	cogs: decimal("cogs", { precision: 20, scale: 2 }).default("0"),
	stock: real("stock").default(0),
	isActive: boolean("is_active").default(true).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── INVENTORY & RAW MATERIALS ──────────────────────────────────────────────
export const rawMaterials = pgTable("raw_materials", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	unit: text("unit").notNull(), // Smallest unit (e.g., 'gram', 'ml', 'pcs')
	stock: real("stock").default(0).notNull(),
	averageCost: decimal("average_cost", { precision: 20, scale: 2 }).default("0").notNull(),
	isActive: boolean("is_active").default(true).notNull(), // ADDED
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── MODIFIERS / VARIATIONS ──────────────────────────────────────────────────
export const modifierGroups = pgTable("modifier_groups", {
	id: text("id").primaryKey(), // dexie id
	name: text("name").notNull(),
	isRequired: boolean("is_required").default(false).notNull(),
	type: text("type", { enum: ["SINGLE", "MULTIPLE"] }).default("SINGLE").notNull(),
	maxSelectable: integer("max_selectable"),
	isActive: boolean("is_active").default(true).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const modifierOptions = pgTable("modifier_options", {
	id: uuid("id").defaultRandom().primaryKey(),
	groupId: text("group_id").references(() => modifierGroups.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	priceModifier: decimal("price_modifier", { precision: 20, scale: 2 }).default("0").notNull(),
	cogsModifier: decimal("cogs_modifier", { precision: 20, scale: 2 }).default("0").notNull(),
});

export const productIngredients = pgTable("product_ingredients", {
	id: uuid("id").defaultRandom().primaryKey(),
	productId: text("product_id").notNull(), // External product ID from Dexie
	materialId: uuid("material_id").references(() => rawMaterials.id, { onDelete: "cascade" }),
	quantity: real("quantity").notNull(), // Quantity needed for 1 portion
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryLogs = pgTable("inventory_logs", {
	id: uuid("id").defaultRandom().primaryKey(),
	materialId: uuid("material_id").references(() => rawMaterials.id, { onDelete: "cascade" }),
	type: text("type", { enum: ["IN", "OUT", "ADJUSTMENT"] }).notNull(),
	quantity: real("quantity").notNull(), // Positive amount changed
	unitCost: decimal("unit_cost", { precision: 20, scale: 2 }).default("0"), // Cost per unit during purchase
	notes: text("notes"),
	timestamp: timestamp("timestamp").defaultNow().notNull(),
});
