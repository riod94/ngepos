import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import { db } from "~/server/db";
import { staff, roles } from "~/server/db/schema";
import { eq } from "drizzle-orm";

const secret = process.env.JWT_SECRET;
if (!secret) {
	throw new Error("FATAL: JWT_SECRET environment variable is not set. Please set JWT_SECRET in your .env file.");
}
export const JWT_SECRET = new TextEncoder().encode(secret);

export class AuthError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}

/** Verify Bearer token from request, return JWT payload */
export async function verifyToken(request: Request): Promise<JWTPayload> {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		throw new AuthError("Unauthorized", 401);
	}
	const token = authHeader.split(" ")[1];
	const { payload } = await jwtVerify(token, JWT_SECRET);
	return payload;
}

/** Verify token + check that user has the specified permission. Admin role bypasses. */
export async function verifyPermission(request: Request, permission: string): Promise<JWTPayload> {
	const payload = await verifyToken(request);
	const userId = payload.sub as string;

	const userResult = await db.select({ roleId: staff.roleId })
		.from(staff).where(eq(staff.id, userId)).limit(1);
	if (userResult.length === 0) throw new AuthError("User not found", 404);

	const user = userResult[0];
	if (user.roleId === "admin") return payload; // admin bypass

	if (user.roleId) {
		const roleResult = await db.select().from(roles)
			.where(eq(roles.id, user.roleId)).limit(1);
		if (roleResult.length > 0 && roleResult[0].permissions.includes(permission)) {
			return payload;
		}
	}
	throw new AuthError("Forbidden: insufficient permissions", 403);
}
