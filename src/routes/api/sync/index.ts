import { db } from "~/server/db";
import { transactions, transactionItems, expenses } from "~/server/db/schema";
import { jwtVerify } from "jose";
import { sql } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
	process.env.JWT_SECRET || "default_super_secret_change_me_ngepos_2024"
);

export async function POST({ request }: { request: Request }) {
	try {
		// 1. Auth Check
		const authHeader = request.headers.get("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}
		const token = authHeader.split(" ")[1];
		await jwtVerify(token, JWT_SECRET);

		const data = await request.json();
		const { transactions: txList, expenses: expList } = data;

		// 2. Transactional Insertion
		await db.transaction(async (tx) => {
			// Process Transactions & Items
			if (txList && txList.length > 0) {
				for (const t of txList) {
					// Prepare transaction data (Postgres compatible)
					const txData = {
						id: t.id,
						receiptNumber: t.receiptNumber,
						totalAmount: String(t.totalAmount),
						originalAmount: String(t.originalAmount),
						cogsTotal: String(t.cogsTotal),
						paymentMethod: t.paymentMethod,
						timestamp: new Date(t.timestamp),
						status: "SYNCED" as const,
						isBackdated: t.isBackdated || false,
						backdatedNote: t.backdatedNote,
						discountTotal: String(t.discountTotal || 0),
						customerId: t.customerId,
					};

					// Upsert Transaction
					await tx.insert(transactions).values(txData).onConflictDoUpdate({
						target: transactions.id,
						set: txData,
					});

					// Fetch items for this transaction from the payload if provided
					// For now, we assume items are part of the transaction object in the sync payload
					if (t.items && t.items.length > 0) {
						for (const item of t.items) {
							const itemData = {
								id: item.id,
								transactionId: t.id,
								productId: item.productId,
								productName: item.productName,
								quantity: Number(item.quantity),
								priceAtTime: String(item.priceAtTime),
								cogsAtTime: String(item.cogsAtTime),
								selectedVariants: item.selectedVariants,
							};
							await tx.insert(transactionItems).values(itemData).onConflictDoUpdate({
								target: transactionItems.id,
								set: itemData,
							});
						}
					}
				}
			}

			// Process Expenses
			if (expList && expList.length > 0) {
				for (const e of expList) {
					const expData = {
						id: e.id,
						amount: String(e.amount),
						category: e.category,
						description: e.description,
						timestamp: new Date(e.timestamp),
						isBackdated: e.isBackdated || false,
					};
					await tx.insert(expenses).values(expData).onConflictDoUpdate({
						target: expenses.id,
						set: expData,
					});
				}
			}
		});

		return Response.json({ success: true });
	} catch (err) {
		console.error("Sync API Error:", err);
		return Response.json({ error: "Gagal melakukan sinkronisasi" }, { status: 500 });
	}
}
