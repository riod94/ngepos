import { db } from "~/db/db";
import { toast } from "solid-toast";

const MAX_RETRY_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000; // 1 second base for exponential backoff
const DEBOUNCE_MS = 3000; // 3 seconds debounce

export const syncService = {
	_retryCount: 0,
	_isSyncing: false,

	async pushLocalChanges(): Promise<boolean> {
		const token = localStorage.getItem("auth_token");
		if (!token) return false;

		if (this._isSyncing) return false;
		this._isSyncing = true;

		try {
			// 1. Fetch PENDING data from Dexie
			const [pendingTx, pendingExp] = await Promise.all([
				db.transactions.where("status").equals("PENDING").toArray(),
				db.expenses.toArray(), // For now expenses don't have PENDING status in schema, we sync all
			]);

			if (pendingTx.length === 0 && pendingExp.length === 0) {
				this._retryCount = 0; // Reset on successful empty state
				return true;
			}

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
				this._retryCount = 0; // Reset retry count on success
				return true;
			}

			// Handle auth errors — don't retry, just log out
			if (res.status === 401 || res.status === 403) {
				console.warn("[Sync] Auth error, skipping retry.");
				return false;
			}

			// Server error — trigger retry with backoff
			return this._handleRetry();

		} catch (err) {
			console.error("Sync Service Error:", err);
			return this._handleRetry();
		} finally {
			this._isSyncing = false;
		}
	},

	/**
	 * Handle retry with exponential backoff.
	 * Returns false if max retries exceeded, true if retry was scheduled.
	 */
	_handleRetry(): boolean {
		this._retryCount++;

		if (this._retryCount > MAX_RETRY_ATTEMPTS) {
			console.error(`[Sync] Max retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded. Giving up.`);
			toast.error("Sinkronisasi gagal setelah beberapa percobaan. Data tersimpan lokal.", { duration: 5000 });
			this._retryCount = 0; // Reset for next manual sync
			return false;
		}

		// Exponential backoff: BASE_DELAY * 2^(retryCount-1) + jitter
		const delay = BASE_DELAY_MS * Math.pow(2, this._retryCount - 1) + Math.random() * 500;
		console.warn(`[Sync] Retry ${this._retryCount}/${MAX_RETRY_ATTEMPTS} in ${Math.round(delay)}ms`);

		setTimeout(() => {
			this.pushLocalChanges();
		}, delay);

		return true;
	},

	// Debounced sync to avoid slamming the server
	_syncTimeout: null as any,
	triggerSync() {
		if (this._syncTimeout) clearTimeout(this._syncTimeout);
		this._syncTimeout = setTimeout(() => {
			this.pushLocalChanges();
		}, DEBOUNCE_MS);
	}
};
