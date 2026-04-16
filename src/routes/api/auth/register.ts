import { db } from "~/server/db";
import { staff } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { sendVerificationEmail } from "~/server/utils/mail";
import { seedRoles } from "~/server/db/seed";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp, rateLimitResponse } from "~/server/utils/rateLimit";
import { isValidEmail, isValidString, isValidPassword, safeParseJson } from "~/server/utils/validation";

export async function POST({ request }: { request: Request }) {
	try {
		const ip = getClientIp(request);
		if (!checkRateLimit(`register:${ip}`, 3, 15 * 60 * 1000)) {
			return rateLimitResponse();
		}

		const { data, error: parseError } = await safeParseJson(request);
		if (parseError) return parseError;

		const { name, email, password } = data;

		if (!isValidString(name, 2, 100)) {
			return Response.json({ error: "Nama harus 2-100 karakter" }, { status: 400 });
		}
		if (!isValidEmail(email)) {
			return Response.json({ error: "Format email tidak valid" }, { status: 400 });
		}
		const pwCheck = isValidPassword(password);
		if (!pwCheck.valid) {
			return Response.json({ error: pwCheck.error }, { status: 400 });
		}

		await seedRoles();

		const existing = await db.select().from(staff).where(eq(staff.email, email)).limit(1);
		if (existing.length > 0) {
			return Response.json({ error: "Email sudah terdaftar" }, { status: 400 });
		}

		// Use bcryptjs for universal runtime compatibility
		const hashedPassword = await bcrypt.hash(password, 10);
		
		const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
		const hashedOtp = await bcrypt.hash(otpCode, 10);
		const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); 

		await db.insert(staff).values({
			name,
			email,
			password: hashedPassword,
			roleId: "admin", 
			isActive: true, 
			isEmailVerified: false,
			otpCode: hashedOtp,
			otpExpiresAt,
		});

		let emailSent = false;
		try {
			emailSent = await sendVerificationEmail(email, otpCode);
		} catch (mailErr) {
			console.error("Mail Error:", mailErr);
		}

		return Response.json({ 
			success: true, 
			message: emailSent ? "Registrasi berhasil! Cek email." : "Akun dibuat, email gagal kirim.",
			requireVerification: true,
			email 
		}, { status: emailSent ? 201 : 200 });

	} catch (err) {
		console.error("Register Error:", err);
		return Response.json({ error: "Terjadi kesalahan server" }, { status: 500 });
	}
}
