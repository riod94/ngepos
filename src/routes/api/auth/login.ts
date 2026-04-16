import { db } from "~/server/db";
import { staff, roles } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp, rateLimitResponse } from "~/server/utils/rateLimit";
import { JWT_SECRET } from "~/server/utils/auth";
import { isValidEmail, safeParseJson } from "~/server/utils/validation";
import { createLogger } from "~/server/utils/logger";

const log = createLogger("api:auth:login");

export async function POST({ request }: { request: Request }) {
	const startTime = Date.now();
	try {
		const ip = getClientIp(request);
		if (!checkRateLimit(`login:${ip}`, 5, 60 * 1000)) {
			log.warn("Rate limit exceeded", { ip });
			return rateLimitResponse();
		}

		const { data, error: parseError } = await safeParseJson(request);
		if (parseError) return parseError;

		const { email, password } = data;

		if (!email || !password) {
			return Response.json({ error: "Email & Password wajib" }, { status: 400 });
		}

		if (!isValidEmail(email)) {
			return Response.json({ error: "Format email tidak valid" }, { status: 400 });
		}

		const results = await db.select().from(staff).where(eq(staff.email, email)).limit(1);
		if (results.length === 0) {
			log.info("Login failed: account not found", { email });
			return Response.json({ error: "Akun tidak ditemukan" }, { status: 401 });
		}

		const user = results[0];
		if (!user.isActive) {
			log.warn("Login failed: account inactive", { email });
			return Response.json({ error: "Akun nonaktif" }, { status: 403 });
		}
		if (!user.isEmailVerified) {
			log.warn("Login failed: email not verified", { email });
			return Response.json({ error: "Email belum verifikasi", requireVerification: true, email: user.email }, { status: 403 });
		}

		// Use bcryptjs compare instead of Bun.password.verify
		const isPasswordValid = await bcrypt.compare(password, user.password!);
		if (!isPasswordValid) {
			log.warn("Login failed: wrong password", { email });
			return Response.json({ error: "Password salah" }, { status: 401 });
		}

		let userRole = null;
		if (user.roleId) {
			const roleRes = await db.select().from(roles).where(eq(roles.id, user.roleId)).limit(1);
			if (roleRes.length > 0) userRole = roleRes[0];
		}

		const token = await new SignJWT({ sub: user.id, name: user.name, role: userRole })
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt()
			.setExpirationTime("30d")
			.sign(JWT_SECRET);

		log.apiRequest("POST", "/api/auth/login", 200, Date.now() - startTime, { userId: user.id });
		return Response.json({
			token,
			user: { id: user.id, name: user.name, email: user.email, role: userRole }
		});
	} catch (err) {
		log.error("Login Error", { error: err instanceof Error ? err.message : "Unknown" });
		return Response.json({ error: "Server Error" }, { status: 500 });
	}
}
