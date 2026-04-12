import { db } from "~/server/db";
import { staff, roles } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
	process.env.JWT_SECRET || "default_super_secret_change_me"
);

export async function POST({ request }: { request: Request }) {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return Response.json({ error: "Email & Password wajib" }, { status: 400 });
		}

		const results = await db.select().from(staff).where(eq(staff.email, email)).limit(1);
		if (results.length === 0) {
			return Response.json({ error: "Akun tidak ditemukan" }, { status: 401 });
		}

		const user = results[0];
		if (!user.isActive) return Response.json({ error: "Akun nonaktif" }, { status: 403 });
		if (!user.isEmailVerified) {
			return Response.json({ error: "Email belum verifikasi", requireVerification: true, email: user.email }, { status: 403 });
		}

		// Use bcryptjs compare instead of Bun.password.verify
		const isPasswordValid = await bcrypt.compare(password, user.password!);
		if (!isPasswordValid) return Response.json({ error: "Password salah" }, { status: 401 });

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

		return Response.json({
			token,
			user: { id: user.id, name: user.name, email: user.email, role: userRole }
		});
	} catch (err) {
		console.error("Login Error:", err);
		return Response.json({ error: "Server Error" }, { status: 500 });
	}
}
