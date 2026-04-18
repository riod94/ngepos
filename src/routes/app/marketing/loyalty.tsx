import { createSignal, createResource, For, Show, Suspense } from "solid-js";
import {
	Trophy,
	Plus,
	Trash2,
	CircleAlert,
	CirclePlus,
	ArrowLeft,
	Zap,
} from "lucide-solid";
import { A, useNavigate } from "@solidjs/router";
import { db, type LoyaltyProgram } from "~/db/db";
import { toast } from "solid-toast";
import { Button } from "~/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import { ProductSelector } from "~/components/ui/product-selector";

export default function LoyaltySettingsPage() {
	const navigate = useNavigate();
	const [formOpen, setFormOpen] = createSignal(false);
	const [editingProgram, setEditingProgram] =
		createSignal<Partial<LoyaltyProgram> | null>(null);
	const [isSaving, setIsSaving] = createSignal(false);
	const [deleteTargetId, setDeleteTargetId] = createSignal<string | null>(
		null,
	);
	const [isDeleting, setIsDeleting] = createSignal(false);

	// Resources
	const [programs, { refetch }] = createResource(async () => {
		return await db.loyaltyPrograms.toArray();
	});

	const [products] = createResource(async () => {
		return await db.products.toArray();
	});

	const resetForm = () => {
		setEditingProgram({
			name: "",
			targetStamps: 10,
			minTransaction: 15000,
			rewardType: "FREE_PRODUCT",
			rewardValue: 1,
			expiryMonths: 12,
			rewardClaimDays: 30,
			afterClaim: "RESET",
			excludedProductIds: [],
			allowWithPromo: false,
			isActive: true,
		});
	};

	const handleSave = async (e?: Event) => {
		if (e) e.preventDefault();
		if (isSaving()) return;
		const p = editingProgram();
		if (!p || !p.name) return;

		if (p.rewardType === "FREE_PRODUCT" && !p.rewardProductId) {
			toast.error("Pilih produk hadiah terlebih dahulu");
			return;
		}

		setIsSaving(true);
		try {
			if (p.isActive) {
				await db.loyaltyPrograms
					.where("isActive")
					.equals(1)
					.modify({ isActive: false });
			}

			const id = p.id || `lp_${Math.random().toString(36).substring(2, 11)}`;
			await db.loyaltyPrograms.put({
				...p,
				id,
				createdAt: p.createdAt || Date.now(),
			} as LoyaltyProgram);

			toast.success(p.id ? "Program diperbarui" : "Program loyalty dibuat!");
			setFormOpen(false);
			refetch();
		} catch (err) {
			toast.error("Gagal menyimpan program");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async (id: string, e: Event) => {
		e.stopPropagation();
		setDeleteTargetId(id);
	};

	const confirmDelete = async () => {
		const id = deleteTargetId();
		if (!id) return;
		setIsDeleting(true);
		try {
			await db.loyaltyPrograms.delete(id);
			await db.customerStamps.where("programId").equals(id).delete();
			await db.customerRewards.where("programId").equals(id).delete();
			toast.success("Program dihapus");
			refetch();
		} catch (err) {
			toast.error("Gagal menghapus program");
		} finally {
			setIsDeleting(false);
			setDeleteTargetId(null);
		}
	};

	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-24 text-left">
			{/* Header */}
			<div class="flex items-center justify-between px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
				<div class="flex items-center gap-3">
					<button
						onClick={() => navigate(-1)}
						class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
					>
						<ArrowLeft size={18} />
					</button>
					<div>
						<h1 class="font-bold text-lg tracking-tight leading-none">
							Loyalty Program
						</h1>
						<span class="text-xs font-semibold text-muted-foreground mt-0.5 block">
							Loyalty System
						</span>
					</div>
				</div>
				<Button
					onClick={() => {
						resetForm();
						setFormOpen(true);
					}}
					class="h-10 px-4 rounded-full font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
				>
					<Plus size={15} stroke-width={2.5} /> Program
				</Button>
			</div>

			<div class="p-4 space-y-4">
				{/* Confirm Delete Dialog */}
				<ConfirmDialog
					open={deleteTargetId() !== null}
					onOpenChange={(v) => !v && setDeleteTargetId(null)}
					title="Hapus Program Loyalty?"
					description="Semua data stamp dan riwayat reward member pada program ini akan ikut terhapus permanen."
					confirmLabel="Ya, Hapus"
					variant="danger"
					loading={isDeleting()}
					onConfirm={confirmDelete}
				/>

				{/* Compact Warning */}
				<div class="p-3.5 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
					<CircleAlert class="text-amber-600 shrink-0 mt-0.5" size={14} />
					<p class="text-[10px] font-bold text-amber-800/80 uppercase tracking-wider leading-relaxed">
						Hanya 1 program aktif. Mengaktifkan program baru menonaktifkan
						program lama.
					</p>
				</div>

				{/* Programs List */}
				<div class="flex flex-col gap-2.5">
					<Suspense
						fallback={
							<div class="py-10 text-center text-xs font-bold text-muted-foreground animate-pulse">
								Memuat program...
							</div>
						}
					>
						<For
							each={programs()}
							fallback={
								<div class="flex flex-col items-center py-20 text-muted-foreground gap-4">
									<div class="w-14 h-14 rounded-full bg-muted flex items-center justify-center border border-border/50">
										<Trophy size={22} class="opacity-40" />
									</div>
									<p class="font-bold text-sm">
										Belum ada program loyalty
									</p>
								</div>
							}
						>
							{(p) => {
								return (
									<div 
										class={`flex items-center w-full text-left gap-3 bg-card px-3.5 py-3 rounded-2xl border transition-all cursor-pointer group shadow-sm ${p.isActive ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/60 hover:border-primary/30"}`}
										onClick={() => {
											setEditingProgram(p);
											setFormOpen(true);
										}}
									>
										<div
											class={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-border/50 transition-all ${p.isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
										>
											<Trophy size={20} stroke-width={2.5} />
										</div>
										<div class="flex-1 min-w-0">
											<h3 class="font-bold text-sm leading-tight truncate group-hover:text-primary transition-colors">
												{p.name}
											</h3>
											<div class="flex items-center gap-1.5 mt-1 flex-wrap">
												<span
													class={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
												>
													{p.isActive ? "Aktif" : "Non-aktif"}
												</span>
												<span class="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
													{p.targetStamps} Stamp
												</span>
											</div>
										</div>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												handleDelete(p.id!, e);
											}}
											class="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground/20 hover:text-red-500 hover:bg-red-50 transition-all ml-auto relative z-10"
										>
											<Trash2 size={13} />
										</button>
									</div>
								);
							}}
						</For>
					</Suspense>
				</div>
			</div>

			{/* Program Config Sheet */}
			<Sheet open={formOpen()} onOpenChange={setFormOpen}>
				<SheetContent
					position="bottom"
					class="h-[96vh] rounded-t-[32px] flex flex-col p-0 border-none shadow-[0_-20px_60px_rgba(0,0,0,0.15)] overflow-hidden"
				>
					<SheetHeader class="px-5 pt-6 pb-4 border-b border-border/50 shrink-0 text-left">
						<SheetTitle class="font-black text-xl tracking-tight">
							{editingProgram()?.id ? "Edit Program" : "Tambah Program"}
						</SheetTitle>
					</SheetHeader>

					<form
						id="loyalty-form"
						onSubmit={handleSave}
						class="flex-1 overflow-y-auto"
					>
						<div class="flex flex-col gap-4 p-4 text-left">
							<div class="flex flex-col gap-1.5">
								<label
									for="prog-name"
									class="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1"
								>
									Nama Program
								</label>
								<input
									id="prog-name"
									type="text"
									required
									class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-medium text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
									value={editingProgram()?.name || ""}
									onInput={(e) =>
										setEditingProgram({
											...editingProgram()!,
											name: e.currentTarget.value,
										})
									}
									placeholder="Contoh: Member Kopi Setia"
								/>
							</div>

							<div class="grid grid-cols-2 gap-3">
								<div class="flex flex-col gap-1.5">
									<label
										for="prog-stamps"
										class="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1"
									>
										Target Stamp
									</label>
									<input
										id="prog-stamps"
										type="number"
										required
										class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-bold text-base focus:outline-none focus:border-primary/60 transition-all"
										value={editingProgram()?.targetStamps || 0}
										onInput={(e) =>
											setEditingProgram({
												...editingProgram()!,
												targetStamps: Number(e.currentTarget.value),
											})
										}
									/>
								</div>
								<div class="flex flex-col gap-1.5">
									<label
										for="prog-min"
										class="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1"
									>
										Min. Belanja
									</label>
									<input
										id="prog-min"
										type="number"
										required
										class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-bold text-base focus:outline-none focus:border-primary/60 transition-all"
										value={editingProgram()?.minTransaction || 0}
										onInput={(e) =>
											setEditingProgram({
												...editingProgram()!,
												minTransaction: Number(
													e.currentTarget.value,
												),
											})
										}
									/>
								</div>
							</div>

							{/* Reward Selector Compact */}
							<div class="p-4 bg-muted/20 border-2 border-dashed border-border/60 rounded-[28px] space-y-4">
								<div class="flex items-center gap-2 mb-2">
									<CirclePlus size={14} class="text-primary" />
									<span class="text-[10px] font-black text-primary uppercase tracking-widest">
										Reward Member
									</span>
								</div>

								<div class="flex bg-background p-1.5 rounded-xl border border-border/60 gap-1 shadow-sm">
									<For
										each={
											[
												"FREE_PRODUCT",
												"PERCENT_DISCOUNT",
												"FIXED_DISCOUNT",
											] as LoyaltyProgram["rewardType"][]
										}
									>
										{(type) => (
											<button
												type="button"
												onClick={() =>
													setEditingProgram({
														...editingProgram()!,
														rewardType: type,
													})
												}
												class={`flex-1 h-9 rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all ${editingProgram()?.rewardType === type ? "bg-primary text-white shadow-sm" : "hover:bg-muted text-muted-foreground"}`}
											>
												{type === "FREE_PRODUCT"
													? "Barang"
													: type === "PERCENT_DISCOUNT"
														? "Diskon %"
														: "Potongan"}
											</button>
										)}
									</For>
								</div>

								<Show
									when={
										editingProgram()?.rewardType === "FREE_PRODUCT"
									}
								>
									<ProductSelector
										label="Pilih Produk Hadiah"
										products={products() || []}
										selectedIds={editingProgram()?.rewardProductId ? [editingProgram()!.rewardProductId!] : []}
										onSelect={(ids) => {
											setEditingProgram({
												...editingProgram()!,
												rewardProductId: ids[0] || undefined,
											});
										}}
										multiple={false}
										placeholder="Pilih hadiah..."
									/>
								</Show>

								<Show
									when={
										editingProgram()?.rewardType !== "FREE_PRODUCT"
									}
								>
									<div class="flex flex-col gap-1.5">
										<label class="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">
											Nilai {editingProgram()?.rewardType === "PERCENT_DISCOUNT" ? "Diskon (%)" : "Potongan (Rp)"}
										</label>
										<input
											type="number"
											required
											class="h-12 w-full rounded-xl border border-border/70 bg-background px-3.5 font-bold text-base focus:outline-none focus:border-primary/60 shadow-sm"
											value={editingProgram()?.rewardValue || 0}
											onInput={(e) =>
												setEditingProgram({
													...editingProgram()!,
													rewardValue: Number(e.currentTarget.value),
												})
											}
										/>
									</div>
								</Show>
							</div>

							<div class="flex items-center justify-between p-4 bg-muted/20 border border-border/10 rounded-2xl">
								<div class="flex flex-col text-left">
									<span class="text-xs font-bold">Status Aktif</span>
									<span class="text-[10px] text-muted-foreground">
										Aktifkan program sekarang
									</span>
								</div>
								<button
									type="button"
									onClick={() =>
										setEditingProgram({
											...editingProgram()!,
											isActive: !editingProgram()?.isActive,
										})
									}
									class={`w-12 h-6 rounded-full transition-all relative ${editingProgram()?.isActive ? "bg-primary" : "bg-muted-foreground/30"}`}
								>
									<div
										class={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingProgram()?.isActive ? "left-7 shadow-sm" : "left-1"}`}
									/>
								</button>
							</div>
						</div>
					</form>

					<div class="px-5 pb-10 pt-3.5 border-t border-border/50 bg-background/80 backdrop-blur-md shrink-0 sticky bottom-0">
						<Button
							type="submit"
							form="loyalty-form"
							disabled={isSaving()}
							class="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-none transition-all shadow-lg shadow-primary/20"
						>
							{isSaving() ? (
								<div class="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
							) : (
								<>
									<Zap size={16} />
									{editingProgram()?.id
										? "Perbarui Program"
										: "Simpan Program"}
								</>
							)}
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
