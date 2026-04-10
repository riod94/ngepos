import {
	createSignal,
	createResource,
	For,
	Show,
	createEffect,
} from "solid-js";
import {
	ArrowLeft,
	Plus,
	Trash2,
	Megaphone,
	ChevronRight,
	Tag,
	Gift,
	Layers,
	Search,
	Zap,
	ShoppingBag,
	TrendingUp,
	TrendingDown,
	TriangleAlert,
	Calculator,
} from "lucide-solid";
import { useNavigate } from "@solidjs/router";
import {
	db,
	type Campaign,
	type CampaignItem,
	type CampaignReward,
} from "~/db/db";
import { Button } from "~/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import { toast } from "solid-toast";
import { ProductSelector } from "~/components/ui/product-selector";

export default function CampaignsPage() {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = createSignal("");
	const [sheetOpen, setSheetOpen] = createSignal(false);
	const [isEditing, setIsEditing] = createSignal(false);
	const [currentCampaignId, setCurrentCampaignId] = createSignal<
		string | null
	>(null);

	// Form State
	const [formName, setFormName] = createSignal("");
	const [formDesc, setFormDesc] = createSignal("");
	const [formType, setFormType] =
		createSignal<Campaign["type"]>("BULK_DISCOUNT");
	const [formIsActive, setFormIsActive] = createSignal(true);
	const [formPriority, setFormPriority] = createSignal(1);

	// Requirement Items (Untuk BUNDLE / BUY_X_GET_Y)
	const [reqItems, setReqItems] = createSignal<
		{ productId: string; quantity: number }[]
	>([]);
	// Reward Config
	const [rewardType, setRewardType] =
		createSignal<CampaignReward["rewardType"]>("PERCENT_DISCOUNT");
	const [rewardValue, setRewardValue] = createSignal(0);
	const [rewardProductId, setRewardProductId] = createSignal<string | null>(
		null,
	);
	const [activePickingIdx, setActivePickingIdx] = createSignal<number | null>(
		null,
	);

	// Sync Reward Type when Form Type changes (Prevent UI Mismatch)
	createEffect(() => {
		const type = formType();
		if (type === "BULK_DISCOUNT" && rewardType() === "FREE_PRODUCT") {
			setRewardType("PERCENT_DISCOUNT");
		} else if (type === "BUNDLE" && rewardType() !== "FIXED_DISCOUNT") {
			setRewardType("FIXED_DISCOUNT");
		} else if (type === "BUY_X_GET_Y" && rewardType() !== "FREE_PRODUCT") {
			setRewardType("FREE_PRODUCT");
		}
	});

	// Target Items (Untuk BULK_DISCOUNT: Produk mana saja yang didiscount)
	const [targetItems, setTargetItems] = createSignal<string[]>([]); // Array of Product IDs

	// Data Resources
	const [campaigns, { refetch: refetchCampaigns }] = createResource(
		async () => {
			return await db.campaigns.toArray();
		},
	);

	const [products] = createResource(async () => {
		return await db.products.toArray();
	});

	const filteredCampaigns = () => {
		const q = searchQuery().toLowerCase();
		return campaigns()?.filter((c) => c.name.toLowerCase().includes(q)) || [];
	};

	// ── Profitability Logic ──
	const profitAnalysis = () => {
		const prods = products() || [];
		let totalRevenue = 0;
		let totalCogs = 0;
		let totalDiscount = 0;

		// 1. Calculate Requirements (Bila...)
		if (formType() === "BULK_DISCOUNT") {
			targetItems().forEach((id) => {
				const p = prods.find((item) => String(item.id) === String(id));
				if (p) {
					totalRevenue += p.price;
					totalCogs += p.cogs || 0;
					if (rewardType() === "PERCENT_DISCOUNT")
						totalDiscount += (p.price * rewardValue()) / 100;
					else if (rewardType() === "FIXED_DISCOUNT")
						totalDiscount += rewardValue();
				}
			});
		} else {
			reqItems().forEach((req) => {
				const p = prods.find(
					(item) => String(item.id) === String(req.productId),
				);
				if (p) {
					totalRevenue += p.price * req.quantity;
					totalCogs += (p.cogs || 0) * req.quantity;
				}
			});

			// 2. Add Reward Impact
			if (rewardType() === "FIXED_DISCOUNT") totalDiscount = rewardValue();
			else if (rewardType() === "PERCENT_DISCOUNT")
				totalDiscount = (totalRevenue * rewardValue()) / 100;
			else if (rewardType() === "FREE_PRODUCT") {
				const rewardP = prods.find(
					(item) => String(item.id) === String(rewardProductId()),
				);
				if (rewardP) {
					totalCogs += (rewardP.cogs || 0) * rewardValue();
					// The "discount" from a free product is its full sales price
					totalDiscount += rewardP.price * rewardValue();
				}
			}
		}

		const netSales = totalRevenue - totalDiscount;
		const margin = netSales - totalCogs;
		const marginPct = netSales > 0 ? (margin / netSales) * 100 : 0;

		return { totalRevenue, totalCogs, totalDiscount, margin, marginPct };
	};

	const resetForm = () => {
		setFormName("");
		setFormDesc("");
		setFormType("BULK_DISCOUNT");
		setFormIsActive(true);
		setFormPriority(1);
		setReqItems([]);
		setTargetItems([]);
		setRewardType("PERCENT_DISCOUNT");
		setRewardValue(0);
		setRewardProductId(null);
		setCurrentCampaignId(null);
		setIsEditing(false);
	};

	const handleEdit = async (campaign: Campaign) => {
		setFormName(campaign.name);
		setFormDesc(campaign.description || "");
		setFormType(campaign.type);
		setFormIsActive(campaign.isActive);
		setFormPriority(campaign.priority);

		// Load Items
		const items = await db.campaignItems
			.where("campaignId")
			.equals(campaign.id)
			.toArray();
		setReqItems(
			items
				.filter((i) => i.type === "REQUIREMENT")
				.map((i) => ({ productId: i.productId, quantity: i.quantity })),
		);
		setTargetItems(
			items
				.filter((i) => i.type === "TARGET_DISCOUNT")
				.map((i) => i.productId),
		);

		// Load Reward
		const rewards = await db.campaignRewards
			.where("campaignId")
			.equals(campaign.id)
			.toArray();
		if (rewards.length > 0) {
			setRewardType(rewards[0].rewardType);
			setRewardValue(rewards[0].value);
			setRewardProductId(rewards[0].productId || null);
		}

		setCurrentCampaignId(campaign.id);
		setIsEditing(true);
		setSheetOpen(true);
	};

	const handleSave = async () => {
		if (!formName()) return toast.error("Nama kampanye wajib diisi");

		// Basic Validation based on type
		if (formType() === "BULK_DISCOUNT" && targetItems().length === 0) {
			return toast.error("Pilih minimal satu produk untuk diskon");
		}
		if (
			(formType() === "BUNDLE" || formType() === "BUY_X_GET_Y") &&
			reqItems().length === 0
		) {
			return toast.error("Tambahkan minimal satu produk syarat");
		}
		if (formType() === "BUY_X_GET_Y" && !rewardProductId()) {
			return toast.error("Pilih produk hadiah");
		}

		const id = currentCampaignId() || `camp_${Date.now()}`;

		try {
			await db.transaction(
				"rw",
				[db.campaigns, db.campaignItems, db.campaignRewards],
				async () => {
					// 1. Save Campaign Header
					await db.campaigns.put({
						id,
						name: formName(),
						description: formDesc(),
						type: formType(),
						isActive: formIsActive(),
						priority: formPriority(),
					});

					// 2. Clear old items/rewards for this ID
					await db.campaignItems.where("campaignId").equals(id).delete();
					await db.campaignRewards.where("campaignId").equals(id).delete();

					// 3. Save Items
					const newItems: CampaignItem[] = [];
					if (formType() === "BULK_DISCOUNT") {
						targetItems().forEach((pId) => {
							newItems.push({
								id: `ci_${id}_${pId}`,
								campaignId: id,
								productId: pId,
								type: "TARGET_DISCOUNT",
								quantity: 1,
							});
						});
					} else {
						reqItems()
							.filter((item) => item.productId)
							.forEach((item, idx) => {
								newItems.push({
									id: `ci_${id}_${idx}`,
									campaignId: id,
									productId: item.productId,
									type: "REQUIREMENT",
									quantity: item.quantity,
								});
							});
					}
					if (newItems.length > 0)
						await db.campaignItems.bulkAdd(newItems);

					// 4. Save Reward
					await db.campaignRewards.put({
						id: `cr_${id}`,
						campaignId: id,
						rewardType: rewardType(),
						productId: rewardProductId() || undefined,
						value: rewardValue(),
					});
				},
			);

			toast.success(
				isEditing() ? "Kampanye diperbarui" : "Kampanye baru dibuat",
			);
			refetchCampaigns();
			setSheetOpen(false);
			resetForm();
		} catch (err) {
			console.error("Save Error:", err);
			toast.error(
				"Gagal menyimpan: " +
					(err instanceof Error ? err.message : "Database Error"),
			);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Hapus kampanye ini?")) return;
		await db.transaction(
			"rw",
			["campaigns", "campaignItems", "campaignRewards"],
			async () => {
				await db.campaigns.delete(id);
				await db.campaignItems.where("campaignId").equals(id).delete();
				await db.campaignRewards.where("campaignId").equals(id).delete();
			},
		);
		refetchCampaigns();
		toast.success("Kampanye dihapus");
	};

	return (
		<div class="flex flex-col min-h-screen bg-muted/20 pb-24">
			{/* App Bar */}
			<div class="flex items-center justify-between px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
				<div class="flex items-center gap-3">
					<button
						type="button"
						onClick={() => navigate("/app/marketing")}
						class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
					>
						<ArrowLeft size={18} />
					</button>
					<div>
						<h1 class="font-bold text-lg tracking-tight leading-none">
							Promosi & Kampanye
						</h1>
						<span class="text-xs font-semibold text-muted-foreground mt-0.5 block">
							Marketing & Loyalty
						</span>
					</div>
				</div>
				<Button
					onClick={() => {
						resetForm();
						setSheetOpen(true);
					}}
					class="h-10 px-4 rounded-full font-bold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
				>
					<Plus size={15} stroke-width={2.5} /> Program
				</Button>
			</div>

			<div class="p-5 flex flex-col gap-4">
				{/* Search & Actions */}
				<div class="relative w-full">
					<Search
						class="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40"
						size={16}
					/>
					<input
						type="text"
						placeholder="Cari promo..."
						class="w-full h-12 rounded-2xl border border-border/60 bg-background pl-10 pr-4 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
						onInput={(e) => setSearchQuery(e.currentTarget.value)}
					/>
				</div>

				<Sheet
					open={sheetOpen()}
					onOpenChange={(o) => {
						setSheetOpen(o);
						if (!o) resetForm();
					}}
				>
					<SheetTrigger as="span" class="hidden" />

					<SheetContent
						position="bottom"
						class="h-[96vh] rounded-t-[32px] overflow-hidden p-0 flex flex-col border-none shadow-[0_-20px_60px_rgba(0,0,0,0.15)]"
					>
						<SheetHeader class="px-5 pt-6 pb-4 border-b border-border/50 shrink-0 text-left">
							<SheetTitle class="font-black text-xl tracking-tight">
								{isEditing() ? "Edit Kampanye" : "Tambah Kampanye"}
							</SheetTitle>
						</SheetHeader>

						<div class="flex-1 overflow-y-auto">
							<form
								id="campaign-form"
								onSubmit={(e) => {
									e.preventDefault();
									handleSave();
								}}
								class="flex flex-col gap-6 p-5"
							>
								{/* General Info */}
								<div class="flex flex-col gap-5 p-4 bg-muted/20 border border-border/10 rounded-2xl">
									<div class="flex flex-col gap-1.5">
										<label class="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
											Nama Campaign
										</label>
										<input
											type="text"
											placeholder="Contoh: Promo Sarapan Hemat"
											class="h-12 w-full rounded-xl border border-border/70 bg-background px-4 font-bold text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
											value={formName()}
											onInput={(e) =>
												setFormName(e.currentTarget.value)
											}
										/>
									</div>

									<div class="grid grid-cols-2 gap-4">
										<div class="flex flex-col gap-2">
											<label class="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
												Status Campaign
											</label>
											<div class="flex items-center gap-1 p-1 bg-background border-2 border-border/40 rounded-2xl shadow-sm h-[56px]">
												<button
													type="button"
													class={`flex-1 h-full rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center ${formIsActive() ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "text-muted-foreground hover:bg-muted"}`}
													onClick={() => setFormIsActive(true)}
												>
													Aktif
												</button>
												<button
													type="button"
													class={`flex-1 h-full rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center ${!formIsActive() ? "bg-slate-700 text-white shadow-lg shadow-slate-200" : "text-muted-foreground hover:bg-muted"}`}
													onClick={() => setFormIsActive(false)}
												>
													Inaktif
												</button>
											</div>
										</div>

										<div class="flex flex-col gap-2">
											<label class="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
												Prioritas
											</label>
											<div class="relative group">
												<select
													class="h-[56px] w-full rounded-2xl border-2 border-border/40 bg-background px-4 pr-10 font-bold text-sm focus:outline-none focus:border-primary/60 transition-all appearance-none cursor-pointer"
													value={formPriority()}
													onChange={(e) =>
														setFormPriority(
															Number(e.currentTarget.value),
														)
													}
												>
													<option value={1}>Rendah (1)</option>
													<option value={2}>Normal (2)</option>
													<option value={3}>Tinggi (3)</option>
													<option value={4}>
														Sangat Tinggi (4)
													</option>
													<option value={5}>Utama (5)</option>
												</select>
												<div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
													<ChevronRight
														size={16}
														class="rotate-90"
													/>
												</div>
											</div>
										</div>
									</div>

									<div class="flex flex-col gap-2">
										<label class="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
											Tipe Campaign
										</label>
										<div class="grid grid-cols-3 gap-2 px-0.5">
											<button
												type="button"
												class={`h-11 flex items-center justify-center gap-2 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all shadow-sm ${formType() === "BULK_DISCOUNT" ? "bg-emerald-600 text-white border-emerald-600" : "bg-background border-border/60 text-muted-foreground hover:bg-muted"}`}
												onClick={() => setFormType("BULK_DISCOUNT")}
											>
												<Tag size={14} /> Diskon
											</button>
											<button
												type="button"
												class={`h-11 flex items-center justify-center gap-2 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all shadow-sm ${formType() === "BUNDLE" ? "bg-indigo-600 text-white border-indigo-600" : "bg-background border-border/60 text-muted-foreground hover:bg-muted"}`}
												onClick={() => {
													setFormType("BUNDLE");
													setRewardType("FIXED_DISCOUNT");
												}}
											>
												<Layers size={14} /> Combo
											</button>
											<button
												type="button"
												class={`h-11 flex items-center justify-center gap-2 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all shadow-sm ${formType() === "BUY_X_GET_Y" ? "bg-pink-600 text-white border-pink-600" : "bg-background border-border/60 text-muted-foreground hover:bg-muted"}`}
												onClick={() => {
													setFormType("BUY_X_GET_Y");
													setRewardType("FREE_PRODUCT");
												}}
											>
												<Gift size={14} /> Hadiah
											</button>
										</div>
									</div>
								</div>

								{/* ── SECTION 1: KONDISI (Bila...) ── */}
								<div class="p-4 bg-muted/20 border-2 border-dashed border-border/60 rounded-[28px] space-y-4">
									<div class="flex items-center gap-2 mb-2">
										<ShoppingBag size={14} class="text-primary" />
										<span class="text-[10px] font-black text-primary uppercase tracking-widest">
											Tahap 1: Syarat Belanja
										</span>
									</div>

									<div class="space-y-4">
										<Show when={formType() === "BULK_DISCOUNT"}>
											<ProductSelector
												label="Produk yang Didiskon"
												products={products() || []}
												selectedIds={targetItems()}
												onSelect={setTargetItems}
												multiple={true}
												placeholder="Pilih produk..."
											/>
										</Show>

										<Show
											when={
												formType() === "BUNDLE" ||
												formType() === "BUY_X_GET_Y"
											}
										>
											<div class="flex flex-col gap-3">
												<div class="flex items-center justify-between px-1">
													<label class="text-[9px] font-black uppercase tracking-widest text-emerald-800/60">
														Daftar Produk Syarat
													</label>
													<button
														type="button"
														onClick={() =>
															setReqItems([
																...reqItems(),
																{
																	productId: "",
																	quantity: 1,
																},
															])
														}
														class="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors"
													>
														+ Tambah Item
													</button>
												</div>

												<div class="space-y-3">
													<For each={reqItems()}>
														{(item, idx) => (
															<div class="group relative bg-background/60 p-4 rounded-3xl border-2 border-emerald-100/50 hover:border-emerald-200 transition-all flex flex-col gap-4">
																<ProductSelector
																	products={products() || []}
																	selectedIds={
																		item.productId
																			? [item.productId]
																			: []
																	}
																	onSelect={(ids) => {
																		const currentIdx = idx();
																		const newProductId =
																			ids[0] || "";

																		if (!newProductId) {
																			setReqItems((prev) => {
																				const next = [
																					...prev,
																				];
																				next[currentIdx] = {
																					...next[
																						currentIdx
																					],
																					productId: "",
																				};
																				return next;
																			});
																			return;
																		}

																		// Check if product already exists in OTHER rows
																		const existingIdx =
																			reqItems().findIndex(
																				(item, i) =>
																					i !==
																						currentIdx &&
																					item.productId ===
																						newProductId,
																			);

																		if (existingIdx > -1) {
																			// MERGE: If exists, increment that row's qty and REMOVE this row
																			setReqItems((prev) => {
																				const next = [
																					...prev,
																				];
																				next[existingIdx] =
																					{
																						...next[
																							existingIdx
																						],
																						quantity:
																							next[
																								existingIdx
																							]
																								.quantity +
																							(next[
																								currentIdx
																							]
																								?.quantity ||
																								1),
																					};
																				// Remove the current row because it's a duplicate
																				return next.filter(
																					(_, i) =>
																						i !==
																						currentIdx,
																				);
																			});
																			toast.success(
																				"Produk sudah ada, jumlah ditambahkan",
																			);
																		} else {
																			// NORMAL: Just update the current row
																			setReqItems((prev) => {
																				const next = [
																					...prev,
																				];
																				next[currentIdx] = {
																					...next[
																						currentIdx
																					],
																					productId:
																						newProductId,
																				};
																				return next;
																			});
																		}
																	}}
																	multiple={false}
																	placeholder="Cari produk..."
																/>

																<div class="flex items-center justify-between pt-1">
																	<div class="flex items-center gap-3">
																		<span class="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 ml-1">
																			Jumlah Pembelian
																		</span>
																		<div class="flex items-center gap-2 bg-background border border-emerald-100 rounded-xl px-2 py-1">
																			<button
																				type="button"
																				class="w-8 h-8 flex items-center justify-center font-black text-muted-foreground hover:text-primary transition-colors"
																				onClick={() => {
																					const currentIdx =
																						idx();
																					setReqItems(
																						(prev) => {
																							const next =
																								[
																									...prev,
																								];
																							next[
																								currentIdx
																							] = {
																								...next[
																									currentIdx
																								],
																								quantity:
																									Math.max(
																										1,
																										next[
																											currentIdx
																										]
																											.quantity -
																											1,
																									),
																							};
																							return next;
																						},
																					);
																				}}
																			>
																				-
																			</button>
																			<input
																				type="number"
																				class="w-10 bg-transparent text-center font-black text-sm outline-none px-0"
																				value={
																					item.quantity
																				}
																				onInput={(e) => {
																					const currentIdx =
																						idx();
																					setReqItems(
																						(prev) => {
																							const next =
																								[
																									...prev,
																								];
																							next[
																								currentIdx
																							] = {
																								...next[
																									currentIdx
																								],
																								quantity:
																									Number(
																										e
																											.currentTarget
																											.value,
																									),
																							};
																							return next;
																						},
																					);
																				}}
																			/>
																			<button
																				type="button"
																				class="w-8 h-8 flex items-center justify-center font-black text-muted-foreground hover:text-primary transition-colors"
																				onClick={() => {
																					const currentIdx =
																						idx();
																					setReqItems(
																						(prev) => {
																							const next =
																								[
																									...prev,
																								];
																							next[
																								currentIdx
																							] = {
																								...next[
																									currentIdx
																								],
																								quantity:
																									next[
																										currentIdx
																									]
																										.quantity +
																									1,
																							};
																							return next;
																						},
																					);
																				}}
																			>
																				+
																			</button>
																		</div>
																	</div>

																	<button
																		type="button"
																		onClick={() =>
																			setReqItems(
																				reqItems().filter(
																					(_, i) =>
																						i !== idx(),
																				),
																			)
																		}
																		class="w-10 h-10 rounded-2xl flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
																	>
																		<Trash2 size={16} />
																	</button>
																</div>
															</div>
														)}
													</For>
												</div>
											</div>
										</Show>
									</div>
								</div>

								{/* ── SECTION 2: KEUNTUNGAN (Maka...) ── */}
								<div class="p-4 bg-emerald-50/50 border-2 border-dashed border-emerald-200/60 rounded-[28px] space-y-4">
									<div class="flex flex-col gap-1 mb-2 px-1">
										<div class="flex items-center gap-2">
											<Zap size={14} class="text-emerald-600" />
											<span class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
												Tahap 2: Keuntungan
											</span>
										</div>
										<h3 class="font-black text-lg text-emerald-900 tracking-tight mt-1">
											Maka Berikan Keuntungan...
										</h3>
										<p class="text-[10px] font-medium italic opacity-70">
											{formType() === "BULK_DISCOUNT"
												? "Pilih potongan harga per item."
												: formType() === "BUNDLE"
													? "Tentukan harga total untuk paket ini."
													: "Berikan item gratis sebagai hadiah."}
										</p>
									</div>

									<div class="flex flex-col gap-3">
										<div class="flex flex-col gap-1.5">
											<label class="text-[9px] font-black uppercase tracking-widest text-emerald-800/60 ml-1">
												Metode Keuntungan
											</label>
											<select
												class="h-12 w-full rounded-2xl border-2 border-emerald-100 bg-background px-4 font-black text-sm focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed appearance-none"
												value={rewardType()}
												onChange={(e) =>
													setRewardType(
														e.currentTarget.value as any,
													)
												}
											>
												<Show when={formType() === "BULK_DISCOUNT"}>
													<option value="PERCENT_DISCOUNT">
														Diskon Persentase (%)
													</option>
													<option value="FIXED_DISCOUNT">
														Diskon Nominal (Rp)
													</option>
												</Show>
												<Show when={formType() === "BUNDLE"}>
													<option value="FIXED_DISCOUNT">
														Potongan Harga Paket (Nominal)
													</option>
												</Show>
												<Show when={formType() === "BUY_X_GET_Y"}>
													<option value="FREE_PRODUCT">
														Gratis Produk (Item)
													</option>
												</Show>
											</select>
										</div>

										<Show
											when={rewardType() === "FREE_PRODUCT"}
											fallback={
												<div class="flex flex-col gap-1.5">
													<label class="text-[9px] font-black uppercase tracking-widest text-emerald-800/60 ml-1">
														Nilai Potongan
													</label>
													<div class="relative">
														<Show
															when={
																rewardType() ===
																"PERCENT_DISCOUNT"
															}
															fallback={
																<div class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-600/60 text-lg">
																	Rp
																</div>
															}
														>
															<div class="absolute right-4 top-1/2 -translate-y-1/2 font-black text-emerald-600/60 text-lg">
																%
															</div>
														</Show>
														<input
															type="number"
															class={`h-14 w-full rounded-2xl border-2 border-emerald-100 bg-background font-black text-xl tracking-tighter ${rewardType() === "PERCENT_DISCOUNT" ? "pl-4 pr-12" : "pl-12 pr-4"}`}
															placeholder="0"
															value={rewardValue()}
															onInput={(e) =>
																setRewardValue(
																	Number(
																		e.currentTarget.value,
																	),
																)
															}
														/>
													</div>
												</div>
											}
										>
											<div class="flex flex-col gap-3">
												<ProductSelector
													label="Produk Hadiah"
													products={products() || []}
													selectedIds={
														rewardProductId()
															? [rewardProductId()!]
															: []
													}
													onSelect={(ids) =>
														setRewardProductId(ids[0] || null)
													}
													multiple={false}
													placeholder="Pilih hadiah..."
												/>

												<div class="flex flex-col gap-1.5">
													<label class="text-[9px] font-black uppercase tracking-widest text-emerald-800/60 ml-1">
														Jumlah Hadiah
													</label>
													<div class="relative">
														<div class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-600/60 text-sm italic uppercase">
															Item
														</div>
														<input
															type="number"
															placeholder="0"
															class="h-14 w-full rounded-2xl border-2 border-emerald-100 bg-background pl-16 pr-4 font-black text-xl tracking-tighter"
															value={rewardValue()}
															onInput={(e) =>
																setRewardValue(
																	Number(
																		e.currentTarget.value,
																	),
																)
															}
														/>
													</div>
												</div>
											</div>
										</Show>
									</div>
								</div>

								{/* Profit Analysis Result */}
								<Show when={profitAnalysis().totalRevenue > 0}>
									<div
										class={`p-5 rounded-[28px] border-2 flex flex-col gap-4 animate-in zoom-in-95 duration-300 ${profitAnalysis().margin < 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}
									>
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												<Calculator
													size={14}
													class={
														profitAnalysis().margin < 0
															? "text-red-500"
															: "text-emerald-500"
													}
												/>
												<span
													class={`text-[10px] font-black uppercase tracking-[0.2em] ${profitAnalysis().margin < 0 ? "text-red-500" : "text-emerald-500"}`}
												>
													Analisis Profit Promosi
												</span>
											</div>
											<div
												class={`px-3 py-1 rounded-full flex items-center gap-1.5 ${profitAnalysis().margin < 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
											>
												{profitAnalysis().margin < 0 ? (
													<TrendingDown size={14} />
												) : (
													<TrendingUp size={14} />
												)}
												<span class="text-xs font-black">
													{profitAnalysis().marginPct.toFixed(1)}%
												</span>
											</div>
										</div>

										<div class="grid grid-cols-2 gap-4">
											<div class="flex flex-col">
												<span class="text-[9px] font-black uppercase tracking-widest opacity-50">
													Estimasi Margin
												</span>
												<span
													class={`text-xl font-black tracking-tighter ${profitAnalysis().margin < 0 ? "text-red-600" : "text-emerald-600"}`}
												>
													{profitAnalysis().margin < 0 ? "-" : ""}
													Rp{" "}
													{Math.abs(
														profitAnalysis().margin,
													).toLocaleString()}
												</span>
											</div>
											<div class="flex flex-col text-right">
												<span class="text-[9px] font-black uppercase tracking-widest opacity-50">
													Total Diskon
												</span>
												<span class="text-xl font-black tracking-tighter text-foreground">
													-Rp{" "}
													{profitAnalysis().totalDiscount.toLocaleString()}
												</span>
											</div>
										</div>

										<Show when={profitAnalysis().margin < 0}>
											<div class="flex items-center gap-2 p-3 bg-red-100/50 rounded-xl text-red-700 border border-red-200">
												<TriangleAlert size={14} class="shrink-0" />
												<p class="text-[10px] font-bold leading-snug">
													Promosi ini berpotensi memberikan
													kerugian finansial karena biaya (HPP)
													lebih tinggi dari harga jual setelah
													diskon.
												</p>
											</div>
										</Show>
									</div>
								</Show>

								{/* Summary Card */}
								<Show when={formName()}>
									<div class="p-6 rounded-[28px] bg-muted/30 border-2 border-border/40 flex flex-col gap-2">
										<div class="flex items-center gap-2 mb-1">
											<Zap size={14} class="text-primary" />
											<span class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
												Ringkasan Promo
											</span>
										</div>
										<p class="text-sm font-bold text-foreground leading-relaxed">
											Setiap transaksi "{formName()}" aktif,{" "}
											{formType() === "BULK_DISCOUNT"
												? "produk terpilih akan langsung didiskon."
												: "syarat produk yang Anda tentukan akan memicu keuntungan secara otomatis."}
										</p>
									</div>
								</Show>
							</form>
						</div>

						{/* Action Buttons */}
						<div class="px-5 pb-10 pt-3.5 border-t border-border/50 bg-background/80 backdrop-blur-md shrink-0 sticky bottom-0 z-50">
							<Button
								type="button"
								onClick={() => handleSave()}
								class="w-full h-12 rounded-xl font-bold text-sm bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
							>
								<Zap size={16} /> {isEditing() ? "Perbarui" : "Simpan"}{" "}
								Kampanye
							</Button>
						</div>
					</SheetContent>
				</Sheet>

				{/* Campaign List */}
				<div class="flex flex-col gap-3">
					<For each={filteredCampaigns()}>
						{(c) => {
							const typeInfo = {
								BUNDLE: {
									icon: Layers,
									color: "text-indigo-600",
									bg: "bg-indigo-100",
									label: "Combo",
								},
								BUY_X_GET_Y: {
									icon: Gift,
									color: "text-pink-600",
									bg: "bg-pink-100",
									label: "Hadiah",
								},
								BULK_DISCOUNT: {
									icon: Tag,
									color: "text-emerald-600",
									bg: "bg-emerald-100",
									label: "Diskon",
								},
							}[c.type];

							return (
								<div
									class={`group relative flex flex-col p-5 rounded-2xl bg-card border border-border/60 shadow-sm transition-all hover:border-primary/40 active:scale-[0.99] cursor-pointer ${!c.isActive ? "opacity-70 grayscale" : ""}`}
									onClick={() => handleEdit(c)}
								>
									<div class="flex items-start justify-between mb-3">
										<div class="flex items-center gap-3">
											<div
												class={`w-11 h-11 rounded-xl font-black flex items-center justify-center shadow-inner ${typeInfo.bg} ${typeInfo.color}`}
											>
												<typeInfo.icon
													size={20}
													stroke-width={2.5}
												/>
											</div>
											<div>
												<h4 class="font-bold text-sm tracking-tight leading-none">
													{c.name}
												</h4>
												<span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1.5 inline-block">
													{typeInfo.label} • Prioritas {c.priority}
												</span>
											</div>
										</div>

										<button
											class="w-10 h-10 flex items-center justify-center text-muted-foreground/20 hover:text-red-500 transition-colors"
											onClick={(e) => {
												e.stopPropagation();
												handleDelete(c.id);
											}}
										>
											<Trash2 size={16} />
										</button>
									</div>

									<div class="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
										<div class="flex items-center gap-2">
											<div
												class={`w-2 h-2 rounded-full ${c.isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`}
											/>
											<span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
												{c.isActive ? "Aktif" : "Non-Aktif"}
											</span>
										</div>
										<ChevronRight
											size={16}
											class="text-muted-foreground/30 group-hover:text-primary transition-all"
										/>
									</div>
								</div>
							);
						}}
					</For>

					<Show when={filteredCampaigns().length === 0}>
						<div class="flex flex-col items-center justify-center py-20 text-center opacity-40">
							<div class="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
								<Megaphone size={32} />
							</div>
							<p class="font-bold text-sm">Belum ada kampanye aktif.</p>
							<p class="text-xs uppercase tracking-widest mt-1">
								Gunakan tombol (+) untuk membuat baru.
							</p>
						</div>
					</Show>
				</div>
			</div>
		</div>
	);
}
