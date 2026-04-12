import { jwtVerify } from "jose";
import { db } from "~/server/db";
import { staff } from "~/server/db/schema";
import { eq, and, ne } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
	process.env.JWT_SECRET || "default_super_secret_change_me_ngepos_2024"
);

export async function POST({ request }: { request: Request }) {
	try {
		const authHeader = request.headers.get("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const token = authHeader.split(" ")[1];
		const { payload } = await jwtVerify(token, JWT_SECRET);
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
		console.error("Update Profile Error:", err);
		return Response.json({ error: "Terjadi kesalahan saat memperbarui profil" }, { status: 500 });
	}
}
