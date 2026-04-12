CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"is_backdated" boolean DEFAULT false,
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
	"pin" text NOT NULL,
	"email" text,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"transaction_id" uuid,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" real NOT NULL,
	"price_at_time" numeric(20, 2) NOT NULL,
	"cogs_at_time" numeric(20, 2) NOT NULL,
	"selected_variants" jsonb
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
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
ALTER TABLE "staff" ADD CONSTRAINT "staff_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;