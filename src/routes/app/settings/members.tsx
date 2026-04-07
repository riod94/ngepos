import { createSignal, createResource, For, Show, Suspense } from "solid-js";
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
} from "lucide-solid";
import { A, useNavigate } from "@solidjs/router";
import { db, type Customer } from "~/db/db";
import {
	generateCustomerId,
	formatQrCode,
	getCustomerProgress,
	getActiveProgram,
} from "~/stores/loyalty";
import { QrCodePrintGrid } from "~/components/QrCodeGenerator";
import { toast } from "solid-toast";

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
	const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());

	// Resources
	const [customers, { refetch }] = createResource(async () => {
		return await db.customers.toArray();
	});

	const [customerProgress] = createResource(
		() => selectedCustomer()?.id,
		async (id) => {
			const lp = await getActiveProgram();
			if (!lp) return null;
			return await getCustomerProgress(id, lp.id);
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
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(visible.map((c) => c.id)));
		}
	};

	const handleBulkPrint = () => {
		const toPrint = (customers() || []).filter((c) =>
			selectedIds().has(c.id),
		);
		if (toPrint.length === 0) return;
		setPrintingMembers(toPrint);
	};

	const handleBulkDelete = async () => {
		if (!confirm(`Hapus ${selectedIds().size} member terpilih?`)) return;
		try {
			await db.customers.bulkDelete(Array.from(selectedIds()));
			toast.success(`${selectedIds().size} Member berhasil dihapus`);
			setSelectedIds(new Set());
			refetch();
		} catch (err) {
			toast.error("Gagal menghapus beberapa member");
		}
	};

	const handleGenerateBatch = async () => {
		try {
			const newItems: Customer[] = [];
			const now = Date.now();
			for (let i = 0; i < batchCount(); i++) {
				const id = generateCustomerId();
				newItems.push({
					id,
					qrCode: formatQrCode(id),
					status: "UNASSIGNED",
					createdAt: now,
				});
			}
			await db.customers.bulkAdd(newItems);
			toast.success(`${batchCount()} QR Member berhasil dibuat!`);
			setGenerateDialogOpen(false);
			setPrintingMembers(newItems);
			refetch();
		} catch (err) {
			toast.error("Gagal membuat batch QR");
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
								onClick={() => setSelectedCustomer(c)}
								class={`flex items-center w-full text-left gap-3 bg-card px-3.5 py-3 rounded-2xl border transition-all cursor-pointer group shadow-sm ${selectedIds().has(c.id) ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/60 hover:border-primary/30"}`}
							>
								<div
									onClick={(e) => toggleSelect(c.id, e)}
									class={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${selectedIds().has(c.id) ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" : "bg-muted border-border/50 text-muted-foreground/30 hover:border-primary/40"}`}
								>
									<Show
										when={selectedIds().has(c.id)}
										fallback={<QrCode size={18} />}
									>
										<SquareCheck size={18} stroke-width={3} />
									</Show>
								</div>

								<div class="flex-1 min-w-0">
									<h3 class="font-bold text-sm leading-tight truncate group-hover:text-primary transition-colors">
										{c.name || "UNREGISTERED"}
									</h3>
									<div class="flex items-center gap-1.5 mt-1 flex-wrap">
										<span
											class={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${c.status === "ASSIGNED" ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"}`}
										>
											{c.status === "ASSIGNED"
												? "Premium"
												: "Empty QR"}
										</span>
										<span class="text-[10px] font-medium text-muted-foreground/60 font-mono">
											ID: {c.id.substring(0, 8)}
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

			{/* Print Overlay */}
			<Show when={printingMembers()}>
				<div class="fixed inset-0 z-[200] bg-white overflow-y-auto">
					<div class="fixed top-0 left-0 right-0 p-5 flex items-center justify-between bg-white border-b border-border/40 no-print z-50">
						<div class="flex items-center gap-3">
							<Printer size={18} class="text-primary" />
							<h2 class="font-bold text-base">
								Print {printingMembers()?.length} QR
							</h2>
						</div>
						<div class="flex items-center gap-2">
							<button
								onClick={() => window.print()}
								class="px-5 h-9 bg-primary text-white rounded-full font-bold text-xs"
							>
								Cetak Sekarang
							</button>
							<button
								onClick={() => setPrintingMembers(null)}
								class="px-4 h-9 bg-muted rounded-full font-bold text-xs uppercase tracking-widest text-[9px]"
							>
								Tutup
							</button>
						</div>
					</div>
					<div class="pt-20 pb-10">
						<QrCodePrintGrid
							items={printingMembers()!.map((m) => ({
								id: m.id,
								qrCode: m.qrCode,
								label: m.id.substring(0, 8),
							}))}
						/>
					</div>
					<style>{`@media print { .no-print { display: none !important; } }`}</style>
				</div>
			</Show>

			{/* Member Profile Sheet Aligned with flow */}
			<Show when={selectedCustomer()}>
				<div class="fixed inset-0 z-[110] flex justify-end bg-black/40 backdrop-blur-[2px] p-4">
					<div class="h-full w-full max-w-sm bg-background rounded-[28px] shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto flex flex-col border border-border/20">
						<div class="p-6 flex items-center justify-between border-b border-border/10 sticky top-0 bg-background/80 backdrop-blur-md z-10">
							<h2 class="font-bold text-base">Profil Member</h2>
							<button
								onClick={() => setSelectedCustomer(null)}
								class="p-2 hover:bg-muted rounded-full"
							>
								<X size={18} />
							</button>
						</div>

						<div class="p-6 space-y-6">
							<div class="p-6 bg-card rounded-2xl border border-border/60 shadow-sm relative overflow-hidden">
								<div class="absolute -right-4 -top-4 opacity-5 rotate-12">
									<QrCode size={120} />
								</div>
								<div class="relative flex flex-col gap-6">
									<div class="flex items-center justify-between">
										<div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-lg font-black text-primary">
											{selectedCustomer()
												?.name?.charAt(0)
												.toUpperCase() || <Users size={20} />}
										</div>
										<button
											onClick={() =>
												setPrintingMembers([selectedCustomer()!])
											}
											class="h-9 px-3 rounded-lg border border-border/60 text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold uppercase"
										>
											<Printer size={14} /> Cetak
										</button>
									</div>
									<div>
										<h3 class="text-xl font-bold tracking-tight">
											{selectedCustomer()?.name || "UNREGISTERED"}
										</h3>
										<p class="text-[10px] font-black uppercase text-emerald-600 mt-1">
											{selectedCustomer()?.status === "ASSIGNED"
												? "Member Aktif"
												: "QR Kosong"}
										</p>
									</div>
									<div class="pt-4 border-t border-border/10 flex flex-col">
										<span class="text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] mb-1">
											MEMBER IDENTIFICATION
										</span>
										<span class="text-xs font-mono font-bold text-foreground/80">
											{selectedCustomer()?.id.toUpperCase()}
										</span>
									</div>
								</div>
							</div>

							{/* Progress Tracker */}
							<Show when={customerProgress()}>
								<div class="bg-muted/20 p-5 rounded-2xl border border-border/10">
									<div class="flex items-center justify-between mb-3">
										<h4 class="font-bold text-xs uppercase text-muted-foreground tracking-wider">
											Stamp Keliling
										</h4>
										<span class="text-xs font-bold text-primary">
											{customerProgress()!.currentStamps} /{" "}
											{customerProgress()!.targetStamps}
										</span>
									</div>
									<div class="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-2 shadow-inner">
										<div
											class="h-full bg-primary transition-all duration-1000"
											style={{
												width: `${Math.min(100, (customerProgress()!.currentStamps / customerProgress()!.targetStamps) * 100)}%`,
											}}
										/>
									</div>
									<p class="text-[9px] font-bold text-muted-foreground/60">
										Klaim reward setelah{" "}
										{customerProgress()!.targetStamps} stamp.
									</p>
								</div>
							</Show>

							<div class="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/60">
								<Phone size={16} class="text-muted-foreground/60" />
								<div class="flex-1">
									<p class="text-[10px] font-bold text-muted-foreground/40 uppercase">
										WhatsApp
									</p>
									<p class="text-sm font-bold">
										{selectedCustomer()?.phone || "-"}
									</p>
								</div>
							</div>

							<div class="pt-4">
								<button
									onClick={async () => {
										if (confirm("Hapus member permanen?")) {
											await db.customers.delete(
												selectedCustomer()!.id,
											);
											toast.success("Member dihapus");
											setSelectedCustomer(null);
											refetch();
										}
									}}
									class="w-full h-11 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
								>
									<Trash2 size={16} /> Hapus Member
								</button>
							</div>
						</div>
					</div>
				</div>
			</Show>

			{/* Generate Batch Dialog */}
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
						<div class="grid grid-cols-2 gap-2">
							<For each={[12, 24, 48, 96]}>
								{(num) => (
									<button
										onClick={() => setBatchCount(num)}
										class={`h-10 rounded-xl border font-bold text-xs transition-all ${batchCount() === num ? "border-primary bg-primary/5 text-primary" : "border-border/60 text-muted-foreground"}`}
									>
										{num} PCS
									</button>
								)}
							</For>
						</div>
						<button
							onClick={handleGenerateBatch}
							class="w-full h-11 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20"
						>
							Generate & Print
						</button>
						<button
							onClick={() => setGenerateDialogOpen(false)}
							class="w-full text-[10px] font-black text-muted-foreground uppercase"
						>
							Batal
						</button>
					</div>
				</div>
			</Show>
		</div>
	);
}
