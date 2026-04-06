import { Show, createSignal, For, createResource } from "solid-js";
import {
	Plus,
	Minus,
	QrCode,
	Banknote,
	ChevronLeft,
	CircleCheck,
	CircleX,
	Clock,
	Calendar,
} from "lucide-solid";
import { useNavigate } from "@solidjs/router";
import {
	cart,
	getCartTotal,
	getCartCount,
	updateQuantity,
	clearCart,
} from "~/stores/cart";
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

type PayStep = "select" | "qris_pending" | "done_ok" | "done_fail";

// ─── helper: compute total COGS from cart ─────────────────────────────────────
async function computeCogsTotal(): Promise<number> {
	let total = 0;
	for (const item of cart) {
		const product = await db.products.get(item.id);
		const cogs = product?.cogs ?? item.price * 0.45;
		total += cogs * item.quantity;
	}
	return total;
}

export function CartFloatingButton() {
	const navigate = useNavigate();
	const [cartSheetOpen, setCartSheetOpen] = createSignal(false);

	// Payment dialog
	const [payOpen, setPayOpen] = createSignal(false);
	const [payStep, setPayStep] = createSignal<PayStep>("select");
	const [processing, setProcessing] = createSignal(false);

	// Backdate state
	const [backdateOpen, setBackdateOpen] = createSignal(false);
	const [backdateDate, setBackdateDate] = createSignal(
		new Date().toISOString().split("T")[0],
	);
	const [backdateTime, setBackdateTime] = createSignal("12:00");

	// QRIS image (lazy loaded when dialog opens)
	const [qrisImage] = createResource(() => getSetting("qris_image"));

	const hasQris = () => !!qrisImage();

	// Timestamp to use for transaction (either now or backdated)
	const transactionTimestamp = () => {
		if (backdateOpen()) {
			return new Date(`${backdateDate()}T${backdateTime()}:00`).getTime();
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

	// ── Save transaction to DB ────────────────────────────────────────────────
	async function submitTransaction(method: "QRIS" | "CASH") {
		if (processing()) return null;
		setProcessing(true);
		try {
			const cogsTotal = await computeCogsTotal();
			const transactionId = `txn_${Date.now()}`;
			const ts = transactionTimestamp();

			await db.transactions.add({
				id: transactionId,
				receiptNumber: `INV-${Date.now()}`,
				totalAmount: getCartTotal(),
				cogsTotal,
				paymentMethod: method,
				timestamp: ts,
				status: "PENDING",
				isBackdated: isBackdated(),
			});

			const items = cart.map((item, idx) => ({
				id: `ti_${transactionId}_${idx}`,
				transactionId,
				productId: item.id,
				productName: item.name,
				quantity: item.quantity,
				priceAtTime: item.price,
				cogsAtTime: item.price * 0.45, // fallback if product not found
				selectedVariants: item.selectedVariants,
			}));
			await db.transactionItems.bulkAdd(items);

			// Update stock
			for (const item of cart) {
				const product = await db.products.get(item.id);
				if (product) {
					await db.products.update(item.id, {
						stock: Math.max(0, product.stock - item.quantity),
					});
				}
			}

			return transactionId;
		} finally {
			setProcessing(false);
		}
	}

	async function handleCash() {
		const id = await submitTransaction("CASH");
		if (!id) return;
		clearCart();
		setPayOpen(false);
		setCartSheetOpen(false);
		setTimeout(() => navigate(`/app/receipt/${id}`), 200);
	}

	async function handleQrConfirm(success: boolean) {
		if (!success) {
			setPayStep("done_fail");
			return;
		}
		const id = await submitTransaction("QRIS");
		if (!id) return;
		clearCart();
		setPayOpen(false);
		setCartSheetOpen(false);
		setTimeout(() => navigate(`/app/receipt/${id}`), 200);
	}

	function openPay() {
		setPayStep("select");
		setPayOpen(true);
	}

	function resetPay() {
		setPayStep("select");
	}

	return (
		<Show when={getCartCount() > 0}>
			{/* Floating Cart Trigger */}
			<div class="fixed bottom-19 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
				<Sheet open={cartSheetOpen()} onOpenChange={setCartSheetOpen}>
					<SheetTrigger class="w-full h-15 rounded-2xl flex items-center justify-between px-5 py-3 bg-primary text-primary-foreground active:scale-[0.98] transition-all border-none shadow-[0_10px_30px_rgba(210,80,20,0.35)] relative overflow-hidden group">
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
						class="h-[88vh] rounded-t-[32px] md:max-w-lg md:mx-auto flex flex-col p-0 border-none bg-background shadow-[0_-15px_50px_rgba(0,0,0,0.1)]"
					>
						<SheetHeader class="px-6 pt-7 pb-4 border-b border-border/50 shrink-0">
							<SheetTitle class="font-black text-xl tracking-tight leading-none">
								Pesanan Anda
							</SheetTitle>
						</SheetHeader>

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
									<div class="flex flex-col gap-1">
										<label
											for="bd-date-cart"
											class="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1"
										>
											<Calendar size={11} /> Tanggal
										</label>
										<input
											id="bd-date-cart"
											type="date"
											class="h-11 rounded-xl border border-amber-300 bg-amber-50 px-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
											value={backdateDate()}
											onInput={(e) =>
												setBackdateDate(e.currentTarget.value)
											}
										/>
									</div>
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
								)}
							</For>
						</div>

						{/* Footer */}
						<div class="px-5 pb-8 pt-4 border-t border-border/40 bg-background shrink-0">
							<div class="flex items-center justify-between mb-4">
								<span class="font-bold text-sm uppercase tracking-widest text-muted-foreground">
									Total
								</span>
								<span class="font-black text-2xl tracking-tighter">
									Rp {getCartTotal().toLocaleString("id-ID")}
								</span>
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
					if (!processing()) {
						setPayOpen(v);
						resetPay();
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
									Rp {getCartTotal().toLocaleString("id-ID")}
								</span>
								<Show when={backdateOpen()}>
									<span class="ml-2 text-xs font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-widest">
										Lampau
									</span>
								</Show>
							</DialogDescription>
						</DialogHeader>
						<div class="flex flex-col gap-3">
							{/* Cash */}
							<button
								type="button"
								disabled={processing()}
								onClick={handleCash}
								class="h-18 flex items-center gap-4 px-5 rounded-3xl border-2 border-border/80 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group disabled:opacity-50"
							>
								<div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
									<Banknote size={24} stroke-width={2.5} />
								</div>
								<span class="font-black text-lg">Uang Tunai</span>
								{processing() && (
									<div class="ml-auto w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
								)}
							</button>

							{/* QRIS — only rendered if QRIS image uploaded */}
							<Show when={hasQris()}>
								<button
									type="button"
									disabled={processing()}
									onClick={() => setPayStep("qris_pending")}
									class="h-18 flex items-center gap-4 px-5 rounded-3xl border-2 border-border/80 bg-card hover:border-blue-400/50 hover:bg-blue-50/50 transition-all group disabled:opacity-50"
								>
									<div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
										<QrCode size={24} stroke-width={2.5} />
									</div>
									<span class="font-black text-lg">
										QRIS / E-Wallet
									</span>
								</button>
							</Show>
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
