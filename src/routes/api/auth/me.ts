import { db } from "~/server/db";
import { staff, roles } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { verifyToken, AuthError } from "~/server/utils/auth";

export async function GET({ request }: { request: Request }) {
	try {
		const payload = await verifyToken(request);
		const userId = payload.sub as string;

		// Fetch fresh data from DB
		const results = await db
			.select({
				id: staff.id,
				name: staff.name,
				email: staff.email,
				phone: staff.phone,
				createdAt: staff.createdAt,
				roleId: staff.roleId,
			})
			.from(staff)
			.where(eq(staff.id, userId))
			.limit(1);

		if (results.length === 0) {
			return Response.json({ error: "User not found" }, { status: 404 });
		}

		const user = results[0];
		
		// Fetch role if exists
		let role = null;
		if (user.roleId) {
			const roleRes = await db.select().from(roles).where(eq(roles.id, user.roleId)).limit(1);
			if (roleRes.length > 0) role = roleRes[0];
		}

		return Response.json({
			user: {
				...user,
				role
			}
		});
	} catch (err) {
		if (err instanceof AuthError) {
			return Response.json({ error: err.message }, { status: err.status });
		}
		console.error("Auth Me API Error:", err);
		return Response.json({ error: "Token tidak valid atau kedaluwarsa" }, { status: 401 });
	}
}
