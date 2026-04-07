import { createSignal, createResource, For, Show, Suspense, createEffect } from "solid-js";
import { Portal } from "solid-js/web";
import {
	Users,
	Search,
	Plus,
	QrCode,
	Printer,
	ChevronRight,
	Phone,
	Trash2,
	X,
	SquareCheck,
	ArrowLeft,
	Zap,
} from "lucide-solid";
import { A, useNavigate } from "@solidjs/router";
import { db, type Customer } from "~/db/db";
import {
	generateCustomerId,
	formatQrCode,
	getCustomerProgress as getProgressData,
	getActiveProgram,
} from "~/stores/loyalty";
import { QrCodeGenerator, QrCodePrintGrid } from "~/components/QrCodeGenerator";
import { toast } from "solid-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { ConfirmDialog } from "~/components/ConfirmDialog";

type MemberTab = "ALL" | "ASSIGNED" | "UNASSIGNED";

export default function MembersPage() {
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = createSignal<MemberTab>("ALL");
	const [searchQuery, setSearchQuery] = createSignal("");
	const [generateDialogOpen, setGenerateDialogOpen] = createSignal(false);
	const [batchCount, setBatchCount] = createSignal(10);
	const [printingMembers, setPrintingMembers] = createSignal<
		Customer[] | null
	>(null);
	const [selectedCustomer, setSelectedCustomer] =
		createSignal<Customer | null>(null);

	// Selection State
	const [sheetOpen, setSheetOpen] = createSignal(false);
	const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());

	// Resources
	const [customers, { refetch }] = createResource(async () => {
		return await db.customers.toArray();
	});

	const [activeLoyaltyProgram] = createResource(async () => {
		return await getActiveProgram();
	});

	const [customerProgress] = createResource(
		() => selectedCustomer()?.id,
		async (id) => {
			const lp = activeLoyaltyProgram();
			if (!id || !lp) return null;
			return await getProgressData(id, lp.id);
		},
	);

	const [customerStamps] = createResource(
		() => selectedCustomer()?.id,
		async (id) => {
			return await db.customerStamps
				.where("customerId")
				.equals(id)
				.toArray();
		},
	);

	const filteredCustomers = () => {
		let list = customers() || [];
		if (activeTab() === "ASSIGNED")
			list = list.filter((c) => c.status === "ASSIGNED");
		if (activeTab() === "UNASSIGNED")
			list = list.filter((c) => c.status === "UNASSIGNED");

		if (searchQuery()) {
			const q = searchQuery().toLowerCase();
			list = list.filter(
				(c) =>
					c.name?.toLowerCase().includes(q) ||
					c.phone?.toLowerCase().includes(q) ||
					c.qrCode.toLowerCase().includes(q),
			);
		}
		return list.sort((a, b) => b.createdAt - a.createdAt);
	};

	const toggleSelect = (id: string, e?: Event) => {
		if (e) e.stopPropagation();
		const next = new Set(selectedIds());
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setSelectedIds(next);
	};

	const toggleSelectAll = () => {
		const visible = filteredCustomers();
		if (selectedIds().size === visible.length) {
			setSelectedIds(new Set<string>());
		} else {
			setSelectedIds(new Set<string>(visible.map((c) => c.id)));
		}
	};

	const handleBulkPrint = () => {
		const toPrint = (customers() || []).filter((c) =>
			selectedIds().has(c.id),
		);
		if (toPrint.length === 0) return;
		setPrintingMembers(toPrint);
	};

	const handlePrint = () => {
		window.print();
	};

	const closePrintOverlay = (e?: MouseEvent) => {
		e?.preventDefault();
		e?.stopPropagation();
		setPrintingMembers(null);
	};

	const handleBulkDelete = async () => {
		if (!confirm(`Hapus ${selectedIds().size} member terpilih?`)) return;
		try {
			await db.customers.bulkDelete(Array.from(selectedIds()));
			toast.success(`${selectedIds().size} Member berhasil dihapus`);
			setSelectedIds(new Set<string>());
			refetch();
		} catch (err) {
			toast.error("Gagal menghapus beberapa member");
		}
	};

	const handleGenerateBatch = async () => {
		const count = batchCount();
		if (count <= 0) {
			toast.error("Jumlah harus lebih dari 0");
			return;
		}

		try {
			const newItems: Customer[] = [];
			const now = Date.now();
			for (let i = 0; i < count; i++) {
				const id = generateCustomerId();
				newItems.push({
					id,
					qrCode: formatQrCode(id),
					status: "UNASSIGNED",
					createdAt: now,
				});
			}
			await db.customers.bulkAdd(newItems);
			toast.success(`${count} QR Member berhasil dibuat!`);
			setGenerateDialogOpen(false);
			setPrintingMembers(newItems);
			refetch();
		} catch (err) {
			toast.error("Gagal membuat batch QR");
		}
	};

	const [isEditing, setIsEditing] = createSignal(false);
	const [editName, setEditName] = createSignal("");
	const [editPhone, setEditPhone] = createSignal("");
	const [editEmail, setEditEmail] = createSignal("");
	const [deleteTargetId, setDeleteTargetId] = createSignal<string | null>(null);
	const [isDeleting, setIsDeleting] = createSignal(false);

	createEffect(() => {
		const c = selectedCustomer();
		if (c) {
			setEditName(c.name || "");
			setEditPhone(c.phone || "");
			setEditEmail(c.email || "");
			setIsEditing(false);
		}
	});

	const handleDeleteMember = async () => {
		const id = deleteTargetId();
		if (!id) return;
		setIsDeleting(true);
		try {
			await db.customers.delete(id);
			toast.success("Member dihapus");
			setDeleteTargetId(null);
			setSheetOpen(false);
			refetch();
		} catch (err) {
			toast.error("Gagal menghapus member");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleUpdateMember = async (e?: Event) => {
		if (e) e.preventDefault();
		const c = selectedCustomer();
		if (!c) return;

		try {
			const isNowAssigned = !!(editName() || editPhone());
			await db.customers.update(c.id, {
				name: editName(),
				phone: editPhone(),
				email: editEmail(),
				status: isNowAssigned ? "ASSIGNED" : "UNASSIGNED",
				assignedAt: c.assignedAt || (isNowAssigned ? Date.now() : undefined)
			});
			toast.success("Profil member diperbarui");
			setIsEditing(false);
			refetch();
			const updated = await db.customers.get(c.id);
			if (updated) setSelectedCustomer(updated);
		} catch (err) {
			toast.error("Gagal memperbarui member");
		}
	};

	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-24 text-left">
			{/* Minimalist Header Aligned with Products Style */}
			<div class="flex items-center justify-between px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
				<div class="flex items-center gap-3">
					<A
						href="/app/settings"
						class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
					>
						<ArrowLeft size={18} />
					</A>
					<div>
						<h1 class="font-bold text-lg tracking-tight leading-none">
							Database Member
						</h1>
						<span class="text-xs font-semibold text-muted-foreground mt-0.5 block">
							Loyalty System
						</span>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<button
						onClick={() => setGenerateDialogOpen(true)}
						class="h-10 px-4 rounded-full bg-primary text-white font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
					>
						<Plus size={15} stroke-width={2.5} /> Generate
					</button>
				</div>
			</div>

			{/* Tabs & Search compacted */}
			<div class="p-4 flex flex-col gap-3">
				<div class="flex bg-card p-1 rounded-2xl border border-border/60 shadow-sm">
					<For each={["ALL", "ASSIGNED", "UNASSIGNED"] as MemberTab[]}>
						{(tab) => (
							<button
								onClick={() => setActiveTab(tab)}
								class={`flex-1 h-9 rounded-xl font-bold text-xs transition-all ${activeTab() === tab ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
							>
								{tab === "ALL"
									? "Semua"
									: tab === "ASSIGNED"
										? "Terdaftar"
										: "Kosong"}
							</button>
						)}
					</For>
				</div>
				<div class="relative group">
					<Search
						size={16}
						class="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors"
					/>
					<input
						type="text"
						placeholder="Cari ID, Nama, atau HP..."
						class="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-card focus:border-primary/40 focus:outline-none font-medium text-sm shadow-sm transition-all"
						onInput={(e) => setSearchQuery(e.currentTarget.value)}
					/>
				</div>

				<Show when={filteredCustomers().length > 0}>
					<button
						onClick={toggleSelectAll}
						class="text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary ml-1 w-fit transition-colors"
					>
						{selectedIds().size === filteredCustomers().length
							? "Batalkan Semua"
							: "Pilih Semua Halaman Ini"}
					</button>
				</Show>
			</div>

			{/* Main List View - Compact Row style like Products */}
			<div class="flex flex-col gap-2.5 p-4">
				<Suspense
					fallback={
						<div class="py-10 text-center text-xs font-bold text-muted-foreground animate-pulse">
							Memuat data...
						</div>
					}
				>
					<For
						each={filteredCustomers()}
						fallback={
							<div class="flex flex-col items-center py-20 text-muted-foreground gap-4">
								<div class="w-14 h-14 rounded-full bg-muted flex items-center justify-center border border-border/50">
									<Users size={22} class="opacity-40" />
								</div>
								<p class="font-bold text-sm">
									Tidak ada member ditemukan
								</p>
							</div>
						}
					>
						{(c) => (
							<div
								onClick={() => {
									setSelectedCustomer(c);
									setSheetOpen(true);
								}}
								class={`flex items-center w-full text-left gap-3 bg-card px-3.5 py-3 rounded-2xl border transition-all cursor-pointer group shadow-sm ${selectedIds().has(c.id) ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/60 hover:border-primary/30"}`}
							>
								<div
									onClick={(e) => toggleSelect(c.id, e)}
									class={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all relative overflow-hidden bg-white ${selectedIds().has(c.id) ? "border-primary ring-2 ring-primary/20 scale-105 shadow-lg shadow-primary/20" : "border-border/50 hover:border-primary/40 shadow-sm"}`}
								>
									<Show
										when={selectedIds().has(c.id)}
										fallback={
											<div class="scale-[0.35] origin-center opacity-80 group-hover:opacity-100 transition-opacity">
												<QrCodeGenerator value={c.qrCode} size={100} />
											</div>
										}
									>
										<div class="absolute inset-0 bg-primary flex items-center justify-center text-white">
											<SquareCheck size={22} stroke-width={3} />
										</div>
									</Show>
								</div>

								<div class="flex-1 min-w-0">
									<h3 class="font-bold text-sm leading-tight truncate group-hover:text-primary transition-colors">
										{c.name || "UNREGISTERED"}
									</h3>
									<div class="flex items-center gap-1.5 mt-1 flex-wrap">
										<span
											class={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${c.status === "ASSIGNED" ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground/50"}`}
										>
											{c.status === "ASSIGNED"
												? "Member Aktif"
												: "Belum Terdaftar"}
										</span>
										<span class="text-[10px] font-medium text-muted-foreground/60 font-mono">
											#{c.id.substring(c.id.length - 6).toUpperCase()}
										</span>
									</div>
								</div>

								<div class="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground/20 group-hover:text-primary transition-all ml-auto">
									<ChevronRight size={16} />
								</div>
							</div>
						)}
					</For>
				</Suspense>
			</div>

			{/* Floating Action Bar */}
			<Show when={selectedIds().size > 0}>
				<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-bottom-10">
					<div class="bg-foreground text-background p-3.5 rounded-[22px] shadow-2xl flex items-center justify-between gap-4 border border-white/10 backdrop-blur-xl">
						<div class="flex items-center gap-3 pl-2">
							<div class="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-black text-sm">
								{selectedIds().size}
							</div>
							<span class="text-[10px] font-black uppercase tracking-widest opacity-60">
								Terpilih
							</span>
						</div>
						<div class="flex items-center gap-2">
							<button
								onClick={handleBulkPrint}
								class="h-10 px-4 rounded-xl bg-white text-foreground font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
							>
								<Printer size={14} /> Cetak
							</button>
							<button
								onClick={handleBulkDelete}
								class="h-10 w-10 flex items-center justify-center rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
							>
								<Trash2 size={16} />
							</button>
						</div>
					</div>
				</div>
			</Show>


			{/* Member Profile Sheet Aligned with flow */}
			<Sheet open={sheetOpen()} onOpenChange={setSheetOpen}>
				<SheetContent
					position="bottom"
					class="h-[96vh] rounded-t-[32px] flex flex-col p-0 border-none shadow-[0_-20px_60px_rgba(0,0,0,0.15)] overflow-hidden"
				>
					<SheetHeader class="px-5 pt-6 pb-4 border-b border-border/50 shrink-0">
						<SheetTitle class="font-black text-xl tracking-tight">
							{isEditing() ? "Edit Profil Member" : "Profil Member"}
						</SheetTitle>
					</SheetHeader>

					<div class="flex-1 overflow-y-auto">
						<div class="p-5 space-y-6">
							{/* Profile Card / QR Section */}
							<div class="p-8 bg-card rounded-[32px] border border-border/60 shadow-sm relative overflow-hidden text-center">
								<div class="absolute -right-6 -top-6 text-primary opacity-[0.04] rotate-12 -z-0">
									<QrCode size={200} />
								</div>
								<div class="relative z-10 flex flex-col items-center">
									<div class="w-36 h-36 bg-white rounded-[24px] border border-border/50 p-3 shadow-xl shadow-black/[0.02] flex items-center justify-center mb-6">
										<QrCodeGenerator value={selectedCustomer()?.qrCode || ""} size={120} />
									</div>
									<div class="space-y-1.5">
										<h3 class="text-2xl font-black tracking-tight uppercase leading-none text-foreground">
											{selectedCustomer()?.name || "Member Baru"}
										</h3>
										<div class="flex items-center justify-center gap-2 pt-1">
											<span class={`text-[10px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full ${selectedCustomer()?.status === "ASSIGNED" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-muted text-muted-foreground/60"}`}>
												{selectedCustomer()?.status === "ASSIGNED" ? "Member Aktif" : "Belum Terdaftar"}
											</span>
											<span class="text-[10px] font-black text-muted-foreground/30 font-mono tracking-widest">
												#{selectedCustomer()?.id.substring(selectedCustomer()!.id.length - 6).toUpperCase()}
											</span>
										</div>
									</div>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-3">
								<div class="bg-muted/30 p-4 rounded-2xl border border-border/40">
									<p class="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">Mulai Member</p>
									<p class="text-xs font-bold font-mono">
										{selectedCustomer()?.assignedAt ? new Date(selectedCustomer()!.assignedAt!).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
									</p>
								</div>
								<div class="bg-muted/30 p-4 rounded-2xl border border-border/40">
									<p class="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">Terakhir Scan</p>
									<p class="text-xs font-bold text-primary font-mono lowercase">
										<Show when={customerStamps()?.length} fallback="-">
											{new Date(customerStamps()!.sort((a,b) => b.stampedAt - a.stampedAt)[0].stampedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
										</Show>
									</p>
								</div>
							</div>

							<form id="member-form" onSubmit={handleUpdateMember} class="space-y-5">
								<div class="flex flex-col gap-4">
									<Show 
										when={isEditing()} 
										fallback={
											<div class="space-y-3">
												<div class="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/60">
													<div class="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 font-bold text-sm">
														Aa
													</div>
													<div class="flex-1 min-w-0 text-left">
														<p class="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">Nama Lengkap</p>
														<p class="text-sm font-bold truncate uppercase">{selectedCustomer()?.name || "-"}</p>
													</div>
												</div>
												<div class="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/60">
													<div class="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
														<Phone size={18} />
													</div>
													<div class="flex-1 min-w-0 text-left">
														<p class="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">WhatsApp</p>
														<p class="text-sm font-bold truncate">{selectedCustomer()?.phone || "-"}</p>
													</div>
												</div>
												<div class="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/60">
													<div class="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
														<Users size={18} />
													</div>
													<div class="flex-1 min-w-0 text-left">
														<p class="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">Email</p>
														<p class="text-sm font-bold truncate">{selectedCustomer()?.email || "-"}</p>
													</div>
												</div>

												{/* Stamp Progress Section - Compact Vertical Grid */}
												<div class="pt-2 pb-2">
													<div class="flex items-center justify-between px-1 mb-4">
														<h4 class="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Progress Loyalty</h4>
														<span class="text-[10px] font-black text-primary px-2.5 py-1 bg-primary/10 rounded-lg border border-primary/10">
															{customerStamps()?.length || 0} / {activeLoyaltyProgram()?.targetStamps || 10} STAMP
														</span>
													</div>
													
													<div class="bg-muted/10 rounded-[24px] border border-border/40 p-5">
														<div class="grid grid-cols-5 gap-3">
															<For each={Array.from({length: activeLoyaltyProgram()?.targetStamps || 10})}>
																{(_, i) => (
																	<div class={`aspect-square rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${i() < (customerStamps()?.length || 0) ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-100" : "bg-background border-border/40 text-muted-foreground/10 scale-95"}`}>
																		<SquareCheck size={i() < (customerStamps()?.length || 0) ? 18 : 14} stroke-width={3} />
																	</div>
																)}
															</For>
														</div>
														<div class="mt-4 pt-4 border-t border-border/40 text-center">
															<p class="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wide">
																{customerStamps()?.length === (activeLoyaltyProgram()?.targetStamps || 10) 
																	? "🎉 Reward Siap Diklaim!"
																	: `Kurang ${(activeLoyaltyProgram()?.targetStamps || 10) - (customerStamps()?.length || 0)} stamp lagi`}
															</p>
														</div>
													</div>
												</div>

												<div class="flex gap-2.5 pt-4">
													<button 
														type="button"
														onClick={() => setIsEditing(true)}
														class="flex-1 h-12 bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
													>
														Edit Profil
													</button>
													<button 
														type="button"
														onClick={() => setPrintingMembers([selectedCustomer()!])}
														class="w-12 h-12 bg-card border border-border/60 text-muted-foreground rounded-2xl flex items-center justify-center hover:bg-muted transition-all"
													>
														<Printer size={18} />
													</button>
												</div>
												<button 
													type="button"
													onClick={() => setDeleteTargetId(selectedCustomer()!.id)}
													class="w-full py-4 text-[10px] font-black text-red-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:text-red-500 transition-colors mt-4"
												>
													<Trash2 size={14} /> Hapus Selamanya
												</button>
											</div>
										}
									>
										<div class="space-y-4">
											<div class="flex flex-col gap-1.5 text-left">
												<label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nama Member</label>
												<input 
													type="text" 
													required
													placeholder="Masukkan nama member..."
													value={editName()} 
													onInput={e => setEditName(e.currentTarget.value)}
													class="w-full h-12 px-4 rounded-xl border border-border/70 bg-muted/30 font-medium text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
												/>
											</div>
											<div class="flex flex-col gap-1.5 text-left">
												<label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">WhatsApp</label>
												<input 
													type="tel" 
													placeholder="08xxxxxxxxxx"
													value={editPhone()} 
													onInput={e => setEditPhone(e.currentTarget.value)}
													class="w-full h-12 px-4 rounded-xl border border-border/70 bg-muted/30 font-medium text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
												/>
											</div>
											<div class="flex flex-col gap-1.5 text-left">
												<label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Email</label>
												<input 
													type="email" 
													placeholder="email@member.com"
													value={editEmail()} 
													onInput={e => setEditEmail(e.currentTarget.value)}
													class="w-full h-12 px-4 rounded-xl border border-border/70 bg-muted/30 font-medium text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
												/>
											</div>
											<div class="flex gap-3 pt-3">
												<button 
													type="button"
													onClick={() => setIsEditing(false)}
													class="flex-1 h-12 bg-muted text-muted-foreground rounded-xl font-black text-[11px] uppercase tracking-widest hover:text-foreground transition-all"
												>
													Batal
												</button>
											</div>
										</div>
									</Show>
								</div>
							</form>
						</div>
					</div>

					{/* Sticky Footer for Edit Mode */}
					<Show when={isEditing()}>
						<div class="px-5 pb-8 pt-4 border-t border-border/50 bg-background shrink-0 animate-in slide-in-from-bottom-2 duration-300">
							<button 
								type="submit"
								form="member-form"
								class="w-full h-12 bg-primary text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
							>
								<Zap size={16} /> Simpan Perubahan
							</button>
						</div>
					</Show>
				</SheetContent>
			</Sheet>

			{/* Confirm Delete Member */}
			<ConfirmDialog
				open={deleteTargetId() !== null}
				onOpenChange={(v) => !v && setDeleteTargetId(null)}
				title="Hapus Member?"
				description="Member ini akan dihapus secara permanen dari database."
				confirmLabel="Ya, Hapus"
				variant="danger"
				loading={isDeleting()}
				onConfirm={handleDeleteMember}
			/>

			{/* QR Batch Print Dialog */}
			<Show when={generateDialogOpen()}>
				<div class="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
					<div class="bg-card w-full max-w-[280px] rounded-[24px] shadow-2xl p-6 space-y-6 animate-in zoom-in-95">
						<div class="text-center">
							<h2 class="text-lg font-black uppercase tracking-tight">
								Generate QR
							</h2>
							<p class="text-[10px] font-bold text-muted-foreground mt-1">
								Pilih jumlah kartu member kosong
							</p>
						</div>
						<div class="grid grid-cols-3 gap-2">
							<For each={[5, 10, 15, 25, 50]}>
								{(num) => (
									<button
										onClick={() => setBatchCount(num)}
										class={`h-10 rounded-xl border-2 font-black text-[10px] transition-all ${batchCount() === num ? "border-primary bg-primary/5 text-primary" : "border-border/40 text-muted-foreground hover:bg-muted"}`}
									>
										{num} PCS
									</button>
								)}
							</For>
							<div class="relative group h-10">
								<input 
									type="number"
									placeholder="CSTM"
									class={`w-full h-full rounded-xl border-2 px-2 text-center font-black text-[10px] outline-none transition-all ${[5, 10, 15, 25, 50].includes(batchCount()) ? "border-border/40 bg-background" : "border-primary bg-primary/5 text-primary"}`}
									onInput={e => setBatchCount(Number(e.currentTarget.value))}
								/>
							</div>
						</div>
						<div class="pt-2">
							<button
								onClick={handleGenerateBatch}
								class="w-full h-12 bg-primary text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
							>
								Generate & Print
							</button>
							<button
								onClick={() => setGenerateDialogOpen(false)}
								class="w-full h-10 mt-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
							>
								Batal
							</button>
						</div>
					</div>
				</div>
			</Show>

			{/* Member Print Overlay with Portal - Final fix for interactivity & blank page */}
			<Show when={printingMembers()}>
				<Portal>
					<div 
						id="member-print-portal"
						class="fixed inset-0 z-[9999] bg-white overflow-y-auto pointer-events-auto"
					>
						{/* Floating Header - Only for preview, hidden on print */}
						<div class="fixed top-0 left-0 right-0 p-4 flex items-center justify-between bg-white/90 backdrop-blur-xl border-b border-border/40 no-print z-[10000]">
							<div class="flex items-center gap-3 ml-2">
								<div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
									<Printer size={20} />
								</div>
								<div>
									<h2 class="font-black text-sm uppercase tracking-tight leading-none">Pratinjau Cetak</h2>
									<p class="text-[10px] font-bold text-muted-foreground mt-1">{printingMembers()?.length} Kartu Member</p>
								</div>
							</div>
							
							<div class="flex items-center gap-2">
								<button
									type="button"
									onClick={() => window.print()}
									class="px-6 h-11 bg-primary text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center gap-2"
								>
									<Zap size={14} /> Cetak Sekarang
								</button>
								<button
									type="button"
									onClick={() => setPrintingMembers(null)}
									class="px-5 h-11 bg-muted text-muted-foreground rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-foreground active:scale-95 transition-all"
								>
									Tutup
								</button>
							</div>
						</div>

						{/* Content Area - Using visibility pattern for reliable print */}
						<div class="pt-24 pb-12 px-4 flex justify-center bg-muted/5 min-h-screen member-print-container">
							<div class="max-w-[794px] w-full bg-white shadow-2xl print:shadow-none min-h-[1123px]">
								<QrCodePrintGrid
									items={printingMembers()!.map((m) => ({
										id: m.id,
										qrCode: m.qrCode,
										label: m.id.substring(m.id.length - 8).toUpperCase(),
									}))}
								/>
							</div>
						</div>

						<style>{`
							@media print { 
								.no-print { display: none !important; }
								
								/* Hide everything on the page */
								html, body { visibility: hidden !important; background: white !important; }
								
								/* Only show the print portal and its contents */
								#member-print-portal, 
								#member-print-portal .member-print-container,
								#member-print-portal .member-print-container * { 
									visibility: visible !important; 
								}
								
								/* Reset positioning for print layout */
								#member-print-portal { 
									position: absolute !important; 
									left: 0 !important; 
									top: 0 !important; 
									width: 100% !important; 
									overflow: visible !important;
								}
								
								.member-print-container { 
									padding: 0 !important; 
									margin: 0 !important;
									display: block !important;
								}

								@page { 
									margin: 0; 
									size: A4 portrait; 
								}
							}
						`}</style>
					</div>
				</Portal>
			</Show>
		</div>
	);
}
