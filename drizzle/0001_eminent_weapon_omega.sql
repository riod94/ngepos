ALTER TABLE "transactions" ADD COLUMN "cashier_name" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_adjustment" boolean DEFAULT false;