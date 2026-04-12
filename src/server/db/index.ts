import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as dotenv from "dotenv";

// Load .env variables immediately
dotenv.config();

// Try multiple sources for DATABASE_URL
const connectionString = process.env.DATABASE_URL || (import.meta as any).env?.DATABASE_URL;

if (!connectionString) {
	console.error("❌ [DB] DATABASE_URL is not defined! Check your .env file.");
	// Fallback for local development if everything fails
	console.log("ℹ️ [DB] Falling back to default local connection...");
} else {
	const URL_MASKED = connectionString.replace(/:\/\/.*@/, "://****:****@");
	console.log(`✅ [DB] Connecting via: ${URL_MASKED}`);
}

const finalConnectionString = connectionString || "postgresql://riodprabowo@localhost:5432/ngepos";

// Disable prefetch for pgbouncer compatibility
const client = postgres(finalConnectionString, { prepare: false });

export const db = drizzle(client, { schema });
