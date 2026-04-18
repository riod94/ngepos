import { createSignal, createResource, Show } from "solid-js";
import { ArrowLeft, Save, IdCard, Layout, Palette, Stamp } from "lucide-solid";
import { A, useNavigate } from "@solidjs/router";
import { getSetting, setSetting } from "~/db/db";
import { QrCodePrintGrid } from "~/components/QrCodeGenerator";
import { toast } from "solid-toast";

export default function MemberCardSettings() {
	const navigate = useNavigate();
	// State for Settings
	const [theme, setTheme] = createSignal<"light" | "dark" | "gradient" | "lines" | "custom">("light");
	const [layout, setLayout] = createSignal<"portrait" | "horizontal">("horizontal");
	const [showStamps, setShowStamps] = createSignal(true);
	
	// Custom Color State
	const [customBgType, setCustomBgType] = createSignal<"solid" | "gradient">("solid");
	const [customColor1, setCustomColor1] = createSignal("#4f46e5");
	const [customColor2, setCustomColor2] = createSignal("#ec4899");

	const [saving, setSaving] = createSignal(false);

	// Load existing settings
	const [outletName] = createResource(async () => (await getSetting("outlet_name")) ?? "Ngepos Coffee");
	
	createResource(async () => {
		const t = await getSetting("member_card_theme");
		if (t) setTheme(t as any);
		
		const l = await getSetting("member_card_layout");
		if (l) setLayout(l as any);
		
		const s = await getSetting("member_card_show_stamps");
		if (s !== undefined) setShowStamps(s === "true");

		const bg = await getSetting("member_card_custom_bg");
		if (bg) {
			if (bg.includes("linear-gradient")) {
				setCustomBgType("gradient");
				// Extract colors from simple linear-gradient(135deg, #c1, #c2)
				const match = bg.match(/linear-gradient\(135deg,\s*(#[A-Fa-f0-9]{6}),\s*(#[A-Fa-f0-9]{6})\)/);
				if (match) {
					setCustomColor1(match[1]);
					setCustomColor2(match[2]);
				}
			} else {
				setCustomBgType("solid");
				setCustomColor1(bg);
			}
		}
		return true;
	});

	const computedCustomBg = () => {
		if (customBgType() === "solid") return customColor1();
		return `linear-gradient(135deg, ${customColor1()}, ${customColor2()})`;
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await setSetting("member_card_theme", theme());
			await setSetting("member_card_layout", layout());
			await setSetting("member_card_show_stamps", showStamps() ? "true" : "false");
			if (theme() === "custom") {
				await setSetting("member_card_custom_bg", computedCustomBg());
			}
			toast.success("Desain kartu member berhasil disimpan");
		} catch (error) {
			toast.error("Gagal menyimpan desain");
		} finally {
			setSaving(false);
		}
	};

	// Dummy data for preview
	const dummyItems = [
		{ id: "cust_preview899", qrCode: "cust_preview899", label: "899A1BC" }
	];

	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-24">
			<div class="px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-[100] backdrop-blur-xl flex items-center justify-between">
				<div class="flex items-center gap-3">
					<button
						onClick={() => navigate(-1)}
						class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
					>
						<ArrowLeft size={18} />
					</button>
					<div>
						<h1 class="font-black text-lg tracking-tight leading-none">
							Desain Kartu Member
						</h1>
						<p class="text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-widest leading-none">
							Konfigurasi Visual Cetakan
						</p>
					</div>
				</div>
				<button
					onClick={handleSave}
					disabled={saving()}
					class="px-5 h-10 bg-primary text-white rounded-full font-black text-xs uppercase tracking-widest shadow-md flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
				>
					<Save size={16} /> {saving() ? "..." : "Simpan"}
				</button>
			</div>

			<div class="p-5 flex flex-col lg:flex-row gap-6">
				
				{/* Settings Panel */}
				<div class="flex-1 flex flex-col gap-6 md:max-w-md w-full">
					
					{/* Layout & Content Box */}
					<div class="bg-card p-6 rounded-[32px] border border-border/70 shadow-sm flex flex-col gap-6">
						
						{/* Orientasi (Layout) */}
						<div class="flex flex-col gap-3">
							<label class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
								<Layout size={14} /> Orientasi Cetak
							</label>
							<div class="grid grid-cols-2 gap-3">
								<button 
									onClick={() => setLayout("horizontal")}
									class={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${layout() === 'horizontal' ? 'border-primary bg-primary/5 text-primary' : 'border-border/50 hover:bg-muted text-muted-foreground'}`}
								>
									<div class="w-12 h-8 border-2 border-current rounded-md bg-white opacity-80" />
									<span class="text-[10px] font-black uppercase tracking-widest leading-none">Horizontal</span>
								</button>
								<button 
									onClick={() => setLayout("portrait")}
									class={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${layout() === 'portrait' ? 'border-primary bg-primary/5 text-primary' : 'border-border/50 hover:bg-muted text-muted-foreground'}`}
								>
									<div class="w-8 h-12 border-2 border-current rounded-md bg-white opacity-80" />
									<span class="text-[10px] font-black uppercase tracking-widest leading-none">Potret</span>
								</button>
							</div>
						</div>

						<div class="h-px w-full bg-border/40" />

						{/* Manual Stamps Toggle */}
						<div class="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
									<Stamp size={18} />
								</div>
								<div>
									<h3 class="font-black text-sm tracking-tight text-foreground">Kolom Stamp Manual</h3>
									<p class="text-[9px] font-bold text-muted-foreground mt-0.5 uppercase tracking-widest">Sediakan kotak ceklis/stempel</p>
								</div>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input type="checkbox" checked={showStamps()} onChange={(e) => setShowStamps(e.currentTarget.checked)} class="sr-only peer" />
								<div class="w-11 h-6 bg-muted/60 border border-border/80 rounded-full peer peer-checked:after:translate-x-[18px] peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
							</label>
						</div>

					</div>

					{/* Theme & Styling Box */}
					<div class="bg-card p-6 rounded-[32px] border border-border/70 shadow-sm flex flex-col gap-6">
						<label class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
							<Palette size={14} /> Tema Desain
						</label>
						
						<div class="grid grid-cols-2 gap-3">
							<button onClick={() => setTheme("light")} class={`p-3 rounded-2xl border-2 flex items-center justify-center transition-all ${theme() === 'light' ? 'border-primary ring-4 ring-primary/10' : 'border-border/60 hover:bg-muted'}`}>
								<div class="flex items-center gap-2">
									<div class="w-4 h-4 rounded-full border border-black/10 bg-white" />
									<span class="text-[10px] font-black uppercase tracking-widest">Clean Putih</span>
								</div>
							</button>
							<button onClick={() => setTheme("dark")} class={`p-3 rounded-2xl border-2 flex items-center justify-center transition-all ${theme() === 'dark' ? 'border-primary ring-4 ring-primary/10' : 'border-border/60 hover:bg-muted'}`}>
								<div class="flex items-center gap-2">
									<div class="w-4 h-4 rounded-full bg-[#111]" />
									<span class="text-[10px] font-black uppercase tracking-widest">Elegan Hitam</span>
								</div>
							</button>
							<button onClick={() => setTheme("gradient")} class={`p-3 rounded-2xl border-2 flex items-center justify-center transition-all ${theme() === 'gradient' ? 'border-primary ring-4 ring-primary/10' : 'border-border/60 hover:bg-muted'}`}>
								<div class="flex items-center gap-2">
									<div class="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600" />
									<span class="text-[10px] font-black uppercase tracking-widest">Gradien</span>
								</div>
							</button>
							<button onClick={() => setTheme("lines")} class={`p-3 rounded-2xl border-2 flex items-center justify-center transition-all ${theme() === 'lines' ? 'border-primary ring-4 ring-primary/10' : 'border-border/60 hover:bg-muted'}`}>
								<div class="flex items-center gap-2 relative overflow-hidden h-6 w-full max-w-[100px] rounded-lg">
									<div class="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.1)_4px,rgba(0,0,0,0.1)_5px)]" />
									<span class="relative z-10 text-[9px] font-black uppercase tracking-widest w-full bg-white/80 py-0.5">Garis</span>
								</div>
							</button>
							
							<div class="col-span-2">
								<button onClick={() => setTheme("custom")} class={`w-full p-3 rounded-2xl border-2 flex items-center justify-center transition-all ${theme() === 'custom' ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 hover:bg-muted'}`}>
									<span class="text-[10px] font-black uppercase tracking-widest">Warna Kustom Sendiri</span>
								</button>
							</div>
						</div>

						{/* Custom Color Pickers (Visible only if theme === 'custom') */}
						<Show when={theme() === "custom"}>
							<div class="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
								
								{/* Tab Mode */}
								<div class="flex p-1 bg-white rounded-xl shadow-sm border border-border/40">
									<button 
										onClick={() => setCustomBgType("solid")}
										class={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${customBgType() === 'solid' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50'}`}
									>
										Satu Warna
									</button>
									<button 
										onClick={() => setCustomBgType("gradient")}
										class={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${customBgType() === 'gradient' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted/50'}`}
									>
										Gradien (2 Warna)
									</button>
								</div>

								{/* Color Select */}
								<div class="flex items-center gap-3 justify-center mt-2">
									<div class="flex flex-col items-center gap-1">
										<p class="text-[8px] font-black uppercase tracking-wider text-muted-foreground">Warna 1</p>
										<input 
											type="color" 
											value={customColor1()} 
											onChange={(e) => setCustomColor1(e.currentTarget.value)}
											class="w-14 h-12 rounded-xl cursor-pointer p-1 bg-white border border-border/60 shadow-sm"
										/>
									</div>
									
									<Show when={customBgType() === "gradient"}>
										<ArrowLeft size={16} class="text-muted-foreground opacity-30 mx-2 rotate-180" />
										<div class="flex flex-col items-center gap-1">
											<p class="text-[8px] font-black uppercase tracking-wider text-muted-foreground">Warna 2</p>
											<input 
												type="color" 
												value={customColor2()} 
												onChange={(e) => setCustomColor2(e.currentTarget.value)}
												class="w-14 h-12 rounded-xl cursor-pointer p-1 bg-white border border-border/60 shadow-sm"
											/>
										</div>
									</Show>
								</div>

							</div>
						</Show>
					</div>

				</div>

				{/* Live Preview Panel */}
				<div class="flex-1 w-full flex flex-col items-center lg:items-start no-print">
					<div class="sticky top-28 w-full max-w-sm flex flex-col items-center">
						<p class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-6 bg-muted/30 px-4 py-2 rounded-full">
							Hasil Cetak Langsung (Skala)
						</p>
						
						{/* Wrapper to simulate actual print proportions */}
						<div class="border border-border/60 bg-white shadow-2xl p-6 rounded-3xl w-full flex justify-center items-center overflow-hidden shrink-0 min-h-[300px]">
							<div class="scale-100 origin-center">
								{/* Using inline style for QrCodePrintGrid inside an isolated container 
										Since QrCodePrintGrid includes a <style>, we render it isolated.
								*/}
								<div class="relative pointer-events-none origin-top" style={{ transform: layout() === 'horizontal' ? 'scale(1)' : 'scale(0.8)' }}>
									<QrCodePrintGrid
										items={dummyItems}
										theme={theme()}
										layout={layout()}
										showStamps={showStamps()}
										outletName={outletName()}
										customColor={computedCustomBg()}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

			</div>
		</div>
	);
}
