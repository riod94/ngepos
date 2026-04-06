import { createSignal, createResource, Show } from "solid-js";
import { ArrowLeft, Store, Upload, Check, Phone, MapPin } from "lucide-solid";
import { A } from "@solidjs/router";
import { getSetting, setSetting } from "~/db/db";
import { Button } from "~/components/ui/button";

export default function OutletSettingsPage() {
	const [outletName, { refetch: refetchName }] = createResource(
		async () => (await getSetting("outlet_name")) ?? "Ngepos Coffee",
	);
	const [outletAddress, { refetch: refetchAddress }] = createResource(
		async () => (await getSetting("outlet_address")) ?? "Jl. Kopi No. 123",
	);
	const [outletPhone, { refetch: refetchPhone }] = createResource(
		async () => (await getSetting("outlet_phone")) ?? "0812-3456-7890",
	);
	const [outletLogo, { refetch: refetchLogo }] = createResource(
		async () => await getSetting("outlet_logo"),
	);

	const [saving, setSaving] = createSignal(false);
	const [saved, setSaved] = createSignal(false);

	const handleSave = async (key: string, value: string) => {
		setSaving(true);
		try {
			await setSetting(key, value);
			if (key === "outlet_name") refetchName();
			if (key === "outlet_address") refetchAddress();
			if (key === "outlet_phone") refetchPhone();
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		} finally {
			setSaving(false);
		}
	};

	const handleFile = (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = async () => {
			await setSetting("outlet_logo", reader.result as string);
			refetchLogo();
		};
		reader.readAsDataURL(file);
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
						Informasi Outlet
					</h1>
					<p class="text-xs font-black text-muted-foreground mt-1 block uppercase tracking-widest leading-none">
						Detail & Identitas Toko
					</p>
				</div>
			</div>

			<div class="p-5 flex flex-col gap-6">
				<div class="bg-card p-6 rounded-[32px] border border-border/70 shadow-sm flex flex-col gap-6">
					<div class="flex flex-col items-center gap-4">
						<div class="relative w-24 h-24 rounded-[32px] bg-muted border-2 border-border overflow-hidden shadow-inner group">
							<Show
								when={outletLogo()}
								fallback={
									<div class="w-full h-full flex items-center justify-center text-muted-foreground/40">
										<Store size={40} stroke-width={1.5} />
									</div>
								}
							>
								<img
									src={outletLogo()!}
									alt="Logo"
									class="w-full h-full object-cover"
								/>
							</Show>
							<label class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]">
								<input
									type="file"
									accept="image/*"
									class="hidden"
									onChange={handleFile}
								/>
								<Upload size={20} class="text-white mb-1" />
								<span class="text-[10px] font-black text-white uppercase tracking-widest">
									Ganti
								</span>
							</label>
						</div>
						<div class="text-center">
							<p class="font-black text-base tracking-tight leading-none">Logo Outlet</p>
							<p class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 opacity-60">
								PNG/JPG MAKS 1MB
							</p>
						</div>
					</div>

					<div class="h-px bg-border/40" />

					<div class="flex flex-col gap-5">
						<div class="flex flex-col gap-2">
							<label class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2 flex items-center gap-2">
								<Store size={10} /> Nama Toko
							</label>
							<input
								type="text"
								class="h-14 rounded-2xl border-2 border-border/80 bg-muted/20 px-5 font-black text-base focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
								value={outletName() ?? ""}
								onBlur={(e) => handleSave("outlet_name", e.currentTarget.value)}
								placeholder="Masukan nama toko..."
							/>
						</div>

						<div class="flex flex-col gap-2">
							<label class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2 flex items-center gap-2">
								<MapPin size={10} /> Alamat Lengkap
							</label>
							<textarea
								class="min-h-[100px] rounded-2xl border-2 border-border/80 bg-muted/20 p-5 font-black text-base focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all resize-none"
								onBlur={(e) =>
									handleSave("outlet_address", e.currentTarget.value)
								}
								placeholder="Masukan alamat toko..."
							>
								{outletAddress() ?? ""}
							</textarea>
						</div>

						<div class="flex flex-col gap-2">
							<label class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2 flex items-center gap-2">
								<Phone size={10} /> Nomor Telepon
							</label>
							<input
								type="tel"
								class="h-14 w-full rounded-2xl border-2 border-border/80 bg-muted/20 px-5 font-black text-base focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
								value={outletPhone() ?? ""}
								onBlur={(e) => handleSave("outlet_phone", e.currentTarget.value)}
								placeholder="0812..."
							/>
						</div>
					</div>

					<Show when={saved()}>
						<div class="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-3 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-bottom-2">
							<Check size={16} stroke-width={3} />
							<span class="text-xs font-black uppercase tracking-widest leading-none">
								Perubahan Berhasil Disimpan
							</span>
						</div>
					</Show>
				</div>
			</div>
		</div>
	);
}
