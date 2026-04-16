import { db } from "~/server/db";
import { staff } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { verifyToken, AuthError } from "~/server/utils/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "~/server/utils/rateLimit";

export async function POST({ request }: { request: Request }) {
	try {
		const ip = getClientIp(request);
		if (!checkRateLimit(`change-password:${ip}`, 5, 15 * 60 * 1000)) {
			return rateLimitResponse();
		}

		const payload = await verifyToken(request);
		const userId = payload.sub as string;

		const { oldPassword, newPassword } = await request.json();

		if (!oldPassword || !newPassword) {
			return Response.json({ error: "Password lama dan baru wajib diisi" }, { status: 400 });
		}

		if (newPassword.length < 6) {
			return Response.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
		}

		// Fetch current user
		const results = await db
			.select()
			.from(staff)
			.where(eq(staff.id, userId as any))
			.limit(1);

		if (results.length === 0) {
			return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
		}

		const user = results[0];

		// Verify old password
		const isPasswordValid = await bcrypt.compare(oldPassword, user.password!);
		if (!isPasswordValid) {
			return Response.json({ error: "Password lama tidak sesuai" }, { status: 401 });
		}

		// Hash new password
		const hashedNewPassword = await bcrypt.hash(newPassword, 10);

		// Update DB
		await db
			.update(staff)
			.set({
				password: hashedNewPassword,
				updatedAt: new Date(),
			})
			.where(eq(staff.id, userId as any));

		return Response.json({
			success: true,
			message: "Password berhasil diganti",
		});
	} catch (err) {
		if (err instanceof AuthError) {
			return Response.json({ error: err.message }, { status: err.status });
		}
		console.error("Change Password Error:", err);
		return Response.json({ error: "Terjadi kesalahan saat mengganti password" }, { status: 500 });
	}
}
