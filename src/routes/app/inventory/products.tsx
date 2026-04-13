import {
	createSignal,
	createResource,
	Show,
	For,
	Index,
	createMemo,
	type Accessor,
} from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
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
	Copy,
	Search,
	Grid3X3,
	List,
} from "lucide-solid";
import { A, useNavigate } from "@solidjs/router";
import {
	db,
	type Product,
	type RawMaterialCost,
	type VariantGroup,
	type VariantOption,
	type VariantTemplate,
	type Discount,
	type Bundle,
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
import { toast } from "solid-toast";
import { getProductAvailability } from "~/lib/availability";

// ────────────── Types ──────────────
interface IngredientAdjustment {
	materialId: string;
	adjustment: number;
}

// ────────────── Utilities ──────────────
function calcMargin(price: number, cogs: number) {
	if (price <= 0) return 0;
	return Math.round(((price - cogs) / price) * 100);
}

function getMarginStatus(m: number) {
	if (m < 30)
		return {
			label: "Kritis",
			color: "text-red-600",
			bg: "bg-red-50",
			border: "border-red-200",
		};
	if (m <= 44)
		return {
			label: "Tipis",
			color: "text-orange-600",
			bg: "bg-orange-50",
			border: "border-orange-200",
		};
	if (m <= 71)
		return {
			label: "Sehat",
			color: "text-emerald-600",
			bg: "bg-emerald-50",
			border: "border-emerald-200",
		};
	return {
		label: "Optimal",
		color: "text-blue-600",
		bg: "bg-blue-50",
		border: "border-blue-200",
	};
}

// ────────────── Main Component ──────────────
export default function ProductsManager() {
	const navigate = useNavigate();
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
	const [allDiscounts, { refetch: refetchDiscounts }] = createResource(
		async () => await db.discounts.toArray(),
	);
	const [allBundles, { refetch: refetchBundles }] = createResource(
		async () => await db.bundles.toArray(),
	);

	const [sheetOpen, setSheetOpen] = createSignal(false);
	const [isEditing, setIsEditing] = createSignal(false);
	const [isSaving, setIsSaving] = createSignal(false);
	const [activeTab, setActiveTab] = createSignal<"info" | "hpp" | "variants">(
		"info",
	);
	const [showMarginGuide, setShowMarginGuide] = createSignal(false);

	// ── Form state ──
	const [formId, setFormId] = createSignal("");
	const [formName, setFormName] = createSignal("");
	const [formPrice, setFormPrice] = createSignal("0");
	const [formCategoryId, setFormCategoryId] = createSignal("");
	const [formStock, setFormStock] = createSignal("0");
	const [formImage, setFormImage] = createSignal("");
	const [formIsActive, setFormIsActive] = createSignal(true);
	const [formRaw, setFormRaw] = createSignal<RawMaterialCost[]>([]);
	const [formVariants, setFormVariants] = createStore<VariantGroup[]>([]);
	const [formDiscount, setFormDiscount] = createSignal<Partial<Discount>>({
		name: "",
		type: "PERCENT",
		value: 0,
		buyQty: 1,
		getQty: 1,
		isActive: false,
	});

	// Variant & Material template manager
	const [showTemplateLib, setShowTemplateLib] = createSignal(false);
	const [showMaterialLib, setShowMaterialLib] = createSignal(false);

	// ── Search & View state ──
	const [searchQuery, setSearchQuery] = createSignal("");
	const [viewMode, setViewMode] = createSignal<"grid" | "list">(
		(localStorage.getItem("products_view_mode") as "grid" | "list") || "list"
	);
	function toggleViewMode() {
		const next = viewMode() === "list" ? "grid" : "list";
		setViewMode(next);
		localStorage.setItem("products_view_mode", next);
	}

	// ── Filtered products ──
	const filteredProducts = createMemo(() => {
		const list = products();
		if (!list) return [];
		const q = searchQuery().toLowerCase().trim();
		if (!q) return list;
		return list.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				p.category.toLowerCase().includes(q)
		);
	});

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
		setFormIsActive(true);
		setFormRaw([]);
		setFormVariants(reconcile([]));
		setFormDiscount({
			name: "",
			type: "PERCENT",
			value: 0,
			buyQty: 1,
			getQty: 1,
			isActive: false,
		});
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
		setFormIsActive(p.isActive ?? true);
		setFormRaw(p.rawMaterials || []);
		setFormVariants(reconcile(p.variants || []));

		const existingDisc = allDiscounts()?.find((d) => d.productId === p.id);
		if (existingDisc) {
			setFormDiscount(structuredClone(existingDisc));
		} else {
			setFormDiscount({
				name: "",
				type: "PERCENT",
				value: 0,
				buyQty: 1,
				getQty: 1,
				isActive: false,
				productId: p.id,
			});
		}

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
				stock: 0, // Dikosongkan karena tidak dipakai di level produk pada sistem F&B ini
				isActive: formIsActive(),
				image: formImage(),
				rawMaterials: formRaw().length > 0 ? formRaw() : undefined,
				variants: formVariants.length > 0 ? [...formVariants] : undefined,
			};
			const { id: _id, ...updateData } = product;
			if (isEditing()) await db.products.update(formId(), updateData);
			else await db.products.add(product);

			// Save Discount
			const disc = formDiscount();
			if (disc.isActive && disc.name) {
				await db.discounts.put({
					...(disc as Discount),
					id: disc.id || `disc_${Date.now()}`,
					productId: formId(),
				});
			} else if (disc.id) {
				await db.discounts.update(disc.id, { isActive: false });
			}

			setSheetOpen(false);
			refetch();
			refetchDiscounts();
		} finally {
			setIsSaving(false);
		}
	}

	async function deleteProduct(id: string, e: Event) {
		e.stopPropagation();
		setDeleteTargetId(id);
	}

	async function toggleActive(p: Product, e: Event) {
		e.stopPropagation();
		await db.products.update(p.id, { isActive: !(p.isActive ?? true) });
		refetch();
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
			{
				id: `raw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				name: "",
				costPerUnit: 0,
				cost: 0,
				quantity: 1,
				unit: "",
			},
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

	async function syncAllPrices() {
		toast.dismiss(); // Bersihkan notifikasi lama agar tidak 'nyangkut'
		const lib = materialsLibrary();
		if (!lib) return;

		let updated = false;
		let repairedCount = 0;
		let addedCount = 0;

		const newRaw = await Promise.all(formRaw().map(async (r) => {
			let match = lib.find((m) => m.id === r.id);
			
			// 1. Cari berdasarkan NAMA jika ID tidak ketemu (SMART SYNC)
			if (!match) {
				const nameMatch = lib.find(m => m.name.toLowerCase() === r.name.toLowerCase());
				if (nameMatch) {
					match = nameMatch;
					repairedCount++;
				}
			}

			// 2. Jika MASIH tidak ketemu, TAMBAHKAN ke Library (AUTO REGISTER)
			if (!match && r.name) {
				const newId = `mat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
				const newMat = {
					id: newId,
					name: r.name,
					unit: r.unit || "gram",
					stock: 0,
					costPerUnit: r.costPerUnit || r.cost || 0,
					isActive: true
				};
				await db.rawMaterialLibrary.add(newMat);
				match = newMat as any;
				addedCount++;
			}

			if (match) {
				const priceChanged = match.costPerUnit !== r.costPerUnit;
				const idChanged = match.id !== r.id;
				
				if (priceChanged || idChanged) {
					updated = true;
					return {
						...r,
						id: match.id,
						costPerUnit: match.costPerUnit,
						cost: match.costPerUnit,
					};
				}
			}
			return r;
		}));

		if (updated || addedCount > 0) {
			setFormRaw(newRaw);
			refetchMaterials(); // Refresh resource library agar sinkron
			
			let msg = "Sync Library Berhasil!";
			if (repairedCount > 0) msg = `Tersambung ${repairedCount} bahan & `;
			if (addedCount > 0) msg = `Terdaftar ${addedCount} bahan baru ke Library!`;
			
			toast.success(msg);
		} else {
			toast("Semua harga sudah sesuai dengan Library");
		}
	}

	function removeRaw(i: number) {
		setFormRaw(formRaw().filter((_, idx) => idx !== i));
	}

	function addFromMaterialLibrary(lib: any) {
		// Prevent duplicate assigning
		if (formRaw().some((r) => r.id === lib.id)) {
			setAlertMessage(`Bahan "${lib.name}" sudah ada di resep.`);
			setShowMaterialLib(false);
			return;
		}

		setFormRaw([
			...formRaw(),
			{
				id: lib.id, // Linked strictly to rawMaterialLibrary
				name: lib.name,
				costPerUnit: lib.costPerUnit,
				cost: lib.costPerUnit,
				quantity: 1,
				unit: lib.unit,
			},
		]);
		setShowMaterialLib(false);
	}

	// ── Duplicate ──
	async function duplicateProduct(p: Product) {
		const newId = `prod_${Date.now()}`;
		const dupProduct: Product = {
			...structuredClone(p),
			id: newId,
			name: `${p.name} (Copy)`,
			isActive: false,
		};
		await db.products.add(dupProduct);
		refetch();
		toast.success(`Produk "${p.name}" berhasil diduplikasi`);
	}

	// ── Ingredient adjustment helpers ──
	function calcCogsFromAdjustments(adjustments?: IngredientAdjustment[]): number {
		if (!adjustments || adjustments.length === 0) return 0;
		const lib = materialsLibrary();
		if (!lib) return 0;
		return adjustments.reduce((sum, adj) => {
			const mat = lib.find((m) => m.id === adj.materialId);
			return sum + (mat ? mat.costPerUnit * adj.adjustment : 0);
		}, 0);
	}

	function getVariantCogs(opt: { priceModifier: number; cogsModifier: number; ingredientAdjustments?: IngredientAdjustment[] }): number {
		const fromAdjustments = calcCogsFromAdjustments(opt.ingredientAdjustments);
		return fromAdjustments > 0 ? fromAdjustments : opt.cogsModifier;
	}

	function addIngredientAdjustment(gi: number, oi: number) {
		const current = formVariants[gi]?.options[oi];
		const adjustments = [...(current?.ingredientAdjustments || []), { materialId: "", adjustment: 1 }];
		setFormVariants(gi, "options", oi, "ingredientAdjustments" as any, adjustments as any);
	}

	function updateIngredientAdjustment(gi: number, oi: number, ai: number, field: keyof IngredientAdjustment, value: string | number) {
		const current = formVariants[gi]?.options[oi];
		if (!current) return;
		const adjustments = [...(current.ingredientAdjustments || [])];
		adjustments[ai] = { ...adjustments[ai], [field]: value } as any;
		setFormVariants(gi, "options", oi, "ingredientAdjustments" as any, adjustments as any);
		// Auto-calculate cogsModifier from adjustments
		const newCogs = calcCogsFromAdjustments(adjustments);
		if (newCogs > 0) {
			setFormVariants(gi, "options", oi, "cogsModifier", newCogs);
		}
	}

	function removeIngredientAdjustment(gi: number, oi: number, ai: number) {
		const current = formVariants[gi]?.options[oi];
		if (!current) return;
		const adjustments = (current.ingredientAdjustments || []).filter((_, idx) => idx !== ai);
		setFormVariants(gi, "options", oi, "ingredientAdjustments" as any, adjustments as any);
	}

	// ── Variant helpers ──
	function addVariantGroup() {
		setFormVariants(formVariants.length, {
			id: crypto.randomUUID(),
			name: "Grup Varian Baru",
			isRequired: false,
			type: "SINGLE",
			options: [{ name: "Opsi 1", priceModifier: 0, cogsModifier: 0 }],
		});
	}
	function updateVariantGroup(i: number, field: keyof VariantGroup, val: any) {
		setFormVariants(i, field, val);
	}
	function removeVariantGroup(i: number) {
		setFormVariants(produce(state => {
			state.splice(i, 1);
		}));
	}
	function addOption(gi: number) {
		setFormVariants(gi, "options", (prev) => [
			...prev,
			{ name: "Opsi Baru", priceModifier: 0, cogsModifier: 0 },
		]);
	}
	function updateOption(
		gi: number,
		oi: number,
		field: keyof VariantOption,
		val: any,
	) {
		setFormVariants(gi, "options", oi, field, val);
	}
	function removeOption(gi: number, oi: number) {
		setFormVariants(gi, "options", (prev) => prev.filter((_, idx) => idx !== oi));
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
			id: crypto.randomUUID(),
			name: vg.name,
			isRequired: vg.isRequired,
			type: vg.type,
			options: vg.options.map(o => ({ ...o })), // Deep clone options
			isActive: true,
		});
		refetchTemplates();
		setAlertMessage(`Template "${vg.name}" berhasil disimpan ke library!`);
	}

	function assignFromTemplate(tpl: VariantTemplate) {
		const alreadyAdded = formVariants.some((v) => v.name === tpl.name);
		if (alreadyAdded) {
			setAlertMessage(`Varian "${tpl.name}" sudah ditambahkan.`);
			return;
		}
		setFormVariants(formVariants.length, {
			id: crypto.randomUUID(),
			name: tpl.name,
			isRequired: tpl.isRequired,
			type: tpl.type,
			options: tpl.options.map(o => ({ ...o })),
		});
		setShowTemplateLib(false);
	}

	// ── Tabs ──
	const TAB_LABELS = [
		{ key: "info", label: "INFO DASAR" },
		{ key: "hpp", label: "RESEP & HPP" },
		{ key: "variants", label: "VARIASI" },
	] as const;

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

			{/* Search Bar + View Toggle */}
			<div class="px-4 pb-2">
				<div class="flex items-center gap-2">
					<div class="relative flex-1">
						<Search size={15} class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
						<input
							type="text"
							class="h-10 w-full rounded-xl border border-border/60 bg-card pl-9 pr-3 font-medium text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
							placeholder="Cari produk..."
							value={searchQuery()}
							onInput={(e) => setSearchQuery(e.currentTarget.value)}
						/>
					</div>
					<button
						type="button"
						onClick={toggleViewMode}
						class="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-all active:scale-95"
						title={viewMode() === "list" ? "Tampilan Grid" : "Tampilan List"}
					>
						{viewMode() === "list" ? <Grid3X3 size={16} /> : <List size={16} />}
					</button>
				</div>
			</div>

			{/* Product List / Grid */}
			<div class={`p-4 ${viewMode() === "grid" ? "grid grid-cols-2 gap-3" : "flex flex-col gap-2.5"}`}>
				<Show
					when={filteredProducts() && filteredProducts()!.length > 0}
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
					<For each={filteredProducts()}>
						{(p) => {
							const availability = getProductAvailability(p, materialsLibrary() || []);
							return viewMode() === "grid" ? (
								// ── Grid Card ──
								<div
									role="button"
									tabIndex={0}
									class={`flex flex-col text-left bg-card rounded-2xl border transition-all shadow-sm cursor-pointer hover:border-primary/30 active:scale-[0.99] overflow-hidden ${
										!availability.available
											? "opacity-60 grayscale border-slate-200"
											: "border-border/60"
									}`}
									onClick={() => openEdit(p)}
								>
									<div class="aspect-square bg-muted overflow-hidden">
										<ProductImage src={p.image} name={p.name} />
									</div>
									<div class="p-3 flex flex-col gap-1.5">
										<h3 class="font-bold text-sm leading-tight truncate">{p.name}</h3>
										<p class="font-bold text-xs text-foreground">Rp {p.price.toLocaleString("id-ID")}</p>
										<div class="flex items-center gap-1 flex-wrap">
											<span class="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{p.category}</span>
											<Show when={p.variants && p.variants.length > 0}>
												<span class="text-[10px] font-semibold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">Varian</span>
											</Show>
										</div>
										<Show when={p.rawMaterials && p.rawMaterials.length > 0}>
											{(() => {
												const m = calcMargin(p.price, p.cogs);
												const status = getMarginStatus(m);
												return (
													<span class={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded self-start ${status.color} ${status.bg}`}>
														{status.label} {m}%
													</span>
												);
											})()}
										</Show>
									</div>
								</div>
							) : (
								// ── List Card (original) ──
								<div
									role="button"
									tabIndex={0}
									class={`flex items-center w-full text-left gap-3 bg-card px-3.5 py-3 rounded-2xl border transition-all shadow-sm cursor-pointer hover:border-primary/30 active:scale-[0.99] group ${
										!availability.available
											? "opacity-60 grayscale border-slate-200"
											: "border-border/60"
									}`}
									onClick={() => openEdit(p)}
								>
									<div class="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/50">
										<ProductImage src={p.image} name={p.name} />
									</div>
									<div class="flex-1 min-w-0">
										<h3 class="font-bold text-sm leading-tight truncate">{p.name}</h3>
										<div class="flex items-center gap-1 mt-1 flex-wrap">
											<span class="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{p.category}</span>
											<Show when={p.variants && p.variants.length > 0}>
												<span class="text-xs font-semibold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Layers size={9} /> Varian</span>
											</Show>
											<Show when={p.rawMaterials && p.rawMaterials.length > 0}>
												{(raw) => {
													const m = calcMargin(p.price, p.cogs);
													const status = getMarginStatus(m);
													return (
														<span class={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${status.color} ${status.bg}`}>
															{status.label} {m}%
														</span>
													);
												}}
											</Show>
										</div>
										<p class="text-xs mt-1.5 flex items-center gap-2 font-bold">
											<span class="text-foreground">Rp {p.price.toLocaleString("id-ID")}</span>
											<Show when={p.cogs > 0}>
												<span class="text-muted-foreground/30">&bull;</span>
												<span class="text-primary/70">HPP Rp {p.cogs.toLocaleString("id-ID")}</span>
											</Show>
										</p>
									</div>
									<div class="flex items-center gap-1.5 ml-auto">
										<Show when={!availability.available && availability.reason !== "Nonaktif"}>
											<span class="text-[8px] font-black bg-red-500 text-white px-1.5 py-1 rounded uppercase tracking-tighter">{availability.reason}</span>
										</Show>
										<button
											onClick={(e) => toggleActive(p, e)}
											class={`h-8 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
												availability.available
													? "bg-white border-slate-200 text-slate-400"
													: "bg-slate-900 border-slate-900 text-white shadow-sm"
											}`}
										>
											{availability.available ? "Aktif" : "Off"}
										</button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 rounded-full hover:bg-red-50 shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
											onClick={(e) => {
												e.stopPropagation();
												deleteProduct(p.id, e);
											}}
										>
											<Trash2 size={13} />
										</Button>
									</div>
								</div>
							);
						}}
					</For>
				</Show>
			</div>

			{/* Edit / Add Sheet — Mobile-First */}
			<Sheet open={sheetOpen()} onOpenChange={setSheetOpen}>
				<SheetContent
					position="bottom"
					class="h-[96vh] rounded-t-[32px] flex flex-col p-0 border-none shadow-[0_-20px_60px_rgba(0,0,0,0.15)] overflow-hidden"
				>
					{/* Sheet Header */}
					<SheetHeader class="px-5 pt-6 pb-4 border-b border-border/50 shrink-0">
						<div class="flex items-center justify-between">
							<SheetTitle class="font-black text-xl tracking-tight">
								{isEditing() ? "Edit Produk" : "Tambah Produk"}
							</SheetTitle>
							<Show when={isEditing()}>
								<button
									type="button"
									class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all text-xs font-bold border border-border/40"
									onClick={() => {
										const p = products()?.find((x) => x.id === formId());
										if (p) {
											setSheetOpen(false);
											duplicateProduct(p);
										}
								}}
								>
									<Copy size={13} /> Duplikasi
								</button>
							</Show>
						</div>
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
							<div class="flex flex-col gap-4 p-4 text-left">
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
										<div class="flex flex-col gap-2 flex-1 text-left">
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

								<div class="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/70">
									<div class="flex flex-col">
										<p class="text-xs font-bold uppercase tracking-widest text-foreground">
											Status Produk
										</p>
										<p class="text-[10px] font-medium text-muted-foreground mt-0.5">
											Tersedia untuk dijual di kasir
										</p>
									</div>
									<button
										type="button"
										onClick={() => setFormIsActive(!formIsActive())}
										class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
											formIsActive()
												? "bg-emerald-500"
												: "bg-slate-300"
										}`}
									>
										<span
											class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
												formIsActive()
													? "translate-x-6"
													: "translate-x-1"
											}`}
										/>
									</button>
								</div>
							</div>
						</Show>

						{/* ── Tab 2: Resep & HPP ── */}
						<Show when={activeTab() === "hpp"}>
							<div class="flex flex-col gap-4 p-5 text-left">
								{/* Margin indicator */}
								<div
									class={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${getMarginStatus(marginPct()).border} ${getMarginStatus(marginPct()).bg}`}
								>
									<div>
										<p
											class={`text-[10px] font-black uppercase tracking-[0.2em] opacity-70 ${getMarginStatus(marginPct()).color}`}
										>
											{getMarginStatus(marginPct()).label} (
											{marginPct()}%)
										</p>
										<p
											class={`text-3xl font-black tracking-tighter mt-0.5 ${getMarginStatus(marginPct()).color}`}
										>
											Rp{" "}
											{(
												Number.parseInt(formPrice()) - totalHPP()
											).toLocaleString("id-ID")}
											<span class="text-xs ml-1 opacity-60 font-semibold">
												Profit/Unit
											</span>
										</p>
									</div>
									<div class="text-right">
										<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
											Modal (HPP)
										</p>
										<p class="font-black text-lg text-foreground/80">
											Rp {totalHPP().toLocaleString("id-ID")}
										</p>
									</div>
								</div>

								{/* Legend / Info Margin */}
								<div class="flex flex-col gap-2">
									<button
										type="button"
										onClick={() =>
											setShowMarginGuide(!showMarginGuide())
										}
										class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity px-1"
									>
										<div class="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
											?
										</div>
										{showMarginGuide()
											? "Sembunyikan Panduan Margin"
											: "Lihat Panduan Margin"}
									</button>

									<Show when={showMarginGuide()}>
										<div class="bg-card p-4 rounded-2xl border border-border/50 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
											<div class="grid grid-cols-2 gap-3">
												<div class="flex items-center gap-2 p-2 rounded-xl bg-red-50/50">
													<div class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
													<div>
														<p class="text-[10px] font-black text-red-700 leading-none">
															&lt; 30%: KRITIS
														</p>
														<p class="text-[9px] font-semibold text-red-600/70 mt-1">
															Berisiko tekor biaya OPEX
														</p>
													</div>
												</div>
												<div class="flex items-center gap-2 p-2 rounded-xl bg-orange-50/50">
													<div class="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
													<div>
														<p class="text-[10px] font-black text-orange-700 leading-none">
															30-44%: TIPIS
														</p>
														<p class="text-[9px] font-semibold text-orange-600/70 mt-1">
															Cukup untuk biaya dasar
														</p>
													</div>
												</div>
												<div class="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/50">
													<div class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
													<div>
														<p class="text-[10px] font-black text-emerald-700 leading-none">
															45-70%: SEHAT
														</p>
														<p class="text-[9px] font-semibold text-emerald-600/70 mt-1">
															Target ideal industri F&B
														</p>
													</div>
												</div>
												<div class="flex items-center gap-2 p-2 rounded-xl bg-blue-50/50">
													<div class="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
													<div>
														<p class="text-[10px] font-black text-blue-700 leading-none">
															&ge; 70%: OPTIMAL
														</p>
														<p class="text-[9px] font-semibold text-blue-600/70 mt-1">
															Profit tunai yang sangat kuat
														</p>
													</div>
												</div>
											</div>
										</div>
									</Show>
								</div>

								<div class="flex items-center justify-between mt-2">
									<p class="text-xs font-bold text-muted-foreground">
										Daftar Bahan & HPP
									</p>
									<Show when={formRaw().some((r) => r.id)}>
										<button
											type="button"
											onClick={syncAllPrices}
											class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/5 text-primary hover:bg-primary/10 transition-all text-[10px] font-black uppercase tracking-wider"
										>
											<Zap size={10} class="fill-current" />
											Sync Library
										</button>
									</Show>
								</div>

								<div class="flex flex-col gap-4 mt-2">
									<Index each={formRaw()}>
										{(raw: Accessor<RawMaterialCost>, i: number) => {
											const lineTotal = createMemo(
												() =>
													(raw().quantity || 0) *
													(raw().costPerUnit || raw().cost || 0),
											);

											return (
												<div class="flex flex-col gap-3 bg-card p-4 rounded-2xl border border-border/60 shadow-sm hover:border-primary/20 transition-all text-left">
													<div class="flex items-center justify-between">
														<div class="flex items-center gap-2">
															<span class="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 opacity-60">
																Bahan #{i + 1}
															</span>
															<Show 
																when={materialsLibrary()?.some(m => m.id === raw().id)}
																fallback={
																	<span class="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-red-100 animate-pulse">
																		⚠️ Bahan Terhapus / Link Terputus
																	</span>
																}
															>
																<span class="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1">
																	🔗 Terhubung
																</span>
															</Show>
														</div>
														<div class="flex items-center gap-1">
															<Button
																type="button"
																variant="ghost"
																size="icon"
																class="h-8 w-8 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-50"
																onClick={() => removeRaw(i)}
															>
																<Trash2 size={16} />
															</Button>
														</div>
													</div>

													<div class="flex flex-col gap-1.5">
														<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-left">
															Nama Bahan Baku
														</p>
														<input
															type="text"
															class="h-12 w-full rounded-xl border border-border/70 bg-muted/20 px-4 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
															placeholder="Contoh: Biji Kopi Arabica"
															value={raw().name}
															onInput={(e) =>
																updateRaw(
																	i,
																	"name",
																	e.currentTarget.value,
																)
															}
														/>
													</div>

													<div class="grid grid-cols-3 gap-3">
														<div class="flex flex-col gap-1.5">
															<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-left">
																Qty
															</p>
															<input
																type="number"
																class="h-12 w-full rounded-xl border border-border/70 bg-muted/20 px-4 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
																value={raw().quantity}
																onInput={(e) =>
																	updateRaw(
																		i,
																		"quantity",
																		Number.parseFloat(
																			e.currentTarget.value,
																		) || 0,
																	)
																}
															/>
														</div>
														<div class="flex flex-col gap-1.5">
															<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-left">
																Unit
															</p>
															<input
																type="text"
																class="h-12 w-full rounded-xl border border-border/70 bg-muted/20 px-4 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-center"
																placeholder="gr"
																value={raw().unit}
																onInput={(e) =>
																	updateRaw(
																		i,
																		"unit",
																		e.currentTarget.value,
																	)
																}
															/>
														</div>
														<div class="flex flex-col gap-1.5">
															<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-left">
																Harga Satuan
															</p>
															<div class="relative">
																<span class="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/60">
																	Rp
																</span>
																<input
																	type="number"
																	class="h-12 w-full rounded-xl border border-border/70 bg-muted/20 pl-8 pr-3 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
																	value={
																		raw().costPerUnit ||
																		raw().cost
																	}
																	onInput={(e) =>
																		updateRaw(
																			i,
																			"costPerUnit",
																			Number.parseInt(
																				e.currentTarget
																					.value,
																			) || 0,
																		)
																	}
																/>
															</div>
														</div>
													</div>

													<div class="mt-1 flex items-center justify-between px-2 pt-2 border-t border-border/40 border-dashed">
														<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
															Total Kalkulasi
														</p>
														<p class="text-sm font-black text-primary">
															Rp{" "}
															{lineTotal().toLocaleString(
																"id-ID",
															)}
														</p>
													</div>
												</div>
											);
										}}
									</Index>

									{/* Library Picker Section */}
									<Show when={showMaterialLib()}>
										<div class="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-3 animate-in zoom-in-95 duration-200">
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
												<div class="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
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
																	<p class="text-[10px] font-black text-muted-foreground uppercase opacity-70 mt-0.5">
																		Rp{" "}
																		{lib.costPerUnit.toLocaleString(
																			"id-ID",
																		)}
																		/{lib.unit}
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
							<div class="flex flex-col gap-4 p-4 text-left">
								{/* Active variant groups */}
								<For each={formVariants}>
									{(vg, gi) => (
										<div class="flex flex-col gap-3 bg-card p-4 rounded-2xl border border-border/70 text-left">
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
														onClick={() => removeVariantGroup(gi())}
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
													updateVariantGroup(
														gi(),
														"name",
														e.currentTarget.value,
													)
												}
											/>

											<div class="grid grid-cols-2 gap-2">
												<div class="flex flex-col gap-1 text-left">
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
															updateVariantGroup(
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
													<div class="flex flex-col gap-1 text-left">
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
																updateVariantGroup(
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
												<div class="flex flex-col gap-1 text-left">
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
															updateVariantGroup(
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
														<div class="relative flex flex-col gap-3 p-4 bg-background border border-border/60 rounded-2xl shadow-sm hover:border-primary/30 transition-all group text-left">
															{/* Row 1: Name & Delete */}
															<div class="flex items-end gap-2 text-left">
																<div class="flex-1 flex flex-col gap-1.5 text-left">
																	<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-left">
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
																				e.currentTarget
																					.value,
																			)
																		}
																	/>
																</div>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	class="h-11 w-11 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-50 shrink-0 border border-transparent hover:border-red-100 transition-all"
																	onClick={() =>
																		removeOption(gi(), oi())
																	}
																>
																	<Trash2 size={18} />
																</Button>
															</div>

															{/* Row 2: Pricing & HPP */}
															<div class="grid grid-cols-2 gap-3 text-left">
																<div class="flex flex-col gap-1.5 text-left">
																	<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-left">
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
																			value={
																				opt.priceModifier
																			}
																			onInput={(e) =>
																				updateOption(
																					gi(),
																					oi(),
																					"priceModifier",
																					Number.parseInt(
																						e
																							.currentTarget
																							.value,
																					) || 0,
																				)
																			}
																		/>
																	</div>
																</div>
																<div class="flex flex-col gap-1.5 text-left">
																	<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-left">
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
																			value={
																				opt.cogsModifier
																			}
																			onInput={(e) =>
																				updateOption(
																					gi(),
																					oi(),
																					"cogsModifier",
																					Number.parseInt(
																						e
																							.currentTarget
																							.value,
																					) || 0,
																				)
																			}
																		/>
																	</div>
																</div>
																								
																								{/* Ingredient Adjustments */}
																								<div class="flex flex-col gap-2 mt-1 pt-3 border-t border-border/30">
																									<div class="flex items-center justify-between">
																										<p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-left">
																											Bahan Tambahan
																										</p>
																										<Show when={opt.ingredientAdjustments && opt.ingredientAdjustments.length > 0}>
																											<p class="text-[10px] font-bold text-primary">
																												HPP: Rp {calcCogsFromAdjustments(opt.ingredientAdjustments).toLocaleString("id-ID")}
																											</p>
																										</Show>
																									</div>
																									<For each={opt.ingredientAdjustments || []}>
																										{(adj, ai) => {
																											const mat = materialsLibrary()?.find(m => m.id === adj.materialId);
																											return (
																												<div class="flex items-center gap-2 bg-muted/20 p-2.5 rounded-xl border border-border/40">
																													<select
																														class="flex-1 h-9 rounded-lg border border-border/50 bg-background px-2 font-bold text-xs focus:outline-none"
																														value={adj.materialId}
																														onChange={(e) => updateIngredientAdjustment(gi(), oi(), ai(), "materialId", e.currentTarget.value)}
																													>
																														<option value="">Pilih bahan...</option>
																														<For each={materialsLibrary()}>
																															{(m) => <option value={m.id}>{m.name} (Rp {m.costPerUnit.toLocaleString("id-ID")}/{m.unit})</option>}
																														</For>
																													</select>
																													<input
																														type="number"
																														class="w-16 h-9 rounded-lg border border-border/50 bg-background px-2 font-bold text-xs text-center focus:outline-none"
																														value={adj.adjustment}
																														onInput={(e) => updateIngredientAdjustment(gi(), oi(), ai(), "adjustment", Number.parseFloat(e.currentTarget.value) || 0)}
																													/>
																													<span class="text-[10px] font-bold text-muted-foreground">{mat?.unit || ""}</span>
																													<button
																														type="button"
																														onClick={() => removeIngredientAdjustment(gi(), oi(), ai())}
																														class="h-9 w-9 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
																													>
																														<Trash2 size={12} />
																													</button>
																												</div>
																											);
																										}}
																									</For>
																									<button
																										type="button"
																										onClick={() => addIngredientAdjustment(gi(), oi())}
																										class="h-9 text-[10px] font-bold border border-dashed border-border/40 rounded-lg text-muted-foreground hover:text-primary hover:border-primary/30 transition-all w-full flex items-center justify-center gap-1.5 mt-1"
																									>
																										<Plus size={12} /> Tambah Bahan Varian
																									</button>
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

								{/* Library picker */}
								<Show when={showTemplateLib()}>
									<div class="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-3 animate-in zoom-in-95 duration-200">
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
										onClick={addVariantGroup}
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
