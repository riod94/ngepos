import { db } from "~/server/db";
import { staff, passwordResetTokens } from "~/server/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "~/server/utils/mail";
import { checkRateLimit, getClientIp, rateLimitResponse } from "~/server/utils/rateLimit";

export async function POST({ request }: { request: Request }) {
	try {
		const ip = getClientIp(request);
		if (!checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000)) {
			return rateLimitResponse();
		}

		const { email } = await request.json();

		if (!email || typeof email !== "string") {
			return Response.json({ error: "Email wajib diisi" }, { status: 400 });
		}

		const normalizedEmail = email.toLowerCase().trim();

		// Check if user exists
		const userResult = await db
			.select({ id: staff.id, email: staff.email, isEmailVerified: staff.isEmailVerified })
			.from(staff)
			.where(eq(staff.email, normalizedEmail))
			.limit(1);

		// Always return success to prevent email enumeration
		if (userResult.length === 0) {
			return Response.json({
				success: true,
				message: "Jika email terdaftar, link reset password telah dikirim ke email Anda.",
			});
		}

		// Invalidate any existing unused tokens for this email
		await db
			.update(passwordResetTokens)
			.set({ usedAt: new Date() })
			.where(
				and(
					eq(passwordResetTokens.email, normalizedEmail),
					isNull(passwordResetTokens.usedAt),
				)
			);

		// Generate a secure random token
		const token = randomBytes(32).toString("hex");
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

		// Save token to database
		await db.insert(passwordResetTokens).values({
			email: normalizedEmail,
			token,
			expiresAt,
		});

		// Send reset email
		await sendPasswordResetEmail(normalizedEmail, token);

		return Response.json({
			success: true,
			message: "Jika email terdaftar, link reset password telah dikirim ke email Anda.",
		});
	} catch (error) {
		console.error("Forgot Password Error:", error);
		return Response.json({ error: "Terjadi kesalahan saat memproses permintaan" }, { status: 500 });
	}
}
