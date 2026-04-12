import { db } from "./index";
import { roles } from "./schema";
import { eq } from "drizzle-orm";

export async function seedRoles() {
	console.log("Checking for default roles...");
	
	const defaultRoles = [
		{
			id: "admin",
			name: "Owner / Admin",
			permissions: ["all"],
		},
		{
			id: "kasir",
			name: "Kasir",
			permissions: ["pos", "transactions.view"],
		}
	];

	for (const role of defaultRoles) {
		const existing = await db.select().from(roles).where(eq(roles.id, role.id)).limit(1);
		
		if (existing.length === 0) {
			console.log(`Seeding role: ${role.id}`);
			await db.insert(roles).values({
				id: role.id,
				name: role.name,
				permissions: role.permissions,
			});
		}
	}
	
	console.log("Role seeding completed.");
}

// Allow running via script
if (import.meta.main) {
	seedRoles().catch(console.error);
}
