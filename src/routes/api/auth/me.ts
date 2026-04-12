import { jwtVerify } from "jose";
import { db } from "~/server/db";
import { staff, roles } from "~/server/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
	process.env.JWT_SECRET || "default_super_secret_change_me_ngepos_2024"
);

export async function GET({ request }: { request: Request }) {
	try {
		const authHeader = request.headers.get("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const token = authHeader.split(" ")[1];
		const { payload } = await jwtVerify(token, JWT_SECRET);
		
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
		console.error("Auth Me API Error:", err);
		return Response.json({ error: "Token tidak valid atau kedaluwarsa" }, { status: 401 });
	}
}
