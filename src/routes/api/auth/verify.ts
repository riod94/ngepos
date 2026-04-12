import { db } from "~/server/db";
import { staff } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST({ request }: { request: Request }) {
	try {
		const { email, otpCode } = await request.json();

		if (!email || !otpCode) {
			return Response.json({ error: "Email dan kode OTP wajib diisi" }, { status: 400 });
		}

		// Look for the user with the given email
		const existing = await db.select().from(staff).where(eq(staff.email, email)).limit(1);
		
		if (existing.length === 0) {
			return Response.json({ error: "User tidak ditemukan" }, { status: 404 });
		}

		const user = existing[0];

		// Check if already verified
		if (user.isEmailVerified) {
			return Response.json({ message: "Email sudah terverifikasi. Silakan login." }, { status: 200 });
		}

		// Validate OTP
		if (user.otpCode !== otpCode) {
			return Response.json({ error: "Kode OTP tidak valid" }, { status: 400 });
		}

		// Check expiry
		if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
			return Response.json({ error: "Kode OTP telah kadaluarsa" }, { status: 400 });
		}

		// Update user as verified
		await db.update(staff)
			.set({ 
				isEmailVerified: true, 
				otpCode: null, 
				otpExpiresAt: null 
			})
			.where(eq(staff.email, email));

		return Response.json({ 
			success: true, 
			message: "Verifikasi berhasil! Akun Anda kini aktif." 
		}, { status: 200 });

	} catch (err) {
		console.error("Verify Error:", err);
		return Response.json({ error: "Terjadi kesalahan server saat verifikasi" }, { status: 500 });
	}
}
