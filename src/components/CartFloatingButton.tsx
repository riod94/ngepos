import { Show, createSignal, For, createResource } from "solid-js";
import { unwrap } from "solid-js/store";
import {
	Plus,
	Minus,
	QrCode,
	Banknote,
	ChevronLeft,
	CircleCheck,
	CircleX,
	Clock,
	Calendar as CalendarIcon,
	Bike,
	Truck,
	ShoppingBag,
	PencilLine,
	UserPlus,
	UserCheck,
	Gift,
} from "lucide-solid";
import { useNavigate } from "@solidjs/router";
import {
	cart,
	getCartTotal,
	getCartSubtotal,
	calculateDiscounts,
	getCartCount,
	updateQuantity,
	updateCartItemVariants,
	clearCart,
	linkedCustomerId,
	setLinkedCustomerId,
	appliedRewardId,
	setAppliedRewardId,
} from "~/stores/cart";
import { QrCodeScanner } from "~/components/QrCodeScanner";
import { LoyaltyBanner } from "~/components/LoyaltyBanner";
import { 
	isStampEligible, 
	getActiveProgram, 
	addStamp, 
	getCustomerProgress, 
	checkAndCreateReward,
	claimReward
} from "~/stores/loyalty";
import { VariantSelector } from "~/components/VariantSelector";
import { Button } from "~/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "~/components/ui/dialog";
import { db, getSetting } from "~/db/db";
import { toast } from "solid-toast";
import { useCheckout } from "~/hooks/useCheckout";
import { Calendar } from "~/components/ui/calendar";

type PayStep = "select" | "adjustment" | "qris_pending" | "done_ok" | "done_fail";

// ─── helper: compute total COGS from items list ──────────────────────────────
async function computeCogsTotal(items: any[]): Promise<number> {
	let total = 0;
	try {
		for (const item of items) {
			const product = await db.products.get(item.id);
			let unitCogs = product?.cogs ?? item.price * 0.45;

			if (item.selectedVariants) {
				for (const sv of item.selectedVariants) {
					const group = product?.variants?.find((g: any) => g.name === sv.groupName);
					const option = group?.options.find((o: any) => o.name === sv.optionName);
					unitCogs += option?.cogsModifier ?? 0;
				}
			}
			total += unitCogs * item.quantity;
		}
	} catch (e) {
		console.warn("COGS calc error:", e);
	}
	return total;
}

export function CartFloatingButton() {
	const navigate = useNavigate();
	const [cartSheetOpen, setCartSheetOpen] = createSignal(false);
	const [editVariantOpen, setEditVariantOpen] = createSignal(false);
	const [editingItem, setEditingItem] = createSignal<any>(null);

	const [payOpen, setPayOpen] = createSignal(false);
	const [payStep, setPayStep] = createSignal<PayStep>("select");

	const { submitTransaction, processing, setProcessing } = useCheckout();

	// Backdate state
	const [backdateOpen, setBackdateOpen] = createSignal(false);
	const [isCalendarOpen, setIsCalendarOpen] = createSignal(false);
	const [backdateDate, setBackdateDate] = createSignal(Date.now());
	const [backdateTime, setBackdateTime] = createSignal("12:00");

	// QRIS image (lazy loaded when dialog opens)
	const [qrisImage] = createResource(() => getSetting("qris_image"));
	const [gfEnabled] = createResource(async () => (await getSetting("enable_gofood")) === "true");
	const [grEnabled] = createResource(async () => (await getSetting("enable_grabfood")) === "true");
	const [shEnabled] = createResource(async () => (await getSetting("enable_shopeefood")) === "true");

	const [adjustedAmount, setAdjustedAmount] = createSignal(0);
	const [selectedPlatform, setSelectedPlatform] = createSignal<string>("");

	const [scannerOpen, setScannerOpen] = createSignal(false);
	const [rewardProduct] = createResource(async () => {
		const rid = appliedRewardId();
		if (!rid) return null;
		const rw = await db.customerRewards.get(rid);
		if (!rw) return null;
		const lp = await db.loyaltyPrograms.get(rw.programId);
		if (!lp || lp.rewardType !== 'FREE_PRODUCT') return null;
		return await db.products.get(lp.rewardProductId!);
	});

	// Helper to calculate final discount inclusive of loyalty reward
	const getLoyaltyRewardAmount = () => {
		const rid = appliedRewardId();
		if (!rid) return 0;
		// Since we only handle FREE_PRODUCT as auto-add style logic for now, 
		// but let's calculate the discount value here
		const p = rewardProduct();
		if (p) return p.price;
		// For decimal/fixed (future, implement if needed)
		return 0;
	};

	const finalTotalAmount = () => {
		const subtotal = getCartSubtotal();
		const appDisc = calculateDiscounts().total;
		const loyaltyDisc = getLoyaltyRewardAmount();
		return Math.max(0, subtotal - appDisc - loyaltyDisc);
	};

	const hasQris = () => !!qrisImage();

	// Timestamp to use for transaction (either now or backdated)
	const transactionTimestamp = () => {
		if (backdateOpen()) {
			const d = new Date(backdateDate());
			const [h, min] = backdateTime().split(":");
			d.setHours(Number(h), Number(min), 0, 0);
			return d.getTime();
		}
		return Date.now();
	};

	const isBackdated = () => {
		if (!backdateOpen()) return false;
		const ts = transactionTimestamp();
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);
		return ts < todayStart.getTime();
	};

	// ── Save transaction to DB is now handled by useCheckout ──────────────────

	async function handleCash() {
		const id = await submitTransaction({
			method: "TUNAI",
			finalAmount: finalTotalAmount(),
			transactionTimestamp: transactionTimestamp(),
			isBackdated: isBackdated(),
			rewardProduct: rewardProduct(),
			finalTotalAmountFunc: finalTotalAmount
		});
		if (!id) return;
		finishPayment(id);
	}

	async function handleQrConfirm(success: boolean) {
		if (!success) {
			setPayStep("done_fail");
			return;
		}
		const id = await submitTransaction({
			method: "QRIS",
			finalAmount: finalTotalAmount(),
			transactionTimestamp: transactionTimestamp(),
			isBackdated: isBackdated(),
			rewardProduct: rewardProduct(),
			finalTotalAmountFunc: finalTotalAmount
		});
		if (!id) return;
		finishPayment(id);
	}

	async function handlePlatformConfirm() {
		const id = await submitTransaction({
			method: selectedPlatform(),
			finalAmount: adjustedAmount(),
			transactionTimestamp: transactionTimestamp(),
			isBackdated: isBackdated(),
			rewardProduct: rewardProduct(),
			finalTotalAmountFunc: finalTotalAmount
		});
		if (!id) return;
		finishPayment(id);
	}

	function finishPayment(id: string) {
		// Step 1: show success state
		setPayStep("done_ok");
		// Step 2: close dialog + cart after brief success animation
		setTimeout(() => {
			clearCart();
			setPayOpen(false);
			setCartSheetOpen(false);
			setTimeout(() => navigate(`/app/receipt/${id}`), 100);
		}, 600);
	}

	function startPlatformPayment(platform: string) {
		setSelectedPlatform(platform);
		setAdjustedAmount(finalTotalAmount());
		setPayStep("adjustment");
	}

	function openPay() {
		setPayStep("select");
		setPayOpen(true);
	}

	function resetPay() {
		setPayStep("select");
		setProcessing(false);
	}

	function openEditVariant(item: any) {
		setEditingItem(item);
		setEditVariantOpen(true);
	}

	function handleConfirmEditVariant(newVariants: any[]) {
		const item = editingItem();
		if (!item) return;

		updateCartItemVariants(item.cartItemId, newVariants);
		setEditVariantOpen(false);
		setEditingItem(null);
	}

	return (
		<Show when={getCartCount() > 0}>
			{/* Floating Cart Trigger */}
			<div class="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
				<Sheet open={cartSheetOpen()} onOpenChange={setCartSheetOpen}>
					<SheetTrigger class="w-full h-15 rounded-2xl flex items-center justify-between px-5 py-3 bg-primary text-primary-foreground active:scale-[0.98] transition-all border-none shadow-[0_10px_30px_rgba(67,56,202,0.35)] relative overflow-hidden group">
						<div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12 pointer-events-none" />
						<div class="flex items-center gap-3">
							<div class="bg-primary-foreground text-primary rounded-xl w-7 h-7 flex items-center justify-center font-black text-sm shadow-sm shrink-0">
								{getCartCount()}
							</div>
							<span class="font-black text-sm uppercase tracking-widest opacity-90">
								Keranjang
							</span>
						</div>
						<span class="font-black text-xl tracking-tighter">
							Rp {getCartTotal().toLocaleString("id-ID")}
						</span>
					</SheetTrigger>

					<SheetContent
						position="bottom"
						class="h-[88vh] rounded-t-[32px] md:max-w-lg md:mx-auto flex flex-col p-0 border-none bg-background shadow-[0_-15px_50px_rgba(0,0,0,0.1)] overflow-hidden"
					>
						<Show when={scannerOpen()}>
							<QrCodeScanner 
								onScan={(id) => {
									setLinkedCustomerId(id);
									setScannerOpen(false);
									toast.success("Member berhasil dihubungkan!");
								}} 
								onClose={() => setScannerOpen(false)} 
							/>
						</Show>

						<SheetHeader class="px-6 pt-7 pb-4 border-b border-border/50 shrink-0">
							<SheetTitle class="font-black text-xl tracking-tight leading-none">
								Pesanan Anda
							</SheetTitle>
						</SheetHeader>

						{/* Loyalty Section */}
						<div class="px-5 pt-4 shrink-0 space-y-3">
							<Show when={linkedCustomerId()} fallback={
								<button 
									onClick={() => setScannerOpen(true)}
									class="w-full h-12 rounded-2xl bg-primary/5 hover:bg-primary/10 border-2 border-primary/20 border-dashed flex items-center justify-center gap-3 text-primary transition-all group"
								>
									<UserPlus size={18} class="group-hover:scale-110 transition-transform" />
									<span class="text-xs font-black uppercase tracking-widest">Hubungkan Member QR</span>
								</button>
							}>
								<LoyaltyBanner customerId={linkedCustomerId()!} />
							</Show>
						</div>

						{/* Backdate Toggle */}
						<div class="px-5 pt-4 shrink-0">
							<button
								type="button"
								onClick={() => setBackdateOpen(!backdateOpen())}
								class={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
									backdateOpen()
										? "bg-amber-50 border-amber-200 text-amber-900"
										: "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50"
								}`}
							>
								<div class="flex items-center gap-2">
									<Clock size={16} />
									<span class="font-black text-sm uppercase tracking-widest">
										{backdateOpen()
											? "Transaksi Waktu Lampau"
											: "Input Backdate (Transaksi Lampau)"}
									</span>
								</div>
								<ChevronLeft
									size={16}
									class={`transition-transform ${backdateOpen() ? "-rotate-90" : "rotate-180"}`}
								/>
							</button>

							<Show when={backdateOpen()}>
								<div class="mt-2 grid grid-cols-2 gap-2">
									<div class="flex flex-col gap-2">
										<label
											class="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5"
										>
											<CalendarIcon size={12} stroke-width={3} /> Tanggal
										</label>
										<button
											type="button"
											onClick={() => setIsCalendarOpen(true)}
											class="h-12 w-full rounded-xl border border-primary/20 bg-primary/5 px-3 flex flex-col justify-center text-left hover:bg-primary/10 transition-all"
										>
											<span class="text-xs font-black text-primary">
												{new Date(backdateDate()).toLocaleDateString("id-ID", {
													day: "numeric",
													month: "short",
													year: "numeric",
												})}
											</span>
											<span class="text-[8px] font-black uppercase tracking-widest text-primary/40 mt-0.5">
												Ganti Tanggal
											</span>
										</button>
									</div>

									<Dialog open={isCalendarOpen()} onOpenChange={setIsCalendarOpen}>
										<DialogContent class="max-w-[360px] p-6 rounded-[32px]">
											<DialogHeader class="mb-2">
												<DialogTitle class="text-[10px] font-black uppercase tracking-widest text-primary">
													Pilih Tanggal Transaksi
												</DialogTitle>
											</DialogHeader>

											<Calendar
												value={backdateDate()}
												onChange={(ts) => {
													setBackdateDate(ts);
													setIsCalendarOpen(false);
												}}
											/>
										</DialogContent>
									</Dialog>
									<div class="flex flex-col gap-1">
										<label
											for="bd-time-cart"
											class="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1"
										>
											<Clock size={11} /> Waktu
										</label>
										<input
											id="bd-time-cart"
											type="time"
											class="h-11 rounded-xl border border-amber-300 bg-amber-50 px-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
											value={backdateTime()}
											onInput={(e) =>
												setBackdateTime(e.currentTarget.value)
											}
										/>
									</div>
								</div>
							</Show>
						</div>

						{/* Cart Items */}
						<div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 scrollbar-hide">
							<For each={cart}>
								{(item) => (
									<div class="flex items-center gap-3 bg-card px-4 py-4 rounded-3xl border border-border/60 shadow-sm">
										<div class="flex-1 min-w-0">
											<h4 class="font-black text-sm leading-tight truncate text-foreground/90">
												{item.name}
											</h4>
											<Show
												when={
													item.selectedVariants &&
													item.selectedVariants.length > 0
												}
											>
												<div class="flex flex-wrap gap-1 mt-1">
													<For each={item.selectedVariants}>
														{(v) => (
															<span class="text-xs font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
																{v.optionName}
																{v.priceModifier > 0
																	? ` +${v.priceModifier.toLocaleString("id-ID")}`
																	: ""}
															</span>
														)}
													</For>
												</div>
											</Show>
											<p class="text-primary font-black text-sm mt-1">
												Rp {item.price.toLocaleString("id-ID")}
											</p>
										</div>
										<div class="flex flex-col items-center gap-2">
											<Show when={item.variants && item.variants.length > 0}>
												<Button
													variant="ghost"
													size="icon"
													class="h-9 w-9 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100"
													onClick={() => openEditVariant(item)}
													title="Edit Varian"
												>
													<PencilLine size={16} />
												</Button>
											</Show>
											<div class="flex items-center gap-2 bg-muted/60 rounded-full p-1 border border-border/60 shadow-inner shrink-0">
												<Button
													variant="ghost"
													size="icon"
													class="h-8 w-8 rounded-full hover:bg-background"
													onClick={() =>
														updateQuantity(item.cartItemId, -1)
													}
												>
													<Minus size={16} stroke-width={3} />
												</Button>
												<span class="font-black text-base w-5 text-center select-none">
													{item.quantity}
												</span>
												<Button
													variant="ghost"
													size="icon"
													class="h-8 w-8 rounded-full bg-background border border-border/60 hover:bg-card"
													onClick={() =>
														updateQuantity(item.cartItemId, 1)
													}
												>
													<Plus size={16} stroke-width={3} />
												</Button>
											</div>
										</div>
									</div>
								)}
							</For>

							{/* Reward Product Placeholder in Cart */}
							<Show when={rewardProduct()}>
								<div class="flex items-center gap-3 bg-amber-50 px-4 py-4 rounded-3xl border-2 border-amber-200 border-dashed animate-in zoom-in-95 duration-300">
									<div class="flex-1 min-w-0">
										<p class="text-[9px] font-black uppercase tracking-widest text-amber-600">🎉 Bonus Loyalty</p>
										<h4 class="font-black text-sm leading-tight truncate text-amber-900">
											{rewardProduct()?.name}
										</h4>
										<p class="text-emerald-600 font-black text-sm mt-1">
											GRATIS REWARD
										</p>
									</div>
									<div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-200">
										<Gift size={24} />
									</div>
								</div>
							</Show>
						</div>

						{/* Edit Variant Dialog */}
						<VariantSelector
							product={editingItem()}
							open={editVariantOpen()}
							onOpenChange={setEditVariantOpen}
							initialVariants={editingItem()?.selectedVariants}
							onConfirm={handleConfirmEditVariant}
							confirmLabel="Simpan Perubahan"
						/>

						{/* Footer */}
						<div class="px-5 pb-8 pt-4 border-t border-border/40 bg-background shrink-0">
							<div class="flex flex-col gap-2 mb-4">
								<div class="flex items-center justify-between">
									<span class="font-bold text-xs uppercase tracking-widest text-muted-foreground">
										Subtotal
									</span>
									<span class="font-bold text-sm">
										Rp {getCartSubtotal().toLocaleString("id-ID")}
									</span>
								</div>
								
								<Show when={calculateDiscounts().total > 0}>
									<div class="flex items-center justify-between text-emerald-600">
										<div class="flex flex-col">
											<span class="font-bold text-xs uppercase tracking-widest">
												Promo
											</span>
											<span class="text-[10px] font-medium opacity-80 leading-none">
												{calculateDiscounts().note}
											</span>
										</div>
										<span class="font-bold text-sm">
											- Rp {calculateDiscounts().total.toLocaleString("id-ID")}
										</span>
									</div>
								</Show>

								<Show when={appliedRewardId()}>
									<div class="flex items-center justify-between text-amber-600">
										<div class="flex flex-col">
											<span class="font-bold text-xs uppercase tracking-widest flex items-center gap-1">
												<Gift size={10} /> Loyalty Reward
											</span>
											<span class="text-[10px] font-medium opacity-80 leading-none">
												{rewardProduct()?.name || "Free Product"}
											</span>
										</div>
										<span class="font-bold text-sm">
											- Rp {getLoyaltyRewardAmount().toLocaleString("id-ID")}
										</span>
									</div>
								</Show>

								<div class="flex items-center justify-between pt-2 border-t border-border/40">
									<span class="font-black text-sm uppercase tracking-widest text-foreground">
										Total Bayar
									</span>
									<span class="font-black text-2xl tracking-tighter text-primary">
										Rp {finalTotalAmount().toLocaleString("id-ID")}
									</span>
								</div>
							</div>
							<Button
								class="w-full h-14 rounded-2xl font-black text-base shadow-lg border-none hover:bg-primary/95 active:scale-[0.98] transition-all"
								onClick={openPay}
							>
								Lanjut Pembayaran
							</Button>
						</div>
					</SheetContent>
				</Sheet>
			</div>

			{/* Payment Dialog */}
			<Dialog
				open={payOpen()}
				onOpenChange={(v) => {
					// Block closing while processing or navigating away
					if (!processing() && payStep() !== "done_ok") {
						setPayOpen(v);
						if (!v) resetPay();
					}
				}}
			>
				<DialogContent class="w-[92vw] max-w-sm rounded-3xl p-6 shadow-2xl border-border/60">
					{/* Step: Select Method */}
					<Show when={payStep() === "select"}>
						<DialogHeader class="mb-5">
							<DialogTitle class="text-xl font-black tracking-tight">
								Metode Bayar
							</DialogTitle>
							<DialogDescription class="text-sm font-semibold text-muted-foreground mt-1">
								Tagihan:{" "}
								<span class="text-foreground font-black text-lg ml-1">
									Rp {finalTotalAmount().toLocaleString("id-ID")}
								</span>
								<Show when={backdateOpen()}>
									<span class="ml-2 text-xs font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-widest">
										Lampau
									</span>
								</Show>
							</DialogDescription>
						</DialogHeader>
						<div class="flex flex-col gap-3">
						<div class="grid grid-cols-2 gap-3">
							{/* Cash */}
							<button
								type="button"
								disabled={processing()}
								onClick={handleCash}
								class="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 border-border/80 bg-card hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all group disabled:opacity-50 h-28 text-center"
							>
								<div class="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
									{processing() ? (
										<div class="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" />
									) : (
										<Banknote size={22} stroke-width={2.5} />
									)}
								</div>
								<span class="font-black text-xs uppercase tracking-widest">Tunai</span>
							</button>

							{/* QRIS */}
							<Show when={hasQris()}>
								<button
									type="button"
									disabled={processing()}
									onClick={() => setPayStep("qris_pending")}
									class="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 border-border/80 bg-card hover:border-blue-500/50 hover:bg-blue-50/30 transition-all group disabled:opacity-50 h-28 text-center"
								>
									<div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
										<QrCode size={22} stroke-width={2.5} />
									</div>
									<span class="font-black text-xs uppercase tracking-widest">QRIS</span>
								</button>
							</Show>

							{/* GoFood */}
							<Show when={gfEnabled()}>
								<button
									type="button"
									disabled={processing()}
									onClick={() => startPlatformPayment("GOFOOD")}
									class="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 border-border/80 bg-card hover:border-emerald-500/50 hover:bg-emerald-50/30 transition-all group disabled:opacity-50 h-28 text-center"
								>
									<div class="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
										<Bike size={22} stroke-width={2.5} />
									</div>
									<span class="font-black text-xs uppercase tracking-widest">GoFood</span>
								</button>
							</Show>

							{/* GrabFood */}
							<Show when={grEnabled()}>
								<button
									type="button"
									disabled={processing()}
									onClick={() => startPlatformPayment("GRABFOOD")}
									class="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 border-border/80 bg-card hover:border-green-500/50 hover:bg-green-50/30 transition-all group disabled:opacity-50 h-28 text-center"
								>
									<div class="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
										<Truck size={22} stroke-width={2.5} />
									</div>
									<span class="font-black text-xs uppercase tracking-widest">GrabFood</span>
								</button>
							</Show>

							{/* ShopeeFood */}
							<Show when={shEnabled()}>
								<button
									type="button"
									disabled={processing()}
									onClick={() => startPlatformPayment("SHOPEEFOOD")}
									class="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 border-border/80 bg-card hover:border-orange-500/50 hover:bg-orange-50/30 transition-all group disabled:opacity-50 h-28 text-center"
								>
									<div class="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
										<ShoppingBag size={22} stroke-width={2.5} />
									</div>
									<span class="font-black text-xs uppercase tracking-widest text-[#F97316]">Shopee</span>
								</button>
							</Show>
						</div>
					</div>
				</Show>

					{/* Step: Adjustment (Set Actual Received Amount) */}
					<Show when={payStep() === "adjustment"}>
						<div class="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
							<div class="flex items-center gap-2">
								<button
									type="button"
									onClick={resetPay}
									class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
								>
									<ChevronLeft size={20} />
								</button>
								<div>
									<h3 class="font-black text-base text-foreground leading-none">Konfirmasi Setoran</h3>
									<p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Order {selectedPlatform()}</p>
								</div>
							</div>

							<div class="bg-muted/30 p-4 rounded-2xl border border-border/40">
								<p class="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 text-center">Total Tagihan App</p>
								<p class="text-2xl font-black text-center tracking-tighter opacity-50 line-through">Rp {getCartTotal().toLocaleString("id-ID")}</p>
							</div>

							<div class="flex flex-col gap-2">
								<label class="flex flex-col gap-2">
									<span class="text-xs font-black text-primary uppercase tracking-widest px-1">Total Tunai/Net Diterima</span>
									<div class="relative">
										<div class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-lg">Rp</div>
										<input 
											type="number"
											autofocus
											class="w-full h-16 rounded-2xl border-2 border-primary/30 bg-card pl-12 pr-4 font-black text-2xl tracking-tighter focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
											value={adjustedAmount()}
											onInput={e => setAdjustedAmount(Number.parseInt(e.currentTarget.value) || 0)}
										/>
									</div>
								</label>
							</div>

							<div class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
								<span class="text-xs font-bold text-emerald-800 uppercase tracking-widest">Selisih/Margin</span>
								<span class={`font-black text-lg ${adjustedAmount() - getCartTotal() >= 0 ? "text-emerald-700" : "text-red-600"}`}>
									{adjustedAmount() - getCartTotal() >= 0 ? "+" : "-"} Rp {Math.abs(adjustedAmount() - getCartTotal()).toLocaleString("id-ID")}
								</span>
							</div>

							<Button 
								class="w-full h-14 rounded-2xl font-black text-base shadow-lg shadow-primary/20"
								onClick={handlePlatformConfirm}
								disabled={processing()}
							>
								Simpan Transaksi
							</Button>
						</div>
					</Show>

					{/* Step: QRIS Pending (show QR + confirm) */}
					<Show when={payStep() === "qris_pending"}>
						<div class="flex flex-col items-center gap-4">
							<div class="flex items-center justify-between w-full mb-2">
								<button
									type="button"
									onClick={resetPay}
									class="flex items-center gap-1 text-sm font-black text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
								>
									<ChevronLeft size={16} /> Kembali
								</button>
								<span class="text-xs font-black uppercase tracking-widest text-muted-foreground">
									QRIS Statis
								</span>
							</div>

							<div class="w-full bg-white p-3 rounded-2xl border border-border/60 shadow-inner">
								<img
									src={qrisImage() ?? ""}
									alt="QRIS"
									class="w-full object-contain max-h-52 rounded-xl"
								/>
							</div>

							<div class="text-center">
								<p class="font-black text-xl tracking-tight">
									Rp {getCartTotal().toLocaleString("id-ID")}
								</p>
								<p class="text-sm font-bold text-muted-foreground mt-1">
									Scan & bayar, lalu konfirmasi di bawah
								</p>
							</div>

							<div class="flex gap-3 w-full">
								<button
									type="button"
									disabled={processing()}
									onClick={() => handleQrConfirm(false)}
									class="flex-1 h-14 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-black text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors disabled:opacity-50"
								>
									<CircleX size={20} /> Gagal
								</button>
								<button
									type="button"
									disabled={processing()}
									onClick={() => handleQrConfirm(true)}
									class="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/30"
								>
									{processing() ? (
										<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
									) : (
										<>
											<CircleCheck size={20} /> Sukses
										</>
									)}
								</button>
							</div>

							<button
								type="button"
								onClick={resetPay}
								class="text-sm font-black text-primary hover:underline uppercase tracking-widest"
							>
								Ubah Metode Pembayaran
							</button>
						</div>
					</Show>

					{/* Step: Success — brief animation before navigate */}
					<Show when={payStep() === "done_ok"}>
						<div class="flex flex-col items-center gap-4 py-6">
							<div class="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center animate-[scaleIn_0.3s_ease-out]">
								<CircleCheck size={44} class="text-emerald-500" />
							</div>
							<div class="text-center">
								<p class="font-bold text-xl text-emerald-600">
									Pembayaran Berhasil!
								</p>
								<p class="text-sm text-muted-foreground mt-1">
									Mengarahkan ke struk...
								</p>
							</div>
						</div>
					</Show>

					{/* Step: Payment Failed */}
					<Show when={payStep() === "done_fail"}>
						<div class="flex flex-col items-center gap-4 py-2">
							<div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
								<CircleX size={36} class="text-red-500" />
							</div>
							<div class="text-center">
								<p class="font-black text-xl text-red-600">
									Pembayaran Gagal
								</p>
								<p class="text-sm text-muted-foreground font-semibold mt-1">
									Transaksi tidak terkonfirmasi.
								</p>
							</div>
							<div class="flex gap-3 w-full">
								<Button
									variant="outline"
									class="flex-1 h-12 rounded-2xl font-black"
									onClick={resetPay}
								>
									Coba Lagi
								</Button>
								<Button
									class="flex-1 h-12 rounded-2xl font-black"
									onClick={() => {
										setPayOpen(false);
										resetPay();
									}}
								>
									Batalkan
								</Button>
							</div>
						</div>
					</Show>
				</DialogContent>
			</Dialog>
		</Show>
	);
}
