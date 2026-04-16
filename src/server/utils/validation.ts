/**
 * Shared validation utilities for API endpoints.
 * Centralizes common validation patterns to ensure consistency.
 */

/** Validate email format using a standard regex */
export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate that a string is non-empty and within length bounds */
export function isValidString(value: unknown, minLength = 1, maxLength = 255): boolean {
	return typeof value === "string" && value.trim().length >= minLength && value.trim().length <= maxLength;
}

/** Validate that a value is a positive number */
export function isValidPositiveNumber(value: unknown): boolean {
	return typeof value === "number" && isFinite(value) && value >= 0;
}

/** Validate that a value is a non-empty array */
export function isValidNonEmptyArray(value: unknown): boolean {
	return Array.isArray(value) && value.length > 0;
}

/** Validate password strength (min 6 chars) */
export function isValidPassword(password: string): { valid: boolean; error?: string } {
	if (password.length < 6) {
		return { valid: false, error: "Password minimal 6 karakter" };
	}
	if (password.length > 128) {
		return { valid: false, error: "Password maksimal 128 karakter" };
	}
	return { valid: true };
}

/** Safely parse JSON from request, with error handling */
export async function safeParseJson(request: Request): Promise<{ data: any | null; error: Response | null }> {
	try {
		const text = await request.text();
		if (!text || text.trim().length === 0) {
			return { data: null, error: Response.json({ error: "Request body kosong" }, { status: 400 }) };
		}
		const data = JSON.parse(text);
		return { data, error: null };
	} catch {
		return { data: null, error: Response.json({ error: "Format JSON tidak valid" }, { status: 400 }) };
	}
}

/** Validate sync transaction item structure */
export function isValidTransactionItem(item: any): boolean {
	return (
		item &&
		typeof item.id === "string" && item.id.trim() !== "" &&
		typeof item.productId === "string" && item.productId.trim() !== "" &&
		typeof item.productName === "string" && item.productName.trim() !== "" &&
		typeof item.quantity === "number" && item.quantity > 0 &&
		typeof item.priceAtTime === "number" &&
		typeof item.cogsAtTime === "number"
	);
}

/** Validate sync transaction structure */
export function isValidSyncTransaction(tx: any): boolean {
	return (
		tx &&
		typeof tx.id === "string" && tx.id.trim() !== "" &&
		typeof tx.receiptNumber === "string" && tx.receiptNumber.trim() !== "" &&
		typeof tx.totalAmount === "number" &&
		typeof tx.originalAmount === "number" &&
		typeof tx.cogsTotal === "number" &&
		typeof tx.paymentMethod === "string" && tx.paymentMethod.trim() !== "" &&
		typeof tx.timestamp === "number" && tx.timestamp > 0
	);
}

/** Validate sync expense structure */
export function isValidSyncExpense(exp: any): boolean {
	return (
		exp &&
		typeof exp.id === "string" && exp.id.trim() !== "" &&
		typeof exp.amount === "number" && exp.amount >= 0 &&
		typeof exp.category === "string" && exp.category.trim() !== "" &&
		typeof exp.description === "string" &&
		typeof exp.timestamp === "number" && exp.timestamp > 0
	);
}
