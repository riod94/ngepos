import { db } from "~/db/db";
import { toast } from "solid-toast";

export const syncService = {
	async pushLocalChanges() {
		const token = localStorage.getItem("auth_token");
		if (!token) return;

		try {
			// 1. Fetch PENDING data from Dexie
			const [pendingTx, pendingExp] = await Promise.all([
				db.transactions.where("status").equals("PENDING").toArray(),
				db.expenses.toArray(), // For now expenses don't have PENDING status in schema, we sync all
			]);

			if (pendingTx.length === 0 && pendingExp.length === 0) return;

			// 2. Fetch Items for pending transactions
			const txWithItems = await Promise.all(
				pendingTx.map(async (tx) => {
					const items = await db.transactionItems.where("transactionId").equals(tx.id).toArray();
					return { ...tx, items };
				})
			);

			// 3. Send to API
			const res = await fetch("/api/sync", {
				method: "POST",
				body: JSON.stringify({
					transactions: txWithItems,
					expenses: pendingExp,
				}),
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			if (res.ok) {
				// 4. Mark as SYNCED in Dexie
				const txIds = pendingTx.map((t) => t.id);
				await db.transactions.where("id").anyOf(txIds).modify({ status: "SYNCED" });
				console.log("✅ Data berhasil disinkronisasi ke VPS.");
			}
		} catch (err) {
			console.error("Sync Service Error:", err);
		}
	},

	// Debounced sync to avoid slamming the server
	_syncTimeout: null as any,
	triggerSync() {
		if (this._syncTimeout) clearTimeout(this._syncTimeout);
		this._syncTimeout = setTimeout(() => {
			this.pushLocalChanges();
		}, 3000); // 3 seconds debounce
	}
};
