import { jwtVerify } from "jose";
import { db } from "~/server/db";
import { staff } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
		console.error("Change Password Error:", err);
		return Response.json({ error: "Terjadi kesalahan saat mengganti password" }, { status: 500 });
	}
}
