import { db } from "~/server/db";
import { staff } from "~/server/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { verifyToken, AuthError } from "~/server/utils/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "~/server/utils/rateLimit";

export async function POST({ request }: { request: Request }) {
	try {
		const ip = getClientIp(request);
		if (!checkRateLimit(`update-profile:${ip}`, 10, 60 * 1000)) {
			return rateLimitResponse();
		}

		const payload = await verifyToken(request);
		const userId = payload.sub as string;

		const { name, email, phone } = await request.json();

		if (!name || !email) {
			return Response.json({ error: "Nama dan Email wajib diisi" }, { status: 400 });
		}

		// Check if email is already taken by another user
		const existingEmail = await db
			.select()
			.from(staff)
			.where(and(eq(staff.email, email), ne(staff.id, userId as any)))
			.limit(1);

		if (existingEmail.length > 0) {
			return Response.json({ error: "Email sudah digunakan oleh akun lain" }, { status: 400 });
		}

		// Update profile
		await db
			.update(staff)
			.set({
				name,
				email,
				phone,
				updatedAt: new Date(),
			})
			.where(eq(staff.id, userId as any));

		return Response.json({
			success: true,
			message: "Profil berhasil diperbarui",
		});
	} catch (err) {
		if (err instanceof AuthError) {
			return Response.json({ error: err.message }, { status: err.status });
		}
		console.error("Update Profile Error:", err);
		return Response.json({ error: "Terjadi kesalahan saat memperbarui profil" }, { status: 500 });
	}
}
