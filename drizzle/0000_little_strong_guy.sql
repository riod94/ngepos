CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"is_backdated" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid,
	"type" text NOT NULL,
	"quantity" real NOT NULL,
	"unit_cost" numeric(20, 2) DEFAULT '0',
	"notes" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modifier_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT 'SINGLE' NOT NULL,
	"max_selectable" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modifier_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" text,
	"name" text NOT NULL,
	"price_modifier" numeric(20, 2) DEFAULT '0' NOT NULL,
	"cogs_modifier" numeric(20, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"material_id" uuid,
	"quantity" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"price" numeric(20, 2) NOT NULL,
	"cogs" numeric(20, 2) DEFAULT '0',
	"stock" real DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"stock" real DEFAULT 0 NOT NULL,
	"average_cost" numeric(20, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"permissions" text[] NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role_id" text,
	"email" text NOT NULL,
	"password" text,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"otp_code" text,
	"otp_expires_at" timestamp,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "transaction_items" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_id" text,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" real NOT NULL,
	"price_at_time" numeric(20, 2) NOT NULL,
	"cogs_at_time" numeric(20, 2) NOT NULL,
	"selected_variants" jsonb
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_number" text NOT NULL,
	"total_amount" numeric(20, 2) NOT NULL,
	"original_amount" numeric(20, 2) NOT NULL,
	"cogs_total" numeric(20, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"status" text DEFAULT 'SYNCED',
	"is_backdated" boolean DEFAULT false,
	"backdated_note" text,
	"discount_total" numeric(20, 2) DEFAULT '0',
	"customer_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_material_id_raw_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."raw_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_group_id_modifier_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_material_id_raw_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."raw_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_expenses_timestamp" ON "expenses" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_transaction_items_product_id" ON "transaction_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_customer_id" ON "transactions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_payment_method" ON "transactions" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX "idx_transactions_timestamp" ON "transactions" USING btree ("timestamp");