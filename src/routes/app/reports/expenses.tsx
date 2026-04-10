import { createSignal, createResource, Show, For, batch } from "solid-js";
import { Plus, Trash2, Receipt, ArrowLeft } from "lucide-solid";
import { A } from "@solidjs/router";

import {
	db,
	type Expense,
	type ExpenseCategory,
	EXPENSE_CATEGORY_LABELS,
} from "~/db/db";
import { Button } from "~/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import { DateFilter, DateFilterType, DateRange } from "~/components/DateFilter";

const CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; text: string }> = {
	bahan_baku: { bg: "bg-orange-100", text: "text-orange-700" },
	operasional: { bg: "bg-blue-100", text: "text-blue-700" },
	sewa: { bg: "bg-violet-100", text: "text-violet-700" },
	gaji: { bg: "bg-emerald-100", text: "text-emerald-700" },
	utilitas: { bg: "bg-amber-100", text: "text-amber-700" },
	marketing: { bg: "bg-pink-100", text: "text-pink-700" },
	lainnya: { bg: "bg-gray-100", text: "text-gray-700" },
};

export default function Expenses() {
	const [period, setPeriod] = createSignal<DateFilterType>("HARI_INI");
	const [customRange, setCustomRange] = createSignal<DateRange | undefined>(
		undefined,
	);

	const [expenses, { refetch }] = createResource(
		() => ({ p: period(), r: customRange() }),
		async ({ p, r }) => {
			const query = db.expenses.orderBy("timestamp").reverse();
			if (p === "HARI_INI") {
				const d = new Date();
				d.setHours(0, 0, 0, 0);
				return query.filter((e) => e.timestamp >= d.getTime()).toArray();
			}
			if (p === "BULAN_INI") {
				const d = new Date();
				const y = d.getFullYear();
				const m = d.getMonth();
				const s = new Date(y, m, 1, 0, 0, 0, 0);
				const e = new Date(y, m + 1, 0, 23, 59, 59, 999);
				return query.filter((ex) => ex.timestamp >= s.getTime() && ex.timestamp <= e.getTime()).toArray();
			}
			if (p === "CUSTOM" && r) {
				return query
					.filter((e) => e.timestamp >= r.from && e.timestamp <= r.to)
					.toArray();
			}
			return query.toArray();
		},
	);

	const [sheetOpen, setSheetOpen] = createSignal(false);
	const [isEditing, setIsEditing] = createSignal(false);
	const [isSaving, setIsSaving] = createSignal(false);

	// Form
	const [formId, setFormId] = createSignal("");
	const [formAmount, setFormAmount] = createSignal("");
	const [formCategory, setFormCategory] =
		createSignal<ExpenseCategory>("operasional");
	const [formDesc, setFormDesc] = createSignal("");
	const [formDate, setFormDate] = createSignal(
		new Date().toISOString().split("T")[0],
	);
	const [formIsBackdated, setFormIsBackdated] = createSignal(false);

	// Confirm delete + validation alert state
	const [deleteTargetId, setDeleteTargetId] = createSignal<string | null>(
		null,
	);
	const [isDeleting, setIsDeleting] = createSignal(false);
	const [validationError, setValidationError] = createSignal<string | null>(
		null,
	);

	function openAdd() {
		setIsEditing(false);
		setFormId(`exp_${Date.now()}`);
		setFormAmount("");
		setFormCategory("operasional");
		setFormDesc("");
		setFormDate(new Date().toISOString().split("T")[0]);
		setFormIsBackdated(false);
		setSheetOpen(true);
	}

	function openEdit(e: Expense) {
		setIsEditing(true);
		setFormId(e.id);
		setFormAmount(e.amount.toString());
		setFormCategory(e.category);
		setFormDesc(e.description);
		setFormDate(new Date(e.timestamp).toISOString().split("T")[0]);
		setFormIsBackdated(e.isBackdated);
		setSheetOpen(true);
	}

	async function handleSave(ev: Event) {
		ev.preventDefault();
		if (isSaving()) return;
		setIsSaving(true);
		try {
			const amount = parseInt(formAmount().replaceAll(/\D/g, ""), 10) || 0;
			if (amount <= 0) {
				setValidationError("Jumlah pengeluaran harus diisi dengan benar.");
				return;
			}
			const date = new Date(`${formDate()}T12:00:00`);
			const expense: Expense = {
				id: formId(),
				amount,
				category: formCategory(),
				description: formDesc(),
				timestamp: date.getTime(),
				isBackdated: formIsBackdated(),
			};
			if (isEditing()) await db.expenses.update(formId(), expense);
			else await db.expenses.add(expense);
			setSheetOpen(false);
			refetch();
		} catch {
			setValidationError("Jumlah pengeluaran harus diisi dengan benar.");
		} finally {
			setIsSaving(false);
		}
	}

	async function handleDelete(id: string, ev: Event) {
		ev.stopPropagation();
		setDeleteTargetId(id);
	}

	async function confirmDelete() {
		const id = deleteTargetId();
		if (!id) return;
		setIsDeleting(true);
		try {
			await db.expenses.delete(id);
			refetch();
		} finally {
			setIsDeleting(false);
			setDeleteTargetId(null);
		}
	}

	const totalExpenses = () =>
		expenses()?.reduce((s, e) => s + e.amount, 0) ?? 0;

	const handleFilterChange = (f: DateFilterType, r?: DateRange) => {
		batch(() => {
			setPeriod(f);
			setCustomRange(r);
		});
	};

	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-24">
			{/* Confirm Delete */}
			<ConfirmDialog
				open={deleteTargetId() !== null}
				onOpenChange={(v) => !v && setDeleteTargetId(null)}
				title="Hapus Pengeluaran?"
				description="Data pengeluaran ini akan dihapus secara permanen."
				confirmLabel="Ya, Hapus"
				variant="danger"
				loading={isDeleting()}
				onConfirm={confirmDelete}
			/>

			{/* Validation Alert */}
			<ConfirmDialog
				open={validationError() !== null}
				onOpenChange={(v) => !v && setValidationError(null)}
				title="Perhatian"
				description={validationError() ?? ""}
				confirmLabel="OK"
				cancelLabel=""
				variant="warning"
				onConfirm={() => setValidationError(null)}
			/>

			{/* Header */}
			<div class="px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
				<div class="flex items-center gap-3 mb-5">
					<A
						href="/app/reports"
						class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
					>
						<ArrowLeft size={18} />
					</A>
					<div>
						<h1 class="font-black text-xl tracking-tight leading-none">
							Pengeluaran
						</h1>
						<span class="text-xs font-black text-muted-foreground uppercase tracking-widest mt-1.5 block leading-none">
							Biaya Operasional · {period().replace("_", " ")}
						</span>
					</div>
					<Button
						onClick={openAdd}
						class="h-10 px-4 rounded-full font-black text-xs bg-red-500 text-white uppercase tracking-wider shadow-md active:scale-95 transition-all ml-auto"
					>
						<Plus size={16} class="mr-1.5" stroke-width={3} /> Catat
					</Button>
				</div>

				<DateFilter
					activeFilter={period()}
					onFilterChange={handleFilterChange}
					customRange={customRange()}
				/>
			</div>

			<div class="p-5 flex flex-col gap-4">
				{/* Total Card */}
				<div class="p-5 rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-xl shadow-red-500/20 relative overflow-hidden">
					<div class="absolute -right-6 -top-6 opacity-10">
						<Receipt size={120} />
					</div>
					<span class="text-xs font-black uppercase tracking-widest opacity-80 block mb-1">
						Total Pengeluaran
					</span>
					<p class="text-3xl font-black tracking-tighter leading-none">
						Rp {totalExpenses().toLocaleString("id-ID")}
					</p>
					<span class="text-xs font-black tracking-widest uppercase opacity-70 mt-2 block bg-black/10 w-fit px-2 py-0.5 rounded-md">
						{expenses()?.length ?? 0} Entri
					</span>
				</div>

				{/* List */}
				<Show
					when={expenses() && expenses()!.length > 0}
					fallback={
						<div class="flex flex-col items-center py-16 gap-4 text-muted-foreground">
							<div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border/50">
								<Receipt size={22} class="opacity-40" />
							</div>
							<div class="text-center">
								<p class="font-bold text-sm">Belum ada pengeluaran</p>
								<p class="text-sm mt-1 opacity-70">
									Catat biaya operasional Anda di sini.
								</p>
							</div>
						</div>
					}
				>
					<For each={expenses()}>
						{(expense) => {
							const colors =
								CATEGORY_COLORS[expense.category] ??
								CATEGORY_COLORS.lainnya;
							return (
								<div
									class="flex items-center gap-3 bg-card p-4 rounded-2xl border border-border/70 shadow-sm cursor-pointer active:scale-[0.98] transition-all hover:border-primary/30 group"
									role="button"
									tabIndex={0}
									onClick={() => openEdit(expense)}
									onKeyDown={(e: KeyboardEvent) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											openEdit(expense);
										}
									}}
								>
									<div
										class={`w-11 h-11 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center shrink-0 font-black text-sm`}
									>
										{EXPENSE_CATEGORY_LABELS[expense.category]
											.substring(0, 2)
											.toUpperCase()}
									</div>
									<div class="flex-1 min-w-0">
										<p class="font-black text-sm leading-tight truncate">
											{expense.description ||
												EXPENSE_CATEGORY_LABELS[expense.category]}
										</p>
										<div class="flex items-center gap-1.5 mt-1">
											<span
												class={`text-xs font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
											>
												{EXPENSE_CATEGORY_LABELS[expense.category]}
											</span>
											<Show when={expense.isBackdated}>
												<span class="text-xs font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-widest">
													Lampau
												</span>
											</Show>
										</div>
										<p class="text-sm font-semibold text-muted-foreground mt-0.5">
											{new Date(
												expense.timestamp,
											).toLocaleDateString("id-ID", {
												dateStyle: "medium",
											})}
										</p>
									</div>
									<div class="flex flex-col items-end gap-2 shrink-0">
										<p class="font-black text-sm text-red-500">
											−Rp {expense.amount.toLocaleString("id-ID")}
										</p>
										<Button
											variant="outline"
											size="icon"
											class="h-8 w-8 rounded-full border-border/60 bg-red-50 hover:bg-red-100"
											onClick={(e) => handleDelete(expense.id, e)}
										>
											<Trash2 size={13} class="text-red-500" />
										</Button>
									</div>
								</div>
							);
						}}
					</For>
				</Show>
			</div>

			{/* Add/Edit Sheet */}
			<Sheet open={sheetOpen()} onOpenChange={setSheetOpen}>
				<SheetContent
					position="bottom"
					class="h-auto max-h-[90vh] rounded-t-[32px] flex flex-col p-0 border-none shadow-[0_-20px_60px_rgba(0,0,0,0.15)]"
				>
					<SheetHeader class="px-5 pt-6 pb-4 border-b border-border/50 shrink-0">
						<SheetTitle class="font-black text-xl tracking-tight">
							{isEditing() ? "Edit Pengeluaran" : "Catat Pengeluaran"}
						</SheetTitle>
					</SheetHeader>
					<form
						onSubmit={handleSave}
						class="flex flex-col gap-5 p-5 overflow-y-auto"
					>
						{/* Amount */}
						<div class="flex flex-col gap-2">
							<label
								for="exp-amount"
								class="text-xs font-black uppercase tracking-widest text-muted-foreground"
							>
								Jumlah (Rp)
							</label>
							<input
								id="exp-amount"
								required
								type="number"
								class="h-14 w-full rounded-2xl border-2 border-border/70 bg-card px-4 font-black text-xl focus:outline-none focus:border-red-400/60 focus:ring-4 focus:ring-red-400/10 transition-all"
								value={formAmount()}
								onInput={(e) => setFormAmount(e.currentTarget.value)}
								placeholder="0"
							/>
						</div>

						{/* Category */}
						<div class="flex flex-col gap-2">
							<label
								for="exp-cat"
								class="text-xs font-black uppercase tracking-widest text-muted-foreground"
							>
								Kategori
							</label>
							<select
								id="exp-cat"
								class="h-14 w-full rounded-2xl border-2 border-border/70 bg-card px-4 font-bold text-sm focus:outline-none focus:border-primary/50 transition-all"
								value={formCategory()}
								onChange={(e) =>
									setFormCategory(
										e.currentTarget.value as ExpenseCategory,
									)
								}
							>
								<For each={Object.entries(EXPENSE_CATEGORY_LABELS)}>
									{([key, label]) => (
										<option value={key}>{label}</option>
									)}
								</For>
							</select>
						</div>

						{/* Description */}
						<div class="flex flex-col gap-2">
							<label
								for="exp-desc"
								class="text-xs font-black uppercase tracking-widest text-muted-foreground"
							>
								Keterangan
							</label>
							<input
								id="exp-desc"
								type="text"
								class="h-12 w-full rounded-xl border border-border/70 bg-card px-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
								value={formDesc()}
								onInput={(e) => setFormDesc(e.currentTarget.value)}
								placeholder="Keterangan opsional..."
							/>
						</div>

						{/* Date */}
						<div class="flex flex-col gap-2">
							<label
								for="exp-date"
								class="text-xs font-black uppercase tracking-widest text-muted-foreground"
							>
								Tanggal
							</label>
							<input
								id="exp-date"
								type="date"
								class="h-12 w-full rounded-xl border border-border/70 bg-card px-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
								value={formDate()}
								onInput={(e) => setFormDate(e.currentTarget.value)}
							/>
						</div>

						{/* Backdated toggle */}
						<div class="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-200">
							<div>
								<p class="font-black text-sm text-amber-900">
									Tandai sebagai Lampau
								</p>
								<p class="text-xs text-amber-700 font-semibold mt-0.5">
									Pengeluaran dari hari/waktu sebelumnya
								</p>
							</div>
							<button
								type="button"
								onClick={() => setFormIsBackdated(!formIsBackdated())}
								class={`w-12 h-7 rounded-full transition-all ${formIsBackdated() ? "bg-amber-500" : "bg-muted"} relative`}
							>
								<div
									class={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-sm ${formIsBackdated() ? "left-6" : "left-1"}`}
								/>
							</button>
						</div>

						<Button
							type="submit"
							disabled={isSaving()}
							class="w-full h-14 rounded-2xl font-black text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg border-none flex items-center justify-center gap-2 mb-4"
						>
							{isSaving() ? (
								<div class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
							) : isEditing() ? (
								"Perbarui Pengeluaran"
							) : (
								"Simpan Pengeluaran"
							)}
						</Button>
					</form>
				</SheetContent>
			</Sheet>
		</div>
	);
}
