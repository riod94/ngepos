import { createSignal, createResource, For, Show } from "solid-js";
import {
	ArrowLeft,
	Plus,
	Trash2,
	Megaphone,
	CircleCheck,
	ChevronRight,
	Tag,
	Package,
	Gift,
	Layers,
	Search,
	ArrowDown,
	Sparkles,
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
	const [activePickingIdx, setActivePickingIdx] = createSignal<number | null>(null);
	const [rewardPicking, setRewardPicking] = createSignal(false);

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

		const id = currentCampaignId() || `camp_${Date.now()}`;

		try {
			await db.transaction(
				"rw",
				["campaigns", "campaignItems", "campaignRewards"],
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
						reqItems().forEach((item, idx) => {
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
					await db.campaignRewards.add({
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
			console.error(err);
			toast.error("Gagal menyimpan kampanye");
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
			<div class="flex items-center justify-between p-5 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
				<div class="flex items-center gap-3">
					<button
						type="button"
						onClick={() => navigate("/app/settings")}
						class="w-10 h-10 flex items-center justify-center bg-card rounded-3xl shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95"
					>
						<ArrowLeft size={18} />
					</button>
					<div>
						<h1 class="font-black text-xl tracking-tight leading-none">
							Promosi & Kampanye
						</h1>
						<p class="text-xs font-black text-muted-foreground uppercase tracking-[0.12em] mt-1.5 block">
							Marketing & Loyalty
						</p>
					</div>
				</div>
			</div>

			<div class="p-5 flex flex-col gap-4">
				{/* Search & Actions */}
				<div class="flex gap-2">
					<div class="relative flex-1">
						<Search
							class="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
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
						<SheetTrigger
							as={Button}
							class="h-12 w-12 rounded-2xl flex items-center justify-center p-0 shadow-lg shadow-primary/20"
						>
							<Plus size={24} />
						</SheetTrigger>

						<SheetContent
							position="right"
							class="w-full sm:max-w-md h-full overflow-y-auto p-0 flex flex-col gap-0 border-none bg-background rounded-none"
						>
							<SheetHeader class="px-6 py-7 border-b border-border/40 shrink-0">
								<SheetTitle class="font-black text-2xl tracking-tighter">
									{isEditing()
										? "Edit Kampanye"
										: "Buat Kampanye Baru"}
								</SheetTitle>
							</SheetHeader>

							<div class="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
								{/* General Info */}
								<div class="flex flex-col gap-5">
									<div class="flex flex-col gap-2">
										<label class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
											Nama & Identitas
										</label>
										<input
											type="text"
											placeholder="Contoh: Promo Sarapan Hemat"
											class="h-14 w-full rounded-2xl border-2 border-border/60 bg-card px-5 font-bold text-base focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
											value={formName()}
											onInput={(e) =>
												setFormName(e.currentTarget.value)
											}
										/>
									</div>

									<div class="flex flex-col gap-1.5">
										<label class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
											Tipe Campaign
										</label>
										<div class="grid grid-cols-3 gap-3">
											<button
												class={`h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 transition-all shadow-sm ${formType() === "BULK_DISCOUNT" ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"}`}
												onClick={() => setFormType("BULK_DISCOUNT")}
											>
												<Tag size={20} />
												<span class="text-[10px] font-black uppercase tracking-wider">
													Diskon
												</span>
											</button>
											<button
												class={`h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 transition-all shadow-sm ${formType() === "BUNDLE" ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"}`}
												onClick={() => {
													setFormType("BUNDLE");
													setRewardType("FIXED_DISCOUNT");
												}}
											>
												<Layers size={20} />
												<span class="text-[10px] font-black uppercase tracking-wider">
													Combo
												</span>
											</button>
											<button
												class={`h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 transition-all shadow-sm ${formType() === "BUY_X_GET_Y" ? "bg-pink-50 border-pink-500 text-pink-700" : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"}`}
												onClick={() => {
													setFormType("BUY_X_GET_Y");
													setRewardType("FREE_PRODUCT");
												}}
											>
												<Gift size={20} />
												<span class="text-[10px] font-black uppercase tracking-wider">
													Hadiah
												</span>
											</button>
										</div>
									</div>
								</div>

								{/* ── SECTION 1: KONDISI (Bila...) ── */}
								<div class="flex flex-col gap-4 p-5 rounded-[28px] border-2 border-dashed border-border/60 bg-muted/20 relative group transition-colors hover:border-primary/30">
									<div class="absolute -top-3 left-6 px-3 bg-background border border-border/80 rounded-full flex items-center gap-2 py-0.5 shadow-sm">
										<ShoppingBag size={12} class="text-primary" />
										<span class="text-[10px] font-black uppercase tracking-widest text-primary">
											Tahap 1: Syarat
										</span>
									</div>

									<div class="mt-2 flex flex-col gap-4">
										<div class="flex flex-col gap-1">
											<h3 class="font-black text-sm text-foreground">
												Bila Pelanggan Membeli...
											</h3>
											<p class="text-[10px] text-muted-foreground font-medium italic">
												{formType() === "BULK_DISCOUNT" &&
													"Pilih satu atau banyak produk untuk langsung dipotong harganya."}
												{formType() === "BUNDLE" &&
													"Tentukan isi paket atau bundling (Harus dibeli bersamaan)."}
												{formType() === "BUY_X_GET_Y" &&
													"Tentukan produk dan jumlah minimal yang harus dibeli."}
											</p>
										</div>

										<Show when={formType() === "BULK_DISCOUNT"}>
											<div class="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-hide py-1">
												<For each={products()}>
													{(p) => (
														<button
															class={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all text-left shadow-sm ${targetItems().includes(p.id) ? "bg-background border-primary/40" : "bg-background/40 border-transparent hover:bg-background"}`}
															onClick={() => {
																if (
																	targetItems().includes(p.id)
																)
																	setTargetItems(
																		targetItems().filter(
																			(tid) => tid !== p.id,
																		),
																	);
																else
																	setTargetItems([
																		...targetItems(),
																		p.id,
																	]);
															}}
														>
															<div class="flex items-center gap-3">
																<div class="w-10 h-10 rounded-xl bg-muted border border-border/40 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 relative group-hover:bg-muted/40 transition-colors">
																	<Show
																		when={p.image}
																		fallback={
																			<Package
																				size={20}
																				class="text-muted-foreground/60"
																			/>
																		}
																	>
																		<img
																			src={p.image}
																			class="w-full h-full object-cover"
																			onError={(e) => {
																				e.currentTarget.style.display =
																					"none";
																				e.currentTarget.parentElement?.insertAdjacentHTML(
																					"beforeend",
																					'<div class="absolute inset-0 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground/60"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>',
																				);
																			}}
																		/>
																	</Show>
																</div>
																<div class="flex flex-col">
																	<span class="text-sm font-black truncate">
																		{p.name}
																	</span>
																	<span class="text-[10px] font-bold text-muted-foreground">
																		Rp{" "}
																		{p.price.toLocaleString()}
																	</span>
																</div>
															</div>
															<Show
																when={targetItems().includes(
																	p.id,
																)}
															>
																<div class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-sm">
																	<CircleCheck
																		size={14}
																		stroke-width={3}
																	/>
																</div>
															</Show>
														</button>
													)}
												</For>
											</div>
										</Show>

										<Show
											when={
												formType() === "BUNDLE" ||
												formType() === "BUY_X_GET_Y"
											}
										>
											<div class="flex flex-col gap-3">
												<div class="flex flex-col gap-3">
													<For each={reqItems()}>
														{(item, idx) => {
															const p = products()?.find(
																(pr) =>
																	String(pr.id) ===
																	String(item.productId),
															);
															return (
																<div class="flex flex-col gap-2 p-4 bg-background rounded-2xl border-2 border-border/40 shadow-sm animate-in fade-in slide-in-from-right-2">
																	<div class="flex items-center gap-3">
																		<div class="flex-1 min-w-0">
                                       <button 
                                          type="button"
                                          class="w-full bg-muted/30 hover:bg-muted/60 p-3 rounded-2xl border-2 border-border/40 text-left transition-all flex items-center gap-4 group/p"
                                          onClick={() => setActivePickingIdx(idx())}
                                       >
                                          <div class="w-12 h-12 rounded-xl bg-background border border-border/40 flex items-center justify-center overflow-hidden shrink-0 relative shadow-sm">
                                             <Show when={p?.image} fallback={<Package size={24} class="text-muted-foreground/30" />}>
                                                <img 
                                                   src={p!.image} 
                                                   class="w-full h-full object-cover transition-transform group-hover/p:scale-110" 
                                                   onError={(e) => {
                                                      e.currentTarget.style.display = 'none';
                                                      e.currentTarget.parentElement?.insertAdjacentHTML('beforeend', '<div class="absolute inset-0 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground/40"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>');
                                                   }}
                                                />
                                             </Show>
                                          </div>

                                          <div class="flex-1 min-w-0">
                                             <Show when={p} fallback={<span class="text-sm font-black text-muted-foreground italic">Klik untuk pilih produk...</span>}>
                                                <div class="flex flex-col">
                                                   <span class="text-sm font-black text-foreground truncate">{p!.name}</span>
                                                   <span class="text-[10px] font-black text-primary/70 uppercase tracking-widest mt-0.5">Rp {p!.price.toLocaleString()}</span>
                                                </div>
                                             </Show>
                                          </div>
                                          <ChevronRight size={16} class={`text-muted-foreground/30 transition-transform ${activePickingIdx() === idx() ? 'rotate-90' : ''}`} />
                                       </button>

                                       {/* List Dropdown Visual */}
                                       <Show when={activePickingIdx() === idx()}>
                                          <div class="mt-3 p-3 bg-card border-2 border-primary/20 rounded-[24px] shadow-2xl animate-in fade-in zoom-in-95 z-30 max-h-72 overflow-y-auto ring-4 ring-primary/5">
                                             <div class="grid grid-cols-1 gap-1.5">
                                                <For each={products()}>
                                                   {prod => (
                                                      <button 
                                                         type="button"
                                                         class="flex items-center gap-3 p-2.5 hover:bg-primary/5 rounded-2xl transition-all text-left border border-transparent hover:border-primary/10"
                                                         onClick={() => {
                                                            const updated = [...reqItems()];
                                                            updated[idx()] = { ...updated[idx()], productId: prod.id };
                                                            setReqItems(updated);
                                                            setActivePickingIdx(null);
                                                         }}
                                                      >
                                                         <div class="w-11 h-11 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0 relative shadow-inner">
                                                            <Show when={prod.image} fallback={<Package size={20} class="text-muted-foreground/30" />}>
                                                               <img src={prod.image} class="w-full h-full object-cover" />
                                                            </Show>
                                                         </div>
                                                         <div class="flex flex-col min-w-0 flex-1">
                                                            <span class="text-sm font-black text-foreground truncate">{prod.name}</span>
                                                            <span class="text-[10px] font-bold text-primary/80 uppercase tracking-wider">Rp {prod.price.toLocaleString()}</span>
                                                         </div>
                                                      </button>
                                                   )}
                                                </For>
                                             </div>
                                          </div>
                                       </Show>
																		</div>
																	</div>

																	<div class="flex items-center justify-between pt-3 border-t border-border/20">
																		<span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
																			Jumlah Pembelian
																		</span>
                                    <div class="flex items-center gap-3">
                                       <div class="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-1.5">
                                          <button
                                             type="button"
                                             class="w-5 h-5 flex items-center justify-center font-black text-muted-foreground hover:text-primary transition-colors"
                                             onClick={() => {
                                                const updated = [...reqItems()];
                                                updated[idx()] = { ...updated[idx()], quantity: Math.max(1, updated[idx()].quantity - 1) };
                                                setReqItems(updated);
                                             }}
                                          >
                                             -
                                          </button>
                                          <input
                                             type="number"
                                             class="w-8 bg-transparent text-center font-black text-sm outline-none"
                                             value={
                                                item.quantity
                                             }
                                             onInput={(e) => {
                                                const updated = [...reqItems()];
                                                updated[idx()] = { ...updated[idx()], quantity: Number(e.currentTarget.value) };
                                                setReqItems(updated);
                                             }}
                                          />
                                          <button
                                             type="button"
                                             class="w-5 h-5 flex items-center justify-center font-black text-muted-foreground hover:text-primary transition-colors"
                                             onClick={() => {
                                                const updated = [...reqItems()];
                                                updated[idx()] = { ...updated[idx()], quantity: updated[idx()].quantity + 1 };
                                                setReqItems(updated);
                                             }}
                                          >
                                             +
                                          </button>
                                       </div>
                                       <button
                                          type="button"
                                          onClick={() =>
                                             setReqItems(
                                                reqItems().filter(
                                                   (_, i) =>
                                                      i !==
                                                      idx(),
                                                ),
                                             )
                                          }
                                          class="w-10 h-10 flex items-center justify-center text-red-400/60 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                       >
                                          <Trash2 size={18} />
                                       </button>
                                    </div>
																	</div>
																</div>
															);
														}}
													</For>
													<Button
														variant="outline"
														class="border-dashed border-2 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-transparent hover:bg-primary/5 hover:border-primary/40"
														onClick={() =>
															setReqItems([
																...reqItems(),
																{ productId: "", quantity: 1 },
															])
														}
													>
														<Plus size={14} class="mr-1" /> Tambah
														Produk Syarat
													</Button>
												</div>
											</div>
										</Show>
									</div>
								</div>

								{/* Arrow Flow */}
								<div class="flex flex-col items-center -my-3 z-10">
									<div class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
										<ArrowDown size={20} stroke-width={3} />
									</div>
								</div>

								{/* ── SECTION 2: KEUNTUNGAN (Maka...) ── */}
								<div class="flex flex-col gap-4 p-5 rounded-[28px] border-2 border-emerald-100 bg-emerald-50/50 relative group transition-colors hover:border-emerald-200">
									<div class="absolute -top-3 left-6 px-3 bg-background border border-emerald-200 rounded-full flex items-center gap-2 py-0.5 shadow-sm">
										<Sparkles size={12} class="text-emerald-600" />
										<span class="text-[10px] font-black uppercase tracking-widest text-emerald-600">
											Tahap 2: Keuntungan
										</span>
									</div>

									<div class="mt-2 flex flex-col gap-4">
										<div class="flex flex-col gap-1 text-emerald-900">
											<h3 class="font-black text-sm">
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
													<Show
														when={formType() === "BULK_DISCOUNT"}
													>
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
													<Show
														when={formType() === "BUY_X_GET_Y"}
													>
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
															<div class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-600/60 text-lg">
																{rewardType() ===
																"PERCENT_DISCOUNT"
																	? "%"
																	: "Rp"}
															</div>
															<input
																type="number"
																class="h-14 w-full rounded-2xl border-2 border-emerald-100 bg-background pl-12 pr-4 font-black text-xl tracking-tighter"
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
													<div class="flex flex-col gap-1.5">
														<label class="text-[9px] font-black uppercase tracking-widest text-emerald-800/60 ml-1">
															Produk Hadiah
														</label>
                                          <button 
                                             type="button"
                                             class="h-14 w-full rounded-2xl border-2 border-emerald-100 bg-background px-4 font-black text-sm text-left flex items-center justify-between"
                                             onClick={() => setRewardPicking(!rewardPicking())}
                                          >
                                             <Show when={rewardProductId()} fallback={<span class="text-muted-foreground italic">Pilih Produk Hadiah...</span>}>
                                                {products()?.find(p => String(p.id) === String(rewardProductId()))?.name}
                                             </Show>
                                             <ChevronRight size={16} class={`transition-transform ${rewardPicking() ? 'rotate-90' : ''}`} />
                                          </button>

                                          <Show when={rewardPicking()}>
                                             <div class="mt-2 p-2 bg-card border-2 border-emerald-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                                                <div class="grid grid-cols-1 gap-1">
                                                   <For each={products()}>
                                                      {prod => (
                                                         <button 
                                                            type="button"
                                                            class="flex items-center gap-3 p-3 hover:bg-emerald-50 rounded-xl transition-colors text-left"
                                                            onClick={() => {
                                                               setRewardProductId(prod.id);
                                                               setRewardPicking(false);
                                                            }}
                                                         >
                                                            <div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 relative">
                                                               <Show when={prod.image} fallback={<Package size={18} class="text-muted-foreground/40" />}>
                                                                  <img src={prod.image} class="w-full h-full object-cover" />
                                                               </Show>
                                                            </div>
                                                            <div class="flex flex-col min-w-0">
                                                               <span class="text-xs font-black truncate">{prod.name}</span>
                                                               <span class="text-[10px] font-bold text-emerald-600">Rp {prod.price.toLocaleString()}</span>
                                                            </div>
                                                         </button>
                                                      )}
                                                   </For>
                                                </div>
                                             </div>
                                          </Show>
													</div>
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
							</div>

							{/* Action Buttons */}
							<div class="p-6 border-t border-border/40 bg-background shrink-0 flex gap-3">
								<Button
									variant="ghost"
									class="flex-1 h-13 rounded-2xl font-black text-sm uppercase tracking-widest"
									onClick={() => setSheetOpen(false)}
								>
									Batal
								</Button>
								<Button
									class="flex-[2] h-13 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95"
									onClick={handleSave}
								>
									Simpan Campaign
								</Button>
							</div>
						</SheetContent>
					</Sheet>
				</div>

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
									class={`group relative flex flex-col p-5 rounded-3xl bg-card border border-border/60 shadow-sm transition-all hover:border-primary/40 active:scale-[0.99] cursor-pointer ${!c.isActive ? "opacity-70 grayscale" : ""}`}
									onClick={() => handleEdit(c)}
								>
									<div class="flex items-start justify-between mb-3">
										<div class="flex items-center gap-3">
											<div
												class={`w-11 h-11 rounded-2xl font-black flex items-center justify-center shadow-inner ${typeInfo.bg} ${typeInfo.color}`}
											>
												<typeInfo.icon
													size={20}
													stroke-width={2.5}
												/>
											</div>
											<div>
												<h4 class="font-black text-base tracking-tight leading-none">
													{c.name}
												</h4>
												<span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1.5 inline-block">
													{typeInfo.label} • Prioritas {c.priority}
												</span>
											</div>
										</div>

										<button
											class="w-10 h-10 flex items-center justify-center text-red-300 hover:text-red-500 transition-colors"
											onClick={(e) => {
												e.stopPropagation();
												handleDelete(c.id);
											}}
										>
											<Trash2 size={18} />
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
											class="text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity"
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
