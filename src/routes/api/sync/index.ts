import { db } from "~/server/db";
import { transactions, transactionItems, expenses } from "~/server/db/schema";
import { verifyPermission, AuthError } from "~/server/utils/auth";
import { safeParseJson, isValidSyncTransaction, isValidTransactionItem, isValidSyncExpense } from "~/server/utils/validation";
import { checkRateLimit, getClientIp, rateLimitResponse } from "~/server/utils/rateLimit";
import { createLogger } from "~/server/utils/logger";

const log = createLogger("api:sync");

export async function POST({ request }: { request: Request }) {
	const startTime = Date.now();
	try {
		// 0. Rate limit: 20 syncs per minute per IP
		const ip = getClientIp(request);
		if (!checkRateLimit(`sync:${ip}`, 20, 60 * 1000)) {
			log.warn("Rate limit exceeded", { ip });
			return rateLimitResponse();
		}

		// 1. Auth Check
		await verifyPermission(request, "VIEW_TRANSACTIONS");

		// 2. Parse and validate JSON
		const { data, error: parseError } = await safeParseJson(request);
		if (parseError) return parseError;

		const { transactions: txList, expenses: expList } = data;

		// 3. Validate payload structure
		if (txList && !Array.isArray(txList)) {
			return Response.json({ error: "transactions harus berupa array" }, { status: 400 });
		}
		if (expList && !Array.isArray(expList)) {
			return Response.json({ error: "expenses harus berupa array" }, { status: 400 });
		}

		if ((!txList || txList.length === 0) && (!expList || expList.length === 0)) {
			return Response.json({ error: "Tidak ada data untuk disinkronisasi" }, { status: 400 });
		}

		// 4. Validate individual items
		if (txList) {
			for (let i = 0; i < txList.length; i++) {
				if (!isValidSyncTransaction(txList[i])) {
					return Response.json({ 
						error: `Transaction index ${i} tidak valid (missing/invalid fields)` 
					}, { status: 400 });
				}
				if (txList[i].items && Array.isArray(txList[i].items)) {
					for (let j = 0; j < txList[i].items.length; j++) {
						if (!isValidTransactionItem(txList[i].items[j])) {
							return Response.json({ 
								error: `Transaction ${i} item ${j} tidak valid` 
							}, { status: 400 });
						}
					}
				}
			}
		}

		if (expList) {
			for (let i = 0; i < expList.length; i++) {
				if (!isValidSyncExpense(expList[i])) {
					return Response.json({ 
						error: `Expense index ${i} tidak valid (missing/invalid fields)` 
					}, { status: 400 });
				}
			}
		}

		// 5. Transactional Insertion
		await db.transaction(async (tx) => {
			// Process Transactions & Items
			if (txList && txList.length > 0) {
				for (const t of txList) {
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
						cashierName: t.cashierName,
						isAdjustment: t.isAdjustment || false,
					};

					await tx.insert(transactions).values(txData).onConflictDoUpdate({
						target: transactions.id,
						set: txData,
					});

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

		const txCount = txList?.length ?? 0;
		const expCount = expList?.length ?? 0;
		log.apiRequest("POST", "/api/sync", 200, Date.now() - startTime, { txCount, expCount });
		return Response.json({ success: true });
	} catch (err) {
		if (err instanceof AuthError) {
			log.warn("Auth error on sync", { status: err.status });
			return Response.json({ error: err.message }, { status: err.status });
		}
		log.error("Sync API Error", { error: err instanceof Error ? err.message : "Unknown", durationMs: Date.now() - startTime });
		const message = err instanceof Error ? err.message : "Unknown error";
		return Response.json({
			error: "Gagal melakukan sinkronisasi",
			detail: message
		}, { status: 500 });
	}
}
