import { createSignal, createResource, Show, For, Index, createMemo, type Accessor } from "solid-js";
import {
	Plus,
	Trash2,
	ArrowLeft,
	Zap,
	CirclePlus,
	X,
	Tag,
	Layers,
	Upload,
} from "lucide-solid";
import { A } from "@solidjs/router";
import {
	db,
	type Product,
	type RawMaterialCost,
	type VariantGroup,
	type VariantOption,
	type VariantTemplate,
} from "~/db/db";
import { Button } from "~/components/ui/button";
import { ProductImage } from "~/components/ProductImage";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { ConfirmDialog } from "~/components/ConfirmDialog";

// ────────────── Utilities ──────────────
function calcMargin(price: number, cogs: number) {
	if (price <= 0) return 0;
	return Math.round(((price - cogs) / price) * 100);
}

// ────────────── Main Component ──────────────
export default function ProductsManager() {
	const [products, { refetch }] = createResource(
		async () => await db.products.toArray(),
	);
	const [categories] = createResource(
		async () => await db.categories.orderBy("orderIndex").toArray(),
	);
	const [variantTemplates, { refetch: refetchTemplates }] = createResource(
		async () => await db.variantTemplates.orderBy("name").toArray(),
	);
	const [materialsLibrary, { refetch: refetchMaterials }] = createResource(
		async () => await db.rawMaterialLibrary.orderBy("name").toArray(),
	);

	const [sheetOpen, setSheetOpen] = createSignal(false);
	const [isEditing, setIsEditing] = createSignal(false);
	const [isSaving, setIsSaving] = createSignal(false);
	const [activeTab, setActiveTab] = createSignal<"info" | "hpp" | "variants">(
		"info",
	);

	// ── Form state ──
	const [formId, setFormId] = createSignal("");
	const [formName, setFormName] = createSignal("");
	const [formPrice, setFormPrice] = createSignal("0");
	const [formCategoryId, setFormCategoryId] = createSignal("");
	const [formStock, setFormStock] = createSignal("0");
	const [formImage, setFormImage] = createSignal("");
	const [formRaw, setFormRaw] = createSignal<RawMaterialCost[]>([]);
	const [formVariants, setFormVariants] = createSignal<VariantGroup[]>([]);

	// Variant & Material template manager
	const [showTemplateLib, setShowTemplateLib] = createSignal(false);
	const [showMaterialLib, setShowMaterialLib] = createSignal(false);

	// Delete confirmation state
	const [deleteTargetId, setDeleteTargetId] = createSignal<string | null>(
		null,
	);
	const [alertMessage, setAlertMessage] = createSignal<string | null>(null);
	const [isDeleting, setIsDeleting] = createSignal(false);

	const totalHPP = createMemo(() =>
		formRaw().reduce((s, r) => s + (r.costPerUnit || r.cost) * r.quantity, 0),
	);
	const marginPct = createMemo(() =>
		calcMargin(Number.parseInt(formPrice()) || 0, totalHPP()),
	);

	// ── Open helpers ──
	function openAdd() {
		setIsEditing(false);
		setFormId(`prod_${Date.now()}`);
		setFormName("");
		setFormPrice("0");
		setFormCategoryId(categories()?.[0]?.name ?? "Kopi");
		setFormStock("0");
		setFormImage("");
		setFormRaw([]);
		setFormVariants([]);
		setActiveTab("info");
		setSheetOpen(true);
	}

	function openEdit(p: Product) {
		setIsEditing(true);
		setFormId(p.id);
		setFormName(p.name);
		setFormPrice(p.price.toString());
		setFormCategoryId(p.category);
		setFormStock(p.stock.toString());
		setFormImage(p.image || "");
		setFormRaw(structuredClone(p.rawMaterials ?? []));
		setFormVariants(structuredClone(p.variants ?? []));
		setActiveTab("info");
		setSheetOpen(true);
	}

	// ── Save ──
	async function saveProduct(e: Event) {
		e.preventDefault();
		if (isSaving()) return;
		setIsSaving(true);
		try {
			const price = Number.parseInt(formPrice()) || 0;
			const cogs = totalHPP() > 0 ? totalHPP() : price * 0.45;
			const product: Product = {
				id: formId(),
				name: formName(),
				price,
				cogs,
				category: formCategoryId(),
				stock: Number.parseInt(formStock()) || 0,
				image: formImage(),
				rawMaterials: formRaw().length > 0 ? formRaw() : undefined,
				variants: formVariants().length > 0 ? formVariants() : undefined,
			};
			const { id: _id, ...updateData } = product;
			if (isEditing()) await db.products.update(formId(), updateData);
			else await db.products.add(product);
			setSheetOpen(false);
			refetch();
		} finally {
			setIsSaving(false);
		}
	}

	async function deleteProduct(id: string, e: Event) {
		e.stopPropagation();
		setDeleteTargetId(id);
	}

	async function confirmDeleteProduct() {
		const id = deleteTargetId();
		if (!id) return;
		setIsDeleting(true);
		try {
			await db.products.delete(id);
			refetch();
		} finally {
			setIsDeleting(false);
			setDeleteTargetId(null);
		}
	}

	// ── HPP helpers ──
	function addRaw() {
		setFormRaw([
			...formRaw(),
			{ id: `raw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name: "", costPerUnit: 0, cost: 0, quantity: 1, unit: "" },
		]);
	}
	function updateRaw(
		i: number,
		field: keyof RawMaterialCost,
		val: string | number,
	) {
		setFormRaw((prev) => {
			const next = [...prev];
			const item = { ...next[i], [field]: val };

			// Auto calculate total line cost
			if (field === "quantity" || field === "costPerUnit") {
				item.cost = (item.quantity || 0) * (item.costPerUnit || 0);
			}

			next[i] = item as RawMaterialCost;
			return next;
		});
	}
	function removeRaw(i: number) {
		setFormRaw(formRaw().filter((_, idx) => idx !== i));
	}

	async function saveMaterialToLibrary(raw: RawMaterialCost) {
		if (!raw.name) return;
		await db.rawMaterialLibrary.put({
			id: `mat_${Date.now()}`,
			name: raw.name,
			unit: raw.unit,
			costPerUnit: raw.costPerUnit || raw.cost || 0,
		});
		setAlertMessage(`Bahan "${raw.name}" disimpan ke library.`);
		refetchMaterials();
	}

	function addFromMaterialLibrary(lib: any) {
		setFormRaw([
			...formRaw(),
			{
				id: `raw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				name: lib.name,
				costPerUnit: lib.costPerUnit,
				cost: lib.costPerUnit,
				quantity: 1,
				unit: lib.unit,
			},
		]);
		setShowMaterialLib(false);
	}

	// ── Variant helpers ──
	function addGroup() {
		setFormVariants([
			...formVariants(),
			{
				id: `vg_${Date.now()}`,
				name: "Pilihan",
				isRequired: false,
				type: "SINGLE",
				options: [],
			},
		]);
	}
	function updateGroup(i: number, field: keyof VariantGroup, val: any) {
		const arr = [...formVariants()];
		(arr[i] as any)[field] = val;
		setFormVariants(arr);
	}
	function removeGroup(i: number) {
		setFormVariants(formVariants().filter((_, idx) => idx !== i));
	}
	function addOption(gi: number) {
		setFormVariants((prev) => {
			const next = [...prev];
			next[gi] = {
				...next[gi],
				options: [
					...next[gi].options,
					{ name: "", priceModifier: 0, cogsModifier: 0 },
				],
			};
			return next;
		});
	}
	function updateOption(
		gi: number,
		oi: number,
		field: keyof VariantOption,
		val: any,
	) {
		const arr = [...formVariants()];
		arr[gi].options[oi] = { ...arr[gi].options[oi], [field]: val };
		setFormVariants(arr);
	}
	function removeOption(gi: number, oi: number) {
		setFormVariants((prev) => {
			const next = [...prev];
			next[gi] = {
				...next[gi],
				options: next[gi].options.filter((_, idx) => idx !== oi),
			};
			return next;
		});
	}

	// ── Variant Template helpers ──
	async function saveAsTemplate(vg: VariantGroup) {
		const existing = await db.variantTemplates
			.where("name")
			.equals(vg.name)
			.first();
		if (existing) {
			setAlertMessage(`Template "${vg.name}" sudah ada di library.`);
			return;
		}
		await db.variantTemplates.add({
			id: `vt_${Date.now()}`,
			name: vg.name,
			isRequired: vg.isRequired,
			type: vg.type,
			options: vg.options,
		});
		refetchTemplates();
		setAlertMessage(`Template "${vg.name}" berhasil disimpan ke library!`);
	}

	function assignFromTemplate(tpl: VariantTemplate) {
		const alreadyAdded = formVariants().some((v) => v.name === tpl.name);
		if (alreadyAdded) {
			setAlertMessage(`Varian "${tpl.name}" sudah ditambahkan.`);
			return;
		}
		setFormVariants([
			...formVariants(),
			{
				id: `vg_${Date.now()}`,
				name: tpl.name,
				isRequired: tpl.isRequired,
				type: tpl.type,
				options: [...tpl.options],
			},
		]);
		setShowTemplateLib(false);
	}

	// ── Tabs ──
	const TAB_LABELS = [
		{ key: "info", label: "INFO DASAR" },
		{ key: "hpp", label: "RESEP & HPP" },
		{ key: "variants", label: "VARIASI" },
	] as const;

	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-24">
			{/* Header */}
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
							Katalog Produk
						</h1>
						<span class="text-xs font-semibold text-muted-foreground mt-0.5 block">
							Inventaris & HPP
						</span>
					</div>
				</div>
				<Button
					onClick={openAdd}
					class="h-10 px-4 rounded-full font-bold text-sm shadow-sm active:scale-95 transition-all"
				>
					<Plus size={15} class="mr-1.5" stroke-width={2.5} /> Tambah
				</Button>
			</div>

			{/* Confirm Delete Product */}
			<ConfirmDialog
				open={deleteTargetId() !== null}
				onOpenChange={(v) => !v && setDeleteTargetId(null)}
				title="Hapus Produk?"
				description="Produk ini akan dihapus secara permanen dari katalog."
				confirmLabel="Ya, Hapus"
				variant="danger"
				loading={isDeleting()}
				onConfirm={confirmDeleteProduct}
			/>

			{/* Alert / Info Dialog */}
			<ConfirmDialog
				open={alertMessage() !== null}
				onOpenChange={(v) => !v && setAlertMessage(null)}
				title="Informasi"
				description={alertMessage() ?? ""}
				confirmLabel="OK"
				cancelLabel=""
				variant="info"
				onConfirm={() => setAlertMessage(null)}
			/>

			{/* Product List */}
			<div class="flex flex-col gap-2.5 p-4">
				<Show
					when={products() && products()!.length > 0}
					fallback={
						<div class="flex flex-col items-center py-20 text-muted-foreground gap-4">
							<div class="w-14 h-14 rounded-full bg-muted flex items-center justify-center border border-border/50">
								<Tag size={22} class="opacity-40" />
							</div>
							<div class="text-center">
								<p class="font-bold text-sm">Belum ada produk</p>
								<p class="text-xs mt-1 text-muted-foreground">
									Tambahkan produk pertama Anda.
								</p>
							</div>
						</div>
					}
				>
					<For each={products()}>
						{(p) => (
							<button
								type="button"
								class="flex items-center w-full text-left gap-3 bg-card px-3.5 py-3 rounded-2xl border border-border/60 shadow-sm cursor-pointer hover:border-primary/30 transition-all active:scale-[0.99] group"
								onClick={() => openEdit(p)}
							>
								<div class="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/50">
									<ProductImage src={p.image} name={p.name} />
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="font-bold text-sm leading-tight truncate">
										{p.name}
									</h3>
									<div class="flex items-center gap-1 mt-1 flex-wrap">
										<span class="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
											{p.category}
										</span>
										<Show when={p.variants && p.variants.length > 0}>
											<span class="text-xs font-semibold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
												<Layers size={9} /> Varian
											</span>
										</Show>
										<Show
											when={
												p.rawMaterials && p.rawMaterials.length > 0
											}
										>
											<span class="text-xs font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
												Margin {calcMargin(p.price, p.cogs)}%
											</span>
										</Show>
									</div>
									<p class="text-xs mt-1.5 flex items-center gap-2 font-bold">
										<span class="text-foreground">
											Rp {p.price.toLocaleString("id-ID")}
										</span>
										<Show when={p.cogs > 0}>
											<span class="text-muted-foreground/30">•</span>
											<span class="text-primary/70">
												HPP Rp {p.cogs.toLocaleString("id-ID")}
											</span>
										</Show>
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon"
									class="h-8 w-8 rounded-full hover:bg-red-50 shrink-0 text-muted-foreground hover:text-red-500 transition-colors ml-auto"
									onClick={(e) => {
										e.stopPropagation();
										deleteProduct(p.id, e);
									}}
								>
									<Trash2 size={13} />
								</Button>
							</button>
						)}
					</For>
				</Show>
			</div>

			{/* Edit / Add Sheet — Mobile-First */}
			<Sheet open={sheetOpen()} onOpenChange={setSheetOpen}>
				<SheetContent
					position="bottom"
					class="h-[96vh] rounded-t-[32px] flex flex-col p-0 border-none shadow-[0_-20px_60px_rgba(0,0,0,0.15)]"
				>
					{/* Sheet Header */}
					<SheetHeader class="px-5 pt-6 pb-4 border-b border-border/50 shrink-0">
						<SheetTitle class="font-black text-xl tracking-tight">
							{isEditing() ? "Edit Produk" : "Tambah Produk"}
						</SheetTitle>
					</SheetHeader>

					{/* Tab Bar — underline style, konsisten */}
					<div class="flex px-5 border-b border-border/40 bg-background shrink-0">
						<For each={TAB_LABELS}>
							{(tab) => (
								<button
									type="button"
									onClick={() => setActiveTab(tab.key)}
									class={`flex-1 py-3 text-sm font-bold transition-all relative ${
										activeTab() === tab.key
											? "text-primary"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									{tab.label}
									<Show when={activeTab() === tab.key}>
										<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
									</Show>
								</button>
							)}
						</For>
					</div>

					{/* Scrollable form body */}
					<form
						id="product-form"
						onSubmit={saveProduct}
						class="flex-1 overflow-y-auto"
					>
						{/* ── Tab 1: Info Dasar ── */}
						<Show when={activeTab() === "info"}>
							<div class="flex flex-col gap-4 p-4">
								<div class="flex flex-col gap-1.5">
									<label
										for="prod-name"
										class="text-xs font-bold uppercase tracking-widest text-muted-foreground"
									>
										Nama Produk
									</label>
									<input
										id="prod-name"
										required
										type="text"
										class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-medium text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
										value={formName()}
										onInput={(e) =>
											setFormName(e.currentTarget.value)
										}
										placeholder="Nama produk..."
									/>
								</div>

								<div class="grid grid-cols-2 gap-3">
									<div class="flex flex-col gap-1.5">
										<label
											for="prod-price"
											class="text-xs font-bold uppercase tracking-widest text-muted-foreground"
										>
											Harga Jual (Rp)
										</label>
										<input
											id="prod-price"
											required
											type="number"
											class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-bold text-base focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
											value={formPrice()}
											onInput={(e) =>
												setFormPrice(e.currentTarget.value)
											}
										/>
									</div>
									<div class="flex flex-col gap-1.5">
										<label
											for="prod-stock"
											class="text-xs font-bold uppercase tracking-widest text-muted-foreground"
										>
											Stok Awal
										</label>
										<input
											id="prod-stock"
											required
											type="number"
											class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-bold text-base focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
											value={formStock()}
											onInput={(e) =>
												setFormStock(e.currentTarget.value)
											}
										/>
									</div>
								</div>

								<div class="flex flex-col gap-1.5">
									<label
										for="prod-cat"
										class="text-xs font-bold uppercase tracking-widest text-muted-foreground"
									>
										Kategori
									</label>
									<select
										id="prod-cat"
										required
										class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-medium text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
										value={formCategoryId()}
										onChange={(e) =>
											setFormCategoryId(e.currentTarget.value)
										}
									>
										<For each={categories()}>
											{(cat) => (
												<option value={cat.name}>{cat.name}</option>
											)}
										</For>
									</select>
								</div>

								{/* ── Foto Produk Upload ── */}
								<div class="flex flex-col gap-2 mt-2">
									<label class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">
										Foto Produk
									</label>
									<div class="flex gap-4 items-center bg-card p-4 rounded-2xl border-2 border-border/60 shadow-sm transition-all hover:border-primary/30">
										<div class="w-20 h-20 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border/40 shadow-inner">
											<ProductImage
												src={formImage()}
												name={formName() || "Produk"}
											/>
										</div>
										<div class="flex flex-col gap-2 flex-1">
											<label class="cursor-pointer">
												<input
													type="file"
													accept="image/*"
													class="hidden"
													onChange={(e) => {
														const file =
															e.currentTarget.files?.[0];
														if (!file) return;
														const reader = new FileReader();
														reader.onload = (prev) =>
															setFormImage(
																prev.target?.result as string,
															);
														reader.readAsDataURL(file);
													}}
												/>
												<div class="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all">
													<Upload size={14} stroke-width={3} />{" "}
													Pilih Foto
												</div>
											</label>
											<Show when={formImage()}>
												<button
													type="button"
													onClick={() => setFormImage("")}
													class="h-9 px-4 rounded-xl bg-muted/50 text-muted-foreground font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-red-50 hover:text-red-500 transition-all"
												>
													<Trash2 size={12} /> Hapus Foto
												</button>
											</Show>
										</div>
									</div>
									<p class="text-[10px] font-bold text-muted-foreground/60 px-1 italic">
										Gunakan foto persegi (1:1) untuk hasil terbaik.
									</p>
								</div>
							</div>
						</Show>

						{/* ── Tab 2: Resep & HPP ── */}
						<Show when={activeTab() === "hpp"}>
							<div class="flex flex-col gap-4 p-5">
								{/* Margin indicator */}
								<div
									class={`flex items-center justify-between p-4 rounded-2xl border-2 ${marginPct() >= 40 ? "border-emerald-200 bg-emerald-50" : "border-orange-200 bg-orange-50"}`}
								>
									<div>
										<p class="text-xs font-black uppercase tracking-widest text-muted-foreground">
											Estimasi Margin
										</p>
										<p
											class={`text-3xl font-black tracking-tighter ${marginPct() >= 40 ? "text-emerald-600" : "text-orange-600"}`}
										>
											{marginPct()}%
										</p>
									</div>
									<div class="text-right">
										<p class="text-xs font-black text-muted-foreground uppercase tracking-widest">
											Total HPP
										</p>
										<p class="font-black text-lg">
											Rp {totalHPP().toLocaleString("id-ID")}
										</p>
									</div>
								</div>

								<p class="text-sm font-bold text-muted-foreground">
									Masukkan bahan baku dan biayanya agar margin
									keuntungan terhitung otomatis.
								</p>

								<div class="flex flex-col gap-4">
									{/* Library Picker Section */}
									<Show when={showMaterialLib()}>
										<div class="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-3">
											<div class="flex items-center justify-between">
												<p class="text-xs font-bold uppercase tracking-widest text-primary">
													Pilih dari Library Bahan
												</p>
												<button
													type="button"
													onClick={() => setShowMaterialLib(false)}
													class="text-muted-foreground hover:text-foreground"
												>
													<X size={15} />
												</button>
											</div>
											<Show
												when={
													materialsLibrary() &&
													materialsLibrary()!.length > 0
												}
												fallback={
													<p class="text-xs text-muted-foreground py-2">
														Belum ada bahan di library.
													</p>
												}
											>
												<div class="flex flex-col gap-2">
													<For each={materialsLibrary()}>
														{(lib) => (
															<button
																type="button"
																onClick={() =>
																	addFromMaterialLibrary(lib)
																}
																class="flex items-center justify-between px-4 py-3 bg-card rounded-xl border border-border/60 hover:border-primary/40 text-left transition-all active:scale-[0.98]"
															>
																<div>
																	<p class="font-bold text-sm">
																		{lib.name}
																	</p>
																	<p class="text-xs text-muted-foreground mt-0.5">
																		Rp {lib.costPerUnit.toLocaleString("id-ID")}/{lib.unit}
																	</p>
																</div>
																<Plus
																	size={16}
																	class="text-primary shrink-0"
																/>
															</button>
														)}
													</For>
												</div>
											</Show>
										</div>
									</Show>

									<Index each={formRaw()}>
										{(raw: Accessor<RawMaterialCost>, i: number) => {
											// In <Index>, 'raw' is an accessor/signal for the item at that index
											const lineTotal = createMemo(() => (raw().quantity || 0) * (raw().costPerUnit || raw().cost || 0));
											
											return (
												<div class="flex flex-col gap-3 bg-card p-4 rounded-2xl border border-border/60 shadow-sm hover:border-primary/20 transition-all">
													<div class="flex items-center justify-between">
														<span class="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
															Bahan #{i + 1}
														</span>
														<div class="flex items-center gap-1">
															<button 
																type="button"
																onClick={() => saveMaterialToLibrary(raw())}
																class="text-xs font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors"
																title="Simpan ke library"
															>
																Simpan Library
															</button>
															<Button
																type="button"
																variant="ghost"
																size="icon"
																class="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-50"
																onClick={() => removeRaw(i)}
															>
																<Trash2 size={15} />
															</Button>
														</div>
													</div>
													
													<div class="flex flex-col gap-1.5">
														<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nama Bahan Baku</p>
														<input
															type="text"
															class="h-11 w-full rounded-xl border border-border/70 bg-background px-4 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
															placeholder="Contoh: Biji Kopi Arabica"
															value={raw().name}
															onInput={(e) =>
																updateRaw(i, "name", e.currentTarget.value)
															}
														/>
													</div>

													<div class="grid grid-cols-3 gap-3">
														<div class="flex flex-col gap-1.5">
															<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Qty</p>
															<input
																type="number"
																class="h-11 w-full rounded-xl border border-border/70 bg-background px-4 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
																value={raw().quantity}
																onInput={(e) =>
																	updateRaw(i, "quantity", Number.parseFloat(e.currentTarget.value))
																}
															/>
														</div>
														<div class="flex flex-col gap-1.5">
															<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Unit</p>
															<input
																type="text"
																class="h-11 w-full rounded-xl border border-border/70 bg-background px-4 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
																placeholder="gr, ml, pcs"
																value={raw().unit}
																onInput={(e) =>
																	updateRaw(i, "unit", e.currentTarget.value)
																}
															/>
														</div>
														<div class="flex flex-col gap-1.5">
															<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Hrg Satuan</p>
															<div class="relative">
																<span class="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground">Rp</span>
																<input
																	type="number"
																	class="h-11 w-full rounded-xl border border-border/70 bg-background pl-8 pr-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
																	value={raw().costPerUnit || raw().cost}
																	onInput={(e) =>
																		updateRaw(i, "costPerUnit", Number.parseInt(e.currentTarget.value) || 0)
																	}
																/>
															</div>
														</div>
													</div>

													<div class="mt-1 flex items-center justify-between px-2 pt-2 border-t border-border/40 border-dashed">
														<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Kalkulasi Total</p>
														<p class="text-sm font-black text-primary">
															Rp {lineTotal().toLocaleString("id-ID")}
														</p>
													</div>
												</div>
											);
										}}
									</Index>

									<div class="flex gap-2">
										<button
											type="button"
											onClick={() => setShowMaterialLib(true)}
											class="flex-1 h-12 rounded-2xl border-2 border-dashed border-primary/40 text-primary text-xs font-black hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
										>
											<Layers size={16} /> Dari Library
										</button>
										<button
											type="button"
											onClick={addRaw}
											class="flex-1 h-12 rounded-2xl border-2 border-dashed border-border/60 text-muted-foreground text-xs font-black hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
										>
											<Plus size={16} /> Tambah Bahan
										</button>
									</div>
								</div>
							</div>
						</Show>

						{/* ── Tab 3: Varian ── */}
						<Show when={activeTab() === "variants"}>
							<div class="flex flex-col gap-4 p-4">
								{/* Library picker */}
								<Show when={showTemplateLib()}>
									<div class="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-3">
										<div class="flex items-center justify-between">
											<p class="text-xs font-bold uppercase tracking-widest text-primary">
												Pilih dari Library Varian
											</p>
											<button
												type="button"
												onClick={() => setShowTemplateLib(false)}
												class="text-muted-foreground hover:text-foreground"
											>
												<X size={15} />
											</button>
										</div>
										<Show
											when={
												variantTemplates() &&
												variantTemplates()!.length > 0
											}
											fallback={
												<p class="text-xs text-muted-foreground py-2">
													Belum ada template tersimpan. Buat grup
													varian baru lalu simpan sebagai template.
												</p>
											}
										>
											<div class="flex flex-col gap-2">
												<For each={variantTemplates()}>
													{(tpl) => (
														<button
															type="button"
															onClick={() =>
																assignFromTemplate(tpl)
															}
															class="flex items-center justify-between px-4 py-3 bg-card rounded-xl border border-border/60 hover:border-primary/40 text-left transition-all active:scale-[0.98]"
														>
															<div>
																<p class="font-bold text-sm">
																	{tpl.name}
																</p>
																<p class="text-xs text-muted-foreground mt-0.5">
																	{tpl.type === "SINGLE"
																		? "Satu pilihan"
																		: "Multi pilihan"}{" "}
																	· {tpl.options.length} opsi
																</p>
															</div>
															<Plus
																size={16}
																class="text-primary shrink-0"
															/>
														</button>
													)}
												</For>
											</div>
										</Show>
									</div>
								</Show>

								{/* Active variant groups */}
								<For each={formVariants()}>
									{(vg, gi) => (
										<div class="flex flex-col gap-3 bg-card p-4 rounded-2xl border border-border/70">
											<div class="flex items-center justify-between">
												<span class="text-xs font-bold text-muted-foreground uppercase tracking-widest">
													Grup #{gi() + 1}
												</span>
												<div class="flex items-center gap-1">
													<button
														type="button"
														onClick={() => saveAsTemplate(vg)}
														class="text-xs font-bold text-primary hover:underline px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
														title="Simpan sebagai template library"
													>
														Simpan Template
													</button>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														class="h-7 w-7 text-red-400 hover:text-red-500"
														onClick={() => removeGroup(gi())}
													>
														<X size={15} />
													</Button>
												</div>
											</div>

											<input
												type="text"
												class="h-11 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
												placeholder="Nama grup, mis: Pilihan Ukuran"
												value={vg.name}
												onInput={(e) =>
													updateGroup(
														gi(),
														"name",
														e.currentTarget.value,
													)
												}
											/>

											<div class="grid grid-cols-2 gap-2">
												<div class="flex flex-col gap-1">
													<label
														for={`type-${gi()}`}
														class="text-xs font-black text-muted-foreground uppercase tracking-widest"
													>
														Tipe
													</label>
													<select
														id={`type-${gi()}`}
														class="h-10 rounded-xl border border-border/60 bg-muted/30 px-3 font-bold text-sm focus:outline-none"
														value={vg.type}
														onChange={(e) =>
															updateGroup(
																gi(),
																"type",
																e.currentTarget.value as
																	| "SINGLE"
																	| "MULTIPLE",
															)
														}
													>
														<option value="SINGLE">
															Satu pilihan
														</option>
														<option value="MULTIPLE">
															Multi pilihan
														</option>
													</select>
												</div>
												<Show when={vg.type === "MULTIPLE"}>
													<div class="flex flex-col gap-1">
														<label
															for={`max-${gi()}`}
															class="text-xs font-black text-muted-foreground uppercase tracking-widest"
														>
															Maks Pilih
														</label>
														<input
															id={`max-${gi()}`}
															type="number"
															class="h-10 w-16 rounded-xl border border-border/60 bg-muted/30 px-3 font-bold text-sm focus:outline-none text-center"
															placeholder="0"
															value={vg.maxSelectable || ""}
															onInput={(e) =>
																updateGroup(
																	gi(),
																	"maxSelectable",
																	Number.parseInt(
																		e.currentTarget.value,
																	) || 0,
																)
															}
														/>
													</div>
												</Show>
												<div class="flex flex-col gap-1">
													<label
														for={`req-${gi()}`}
														class="text-xs font-black text-muted-foreground uppercase tracking-widest"
													>
														Status
													</label>
													<select
														id={`req-${gi()}`}
														class="h-10 rounded-xl border border-border/60 bg-muted/30 px-3 font-bold text-sm focus:outline-none"
														value={vg.isRequired ? "1" : "0"}
														onChange={(e) =>
															updateGroup(
																gi(),
																"isRequired",
																e.currentTarget.value === "1",
															)
														}
													>
														<option value="0">Opsional</option>
														<option value="1">
															Wajib dipilih
														</option>
													</select>
												</div>
											</div>

											{/* Options List */}
											<div class="flex flex-col gap-3 bg-muted/20 p-3 rounded-2xl border border-border/50">
												<For each={vg.options}>
													{(opt, oi) => (
														<div class="relative flex flex-col gap-3 p-4 bg-background border border-border/60 rounded-2xl shadow-sm hover:border-primary/30 transition-all group">
															{/* Row 1: Name & Delete */}
															<div class="flex items-end gap-2">
																<div class="flex-1 flex flex-col gap-1.5">
																	<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
																		Nama Opsi
																	</p>
																	<input
																		type="text"
																		class="w-full h-11 rounded-xl border border-border/60 bg-background px-4 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
																		placeholder="Contoh: Ekstra Topping"
																		value={opt.name}
																		onInput={(e) =>
																			updateOption(
																				gi(),
																				oi(),
																				"name",
																				e.currentTarget.value,
																			)
																		}
																	/>
																</div>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	class="h-11 w-11 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-50 shrink-0 border border-transparent hover:border-red-100 transition-all"
																	onClick={() => removeOption(gi(), oi())}
																>
																	<Trash2 size={18} />
																</Button>
															</div>

															{/* Row 2: Pricing & HPP */}
															<div class="grid grid-cols-2 gap-3">
																<div class="flex flex-col gap-1.5">
																	<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
																		Harga +/-
																	</p>
																	<div class="relative">
																		<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">
																			Rp
																		</span>
																		<input
																			type="number"
																			class="w-full h-11 rounded-xl border border-border/60 bg-background pl-10 pr-4 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
																			placeholder="0"
																			value={opt.priceModifier}
																			onInput={(e) =>
																				updateOption(
																					gi(),
																					oi(),
																					"priceModifier",
																					Number.parseInt(
																						e.currentTarget.value,
																					) || 0,
																				)
																			}
																		/>
																	</div>
																</div>
																<div class="flex flex-col gap-1.5">
																	<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
																		HPP +/-
																	</p>
																	<div class="relative">
																		<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-primary/60">
																			Rp
																		</span>
																		<input
																			type="number"
																			class="w-full h-11 rounded-xl border border-primary/20 bg-primary/5 pl-10 pr-4 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 text-primary transition-all underline-offset-4"
																			placeholder="0"
																			value={opt.cogsModifier}
																			onInput={(e) =>
																				updateOption(
																					gi(),
																					oi(),
																					"cogsModifier",
																					Number.parseInt(
																						e.currentTarget.value,
																					) || 0,
																				)
																			}
																		/>
																	</div>
																</div>
															</div>
														</div>
													)}
												</For>
												<button
													type="button"
													onClick={() => addOption(gi())}
													class="mt-2 h-12 text-xs font-black border border-dashed border-border/60 rounded-xl text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-white transition-all w-full flex items-center justify-center gap-2"
												>
													<Plus size={16} /> Tambah Opsi
												</button>
											</div>
										</div>
									)}
								</For>

								{/* Action buttons */}
								<div class="flex gap-2">
									<button
										type="button"
										onClick={() => setShowTemplateLib(true)}
										class="flex-1 h-11 rounded-xl border border-dashed border-primary/50 text-primary text-xs font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5"
									>
										<Layers size={14} /> Dari Library
									</button>
									<button
										type="button"
										onClick={addGroup}
										class="flex-1 h-11 rounded-xl border border-dashed border-border/60 text-muted-foreground text-xs font-bold hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5"
									>
										<CirclePlus size={14} /> Buat Grup Baru
									</button>
								</div>
							</div>
						</Show>
					</form>

					{/* Sticky footer */}
					<div class="px-4 pb-8 pt-3.5 border-t border-border/50 bg-background shrink-0">
						<Button
							type="submit"
							form="product-form"
							disabled={isSaving()}
							class="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-none transition-all"
						>
							{isSaving() ? (
								<div class="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
							) : (
								<>
									<Zap size={16} />{" "}
									{isEditing() ? "Perbarui Produk" : "Simpan Produk"}
								</>
							)}
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
