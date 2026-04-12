import { db } from "~/server/db";
import { staff } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { sendVerificationEmail } from "~/server/utils/mail";

export async function POST({ request }: { request: Request }) {
	try {
		const { email } = await request.json();

		if (!email) {
			return Response.json({ error: "Email wajib diisi" }, { status: 400 });
		}

		// Find the user
		const existing = await db.select().from(staff).where(eq(staff.email, email)).limit(1);
		
		if (existing.length === 0) {
			return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
		}

		const user = existing[0];
		
		if (user.isEmailVerified) {
			return Response.json({ error: "Email sudah terverifikasi" }, { status: 400 });
		}

		// Generate new OTP
		const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
		const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

		// Update database
		await db.update(staff)
			.set({ otpCode, otpExpiresAt })
			.where(eq(staff.email, email));

		// Send email
		let emailSent = false;
		try {
			emailSent = await sendVerificationEmail(email, otpCode);
		} catch (mailErr) {
			console.error("Mail Error:", mailErr);
		}

		if (!emailSent) {
			return Response.json({ error: "Gagal mengirim email verifikasi" }, { status: 500 });
		}

		return Response.json({ 
			success: true, 
			message: "Kode OTP baru telah dikirim ke email Anda." 
		}, { status: 200 });

	} catch (err) {
		console.error("Resend OTP Error:", err);
		return Response.json({ error: "Terjadi kesalahan server" }, { status: 500 });
	}
}
