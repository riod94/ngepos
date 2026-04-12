import { createSignal, createResource, Show } from "solid-js";
import { ArrowLeft, Printer, Check, AlignCenter, Image as ImageIcon, MessageSquare } from "lucide-solid";
import { A, useNavigate } from "@solidjs/router";
import { getSetting, setSetting } from "~/db/db";

export default function ReceiptSettingsPage() {
	const navigate = useNavigate();
	const [showLogo, { refetch: refetchLogo }] = createResource(
		async () => (await getSetting("receipt_show_logo")) !== "false",
	);
	const [footerText, { refetch: refetchFooter }] = createResource(
		async () => (await getSetting("receipt_footer_text")) ?? "— TERIMA KASIH —",
	);
	const [saving, setSaving] = createSignal(false);
	const [saved, setSaved] = createSignal(false);

	const handleSave = async (key: string, value: string) => {
		setSaving(true);
		try {
			await setSetting(key, value);
			if (key === "receipt_show_logo") refetchLogo();
			if (key === "receipt_footer_text") refetchFooter();
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-24">
			<div class="flex items-center gap-3 px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
				<button
					onClick={() => navigate(-1)}
					class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
				>
					<ArrowLeft size={18} />
				</button>
				<div>
					<h1 class="font-black text-lg tracking-tight leading-none">
						Pengaturan Struk
					</h1>
					<p class="text-xs font-black text-muted-foreground mt-1 block uppercase tracking-widest leading-none">
						Tata Letak Thermal Printer
					</p>
				</div>
			</div>

			<div class="p-5 flex flex-col gap-6">
				<div class="bg-card p-6 rounded-[32px] border border-border/70 shadow-sm flex flex-col gap-6">
					
					{/* Toggle Logo */}
					<div class="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border-2 border-border/80">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
								<ImageIcon size={18} />
							</div>
							<div>
								<h3 class="font-black text-sm tracking-tight text-foreground">Tampilkan Logo</h3>
								<p class="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase tracking-widest">Cetak logo di bagian atas</p>
							</div>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input 
								type="checkbox" 
								class="sr-only peer" 
								checked={showLogo() ?? true}
								onChange={(e) => handleSave("receipt_show_logo", e.currentTarget.checked ? "true" : "false")}
							/>
							<div class="w-14 h-8 bg-muted/50 border-2 border-border/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[22px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[5px] after:bg-white after:border-border/40 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary peer-checked:border-primary shadow-inner"></div>
						</label>
					</div>

					<div class="h-px bg-border/40" />

					{/* Footer Text */}
					<div class="flex flex-col gap-2">
						<label class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2 flex items-center gap-2">
							<MessageSquare size={10} /> Pesan / Promo Footer
						</label>
						<textarea
							class="min-h-[100px] rounded-2xl border-2 border-border/80 bg-muted/20 p-5 font-black text-base focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all resize-none text-center"
							onBlur={(e) => handleSave("receipt_footer_text", e.currentTarget.value)}
							placeholder="Cth: TERIMA KASIH — Follow IG: @ngepos"
						>
							{footerText() ?? ""}
						</textarea>
					</div>

					<Show when={saved()}>
						<div class="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-3 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-bottom-2">
							<Check size={16} stroke-width={3} />
							<span class="text-xs font-black uppercase tracking-widest leading-none">
								Pengaturan Tersimpan
							</span>
						</div>
					</Show>
				</div>

				<div class="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex gap-3 text-indigo-700 items-start">
					<AlignCenter size={24} class="shrink-0 mt-0.5" />
					<div class="text-xs font-semibold leading-relaxed">
						<p class="font-black mb-1">
							Format Kertas: Thermal 58mm
						</p>
						Preview struk disesuaikan langsung dengan layout printer Bluetooth portabel Anda tanpa terpotong. Atur margin web-browser Anda ke 'None' saat Anda menekan tombol Cetak.
					</div>
				</div>
			</div>
		</div>
	);
}
