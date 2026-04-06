import { createSignal, createResource, Show } from "solid-js";
import { ArrowLeft, QrCode, Upload, Check, Bike, Truck, ShoppingBag } from "lucide-solid";
import { A } from "@solidjs/router";
import { db, getSetting, setSetting } from "~/db/db";
import { Button } from "~/components/ui/button";

export default function PaymentSettingsPage() {
	const [qrisImage, { refetch: refetchQris }] = createResource(
		async () => await getSetting("qris_image"),
	);
	const [gfEnabled, { refetch: refetchGF }] = createResource(
		async () => (await getSetting("enable_gofood")) === "true",
	);
	const [grEnabled, { refetch: refetchGR }] = createResource(
		async () => (await getSetting("enable_grabfood")) === "true",
	);
	const [shEnabled, { refetch: refetchSH }] = createResource(
		async () => (await getSetting("enable_shopeefood")) === "true",
	);

	const [saving, setSaving] = createSignal(false);
	const [saved, setSaved] = createSignal(false);

	const handleFile = (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			alert("Hanya file gambar yang didukung.");
			return;
		}
		if (file.size > 2 * 1024 * 1024) {
			alert("Ukuran file maksimal 2MB.");
			return;
		}

		const reader = new FileReader();
		reader.onload = async () => {
			setSaving(true);
			try {
				await setSetting("qris_image", reader.result as string);
				refetchQris();
				setSaved(true);
				setTimeout(() => setSaved(false), 2000);
			} finally {
				setSaving(false);
			}
		};
		reader.readAsDataURL(file);
	};

	const handleRemove = async () => {
		if (
			!confirm(
				"Hapus gambar QRIS statis? Metode pembayaran QRIS tidak akan muncul di kasir.",
			)
		)
			return;
		await db.settings.delete("qris_image");
		refetchQris();
	};

	const togglePlatform = async (key: string, current: boolean, refetch: any) => {
		await setSetting(key, (!current).toString());
		refetch();
	};

	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-24">
			{/* Header */}
			<div class="flex items-center gap-3 px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
				<A
					href="/app/settings"
					class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
				>
					<ArrowLeft size={18} />
				</A>
				<div>
					<h1 class="font-black text-lg tracking-tight leading-none">
						Metode Pembayaran
					</h1>
					<p class="text-xs font-black text-muted-foreground mt-1 block uppercase tracking-widest leading-none">
						QRIS & Kanal Penjualan
					</p>
				</div>
			</div>

			<div class="p-5 flex flex-col gap-6">
				{/* QRIS Statis */}
				<div class="bg-card p-6 rounded-[32px] border border-border/70 shadow-sm flex flex-col gap-5">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner shrink-0">
							<QrCode size={24} stroke-width={2} />
						</div>
						<div>
							<h3 class="font-black text-base tracking-tight leading-none">QRIS Statis</h3>
							<p class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 opacity-60">
								Unggah Kode QR Toko Anda
							</p>
						</div>
					</div>

					<div class="h-px bg-border/40" />

					<Show
						when={qrisImage()}
						fallback={
							<label class="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border/60 rounded-3xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group">
								<input
									type="file"
									accept="image/*"
									class="hidden"
									onChange={handleFile}
								/>
								<div class="w-14 h-14 rounded-full bg-muted flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
									<Upload
										size={24}
										class="text-muted-foreground group-hover:text-primary transition-colors"
									/>
								</div>
								<div class="text-center">
									<p class="font-black text-sm">Ketuk untuk Mengunggah</p>
									<p class="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
										PNG, JPG, MAX 2MB
									</p>
								</div>
								{saving() && (
									<div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
								)}
							</label>
						}
					>
						<div class="flex flex-col gap-4">
							<div class="relative w-full aspect-square max-h-64 bg-muted rounded-3xl overflow-hidden border border-border/60 mx-auto">
								<img
									src={qrisImage()!}
									alt="QRIS"
									class="w-full h-full object-contain p-4"
								/>
								<Show when={saved()}>
									<div class="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-sm">
										<div class="bg-emerald-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
											<Check size={28} stroke-width={3} />
										</div>
									</div>
								</Show>
							</div>
							<div class="flex gap-2">
								<label class="flex-1">
									<input
										type="file"
										accept="image/*"
										class="hidden"
										onChange={handleFile}
									/>
									<div class="w-full h-14 rounded-2xl border-2 border-border/70 bg-muted/30 flex items-center justify-center gap-2 font-black text-sm cursor-pointer hover:bg-muted/50 transition-colors">
										<Upload size={16} /> Ganti Logo
									</div>
								</label>
								<Button
									variant="outline"
									class="flex-1 h-14 rounded-2xl font-black text-sm text-red-500 border-red-200 hover:bg-red-50 border-2"
									onClick={handleRemove}
								>
									Hapus
								</Button>
							</div>
						</div>
					</Show>
				</div>

				{/* Delivery Platforms */}
				<div class="bg-card p-6 rounded-[32px] border border-border/70 shadow-sm flex flex-col gap-5">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner shrink-0">
							<Bike size={24} stroke-width={2} />
						</div>
						<div>
							<h3 class="font-black text-base tracking-tight leading-none">Kanal Penjualan</h3>
							<p class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 opacity-60">
								Integrasi Pesanan Pihak Ketiga
							</p>
						</div>
					</div>

					<div class="h-px bg-border/40" />

					<div class="flex flex-col border border-border/40 rounded-3xl overflow-hidden divide-y divide-border/40">
						{/* GoFood */}
						<div class="flex items-center justify-between p-5 bg-muted/10">
							<div class="flex items-center gap-4">
								<div class="w-11 h-11 rounded-1.5xl bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200/50 shadow-sm">
									<Bike size={20} stroke-width={2.5} />
								</div>
								<div>
									<p class="font-black text-sm">GoFood</p>
									<p class="text-[9px] uppercase font-bold text-muted-foreground tracking-[0.1em] mt-0.5">Layanan Delivery</p>
								</div>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input 
									type="checkbox"
									class="sr-only peer"
									aria-label="Aktifkan GoFood"
									checked={gfEnabled() || false} 
									onInput={() => togglePlatform("enable_gofood", gfEnabled() === true, refetchGF)} 
								/>
								<div class="w-11 h-6 bg-muted border-2 border-border/60 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-border/60 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:border-primary"></div>
							</label>
						</div>

						{/* GrabFood */}
						<div class="flex items-center justify-between p-5 bg-muted/10">
							<div class="flex items-center gap-4">
								<div class="w-11 h-11 rounded-1.5xl bg-green-100 text-green-600 flex items-center justify-center border border-green-200/50 shadow-sm">
									<Truck size={20} stroke-width={2.5} />
								</div>
								<div>
									<p class="font-black text-sm">GrabFood</p>
									<p class="text-[9px] uppercase font-bold text-muted-foreground tracking-[0.1em] mt-0.5">Layanan Delivery</p>
								</div>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input 
									type="checkbox"
									class="sr-only peer"
									aria-label="Aktifkan GrabFood"
									checked={grEnabled() || false} 
									onInput={() => togglePlatform("enable_grabfood", grEnabled() === true, refetchGR)} 
								/>
								<div class="w-11 h-6 bg-muted border-2 border-border/60 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-border/60 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:border-primary"></div>
							</label>
						</div>

						{/* ShopeeFood */}
						<div class="flex items-center justify-between p-5 bg-muted/10">
							<div class="flex items-center gap-4">
								<div class="w-11 h-11 rounded-1.5xl bg-orange-100 text-orange-600 flex items-center justify-center border border-orange-200/50 shadow-sm">
									<ShoppingBag size={20} stroke-width={2.5} />
								</div>
								<div>
									<p class="font-black text-sm">ShopeeFood</p>
									<p class="text-[9px] uppercase font-bold text-muted-foreground tracking-[0.1em] mt-0.5">Layanan Delivery</p>
								</div>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input 
									type="checkbox"
									class="sr-only peer"
									aria-label="Aktifkan ShopeeFood"
									checked={shEnabled() || false} 
									onInput={() => togglePlatform("enable_shopeefood", shEnabled() === true, refetchSH)} 
								/>
								<div class="w-11 h-6 bg-muted border-2 border-border/60 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-border/60 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:border-primary"></div>
							</label>
						</div>
					</div>
					
					<div class="bg-primary/5 p-4 rounded-2xl border border-primary/10">
						<p class="text-[11px] font-bold text-primary/70 leading-relaxed italic">
							* Kanal yang diaktifkan akan muncul sebagai opsi pembayaran saat checkout di kasir. Anda dapat menyesuaikan harga net diterima untuk setiap pesanan platform.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
