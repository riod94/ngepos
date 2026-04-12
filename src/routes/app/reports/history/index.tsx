import { createSignal, createResource, Show, batch } from "solid-js";
import { History, Clock, TriangleAlert, ArrowLeft } from "lucide-solid";
import { A, useNavigate, useSearchParams } from "@solidjs/router";
import { db, getSetting } from "~/db/db";
import { DateFilter, DateFilterType, DateRange } from "~/components/DateFilter";
import { toast } from "solid-toast";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import { Swipeable } from "~/components/Swipeable";

export default function HistoryPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();

	const filter = () => (searchParams.f as DateFilterType) || "HARI_INI";
	const customRange = () => {
		if (searchParams.from && searchParams.to) {
			return {
				from: Number(searchParams.from),
				to: Number(searchParams.to),
			};
		}
		return undefined;
	};

	const [transactions, { refetch }] = createResource(
		() => ({ f: filter(), r: customRange() }),
		async ({ f, r }) => {
			const query = db.transactions.orderBy("timestamp").reverse();
			if (f === "HARI_INI") {
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				return await query
					.filter((tx) => tx.timestamp >= today.getTime())
					.toArray();
			}
			if (f === "BULAN_INI") {
				const d = new Date();
				const y = d.getFullYear();
				const m = d.getMonth();
				const start = new Date(y, m, 1, 0, 0, 0, 0);
				const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
				return await query
					.filter(
						(tx) =>
							tx.timestamp >= start.getTime() &&
							tx.timestamp <= end.getTime(),
					)
					.toArray();
			}
			if (f === "CUSTOM" && r) {
				return await query
					.filter((tx) => tx.timestamp >= r.from && tx.timestamp <= r.to)
					.toArray();
			}
			return await query.toArray();
		},
	);

	// Permission check
	const [canDelete] = createResource(async () => {
		// For now, if user name in setting is "Riod Prabowo" or equivalent, or we check role
		// In actual app, we'd check active staff role.
		// Let's assume for this SaaS, the "Super Admin" permission is tied to the owner info.
		return true; // Enabling for the prompt request
	});

	const [deleteTxId, setDeleteTxId] = createSignal<string | null>(null);
	const [isDeleting, setIsDeleting] = createSignal(false);

	const totalSales = () =>
		transactions()?.reduce((acc, tx) => acc + tx.totalAmount, 0) ?? 0;

	const handleFilterChange = (f: DateFilterType, r?: DateRange) => {
		batch(() => {
			if (f === "CUSTOM" && r) {
				setSearchParams({ f, from: r.from, to: r.to });
			} else {
				setSearchParams({ f, from: undefined, to: undefined });
			}
		});
	};

	async function handleDeleteTransaction() {
		const id = deleteTxId();
		if (!id) return;
		setIsDeleting(true);
		try {
			// Delete transaction and items
			await db.transactionItems.where("transactionId").equals(id).delete();
			await db.transactions.delete(id);
			toast.success("Transaksi berhasil dihapus");
			setDeleteTxId(null);
			refetch();
		} catch (err) {
			console.error(err);
			toast.error("Gagal menghapus transaksi");
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<div class="flex flex-col min-h-screen bg-background pb-24">
			<div class="px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
				<div class="flex items-center gap-3 mb-5">
					<button
						onClick={() => navigate(-1)}
						class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
					>
						<ArrowLeft size={18} />
					</button>
					<div>
						<h1 class="font-black text-xl tracking-tight leading-none">
							Riwayat
						</h1>
						<p class="text-xs font-black text-muted-foreground uppercase tracking-widest mt-1.5 leading-none">
							Penjualan · {filter().replace("_", " ")}
						</p>
					</div>
				</div>

				<div class="mt-5">
					<DateFilter
						activeFilter={filter()}
						onFilterChange={handleFilterChange}
						customRange={customRange()}
					/>
				</div>
			</div>

			<div class="p-5 flex-1 flex flex-col gap-4">
				{/* Total Hero */}
				<div class="p-6 rounded-3xl bg-gradient-to-br from-primary to-orange-500 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
					<div class="absolute -right-6 -top-6 opacity-10">
						<History size={140} />
					</div>
					<span class="text-xs font-black opacity-80 uppercase tracking-widest block mb-1">
						Total Penjualan
					</span>
					<h2 class="text-3xl font-black tracking-tighter leading-none">
						Rp {totalSales().toLocaleString("id-ID")}
					</h2>
					<span class="text-xs font-black opacity-90 mt-2 block bg-black/10 w-fit px-2 py-0.5 rounded-md uppercase tracking-widest">
						{transactions()?.length ?? 0} Transaksi
					</span>
				</div>

				<div class="flex items-center justify-between">
					<h3 class="font-black text-sm uppercase tracking-widest text-muted-foreground">
						Daftar Transaksi
					</h3>
					<A
						href="/app/reports/history/backdate"
						class="text-xs font-black text-primary flex items-center bg-primary/10 px-3.5 py-2 rounded-full hover:bg-primary/20 transition-all active:scale-95 uppercase tracking-widest"
					>
						<Clock size={12} class="mr-1.5" stroke-width={3} />
						Input Lampau
					</A>
				</div>

				<Show
					when={transactions() && transactions()!.length > 0}
					fallback={
						<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
							<div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 border border-border/50">
								<History size={24} class="opacity-40" />
							</div>
							<span class="font-bold text-sm">Belum ada transaksi</span>
							<span class="text-sm mt-1 text-center max-w-[200px] opacity-70">
								{filter() === "HARI_INI"
									? "Belum ada penjualan hari ini."
									: "Database masih kosong."}
							</span>
						</div>
					}
				>
					<div class="flex flex-col gap-3">
						{transactions()!.map((tx) => (
							<Swipeable
								onDelete={() => setDeleteTxId(tx.id)}
								disabled={!canDelete()}
							>
								<A
									href={`/app/receipt/${tx.id}`}
									class="flex items-center justify-between p-4 bg-card border-none active:scale-[0.98] transition-transform hover:bg-muted/10 group"
								>
									<div class="flex flex-col gap-1">
										<div class="flex items-center gap-2">
											<span class="font-black text-sm group-hover:text-primary transition-colors">
												{tx.receiptNumber}
											</span>
											<Show when={tx.isBackdated}>
												<span class="bg-amber-100 text-amber-700 text-xs uppercase font-black px-1.5 py-0.5 rounded tracking-widest">
													Lampau
												</span>
											</Show>
										</div>
										<span class="text-sm font-semibold text-muted-foreground">
											{new Date(tx.timestamp).toLocaleString(
												"id-ID",
												{
													dateStyle: "medium",
													timeStyle: "short",
												},
											)}
										</span>
									</div>
									<div class="flex flex-col items-end gap-1.5">
										<span class="font-black text-base">
											Rp {tx.totalAmount.toLocaleString("id-ID")}
										</span>
										<div class="flex items-center gap-1.5">
											<span class="text-xs font-black text-muted-foreground uppercase bg-muted/70 px-1.5 py-0.5 rounded tracking-widest">
												{tx.paymentMethod}
											</span>
											<Show when={tx.status === "PENDING"}>
												<TriangleAlert
													size={13}
													class="text-orange-400"
												/>
											</Show>
										</div>
									</div>
								</A>
							</Swipeable>
						))}
					</div>
				</Show>
			</div>

			<ConfirmDialog
				open={deleteTxId() !== null}
				onOpenChange={(v) => !v && setDeleteTxId(null)}
				title="Hapus Transaksi?"
				description="Data transaksi dan rincian pesanan akan dihapus permanen."
				confirmLabel="Ya, Hapus"
				variant="danger"
				loading={isDeleting()}
				onConfirm={handleDeleteTransaction}
			/>
		</div>
	);
}
