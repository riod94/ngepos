import { db } from "~/server/db";
import { staff, passwordResetTokens } from "~/server/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp, rateLimitResponse } from "~/server/utils/rateLimit";

export async function POST({ request }: { request: Request }) {
	try {
		const ip = getClientIp(request);
		if (!checkRateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000)) {
			return rateLimitResponse();
		}

		const { token, newPassword } = await request.json();

		if (!token || typeof token !== "string") {
			return Response.json({ error: "Token reset password tidak valid" }, { status: 400 });
		}

		if (!newPassword || typeof newPassword !== "string") {
			return Response.json({ error: "Password baru wajib diisi" }, { status: 400 });
		}

		if (newPassword.length < 6) {
			return Response.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
		}

		// Find valid token (not used, not expired)
		const tokenResult = await db
			.select()
			.from(passwordResetTokens)
			.where(
				and(
					eq(passwordResetTokens.token, token),
					isNull(passwordResetTokens.usedAt),
					gt(passwordResetTokens.expiresAt, new Date()),
				)
			)
			.limit(1);

		if (tokenResult.length === 0) {
			return Response.json({ error: "Token reset password tidak valid atau sudah kedaluwarsa. Silakan request ulang." }, { status: 400 });
		}

		const resetToken = tokenResult[0];

		// Find user by email
		const userResult = await db
			.select()
			.from(staff)
			.where(eq(staff.email, resetToken.email))
			.limit(1);

		if (userResult.length === 0) {
			return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
		}

		// Hash new password
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		// Update password
		await db
			.update(staff)
			.set({
				password: hashedPassword,
				updatedAt: new Date(),
			})
			.where(eq(staff.id, userResult[0].id));

		// Mark token as used
		await db
			.update(passwordResetTokens)
			.set({ usedAt: new Date() })
			.where(eq(passwordResetTokens.id, resetToken.id));

		return Response.json({
			success: true,
			message: "Password berhasil direset. Silakan login dengan password baru Anda.",
		});
	} catch (error) {
		console.error("Reset Password Error:", error);
		return Response.json({ error: "Terjadi kesalahan saat mereset password" }, { status: 500 });
	}
}
