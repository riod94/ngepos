import { createEffect } from "solid-js";
import { ArrowLeft, House, SearchX } from "lucide-solid";
import { A } from "@solidjs/router";

export default function NotFound() {
	createEffect(() => {
		document.title = "404 - Halaman Tidak Ditemukan";
	});

	return (
		<main class="flex flex-col items-center justify-center min-h-fit bg-background p-8 text-center bg-gradient-to-b from-background to-muted/20">
			{/* Visual Element */}
			<div class="relative mb-8 group">
				<div class="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-150 animate-pulse" />
				<div class="relative w-32 h-32 bg-card rounded-[40px] border-2 border-border/60 shadow-2xl flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-500">
					<SearchX size={56} class="text-primary" stroke-width={1.5} />
				</div>
				{/* Floating Accents */}
				<div class="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg animate-bounce">
					<span class="font-black text-xs">!</span>
				</div>
			</div>

			<h1 class="text-3xl font-black tracking-tighter text-foreground mb-3 leading-tight">
				Waduh! Halaman <br />{" "}
				<span class="text-primary italic">Tidak Ditemukan</span>
			</h1>

			<p class="text-muted-foreground font-semibold text-sm max-w-[280px] mb-10 leading-relaxed opacity-80">
				Sepertinya Anda tersesat di gudang kami. Halaman yang Anda cari
				tidak ada atau telah dipindahkan.
			</p>

			<div class="flex flex-col w-full max-w-[240px] gap-3">
				<A
					href="/app"
					class="h-14 bg-primary text-primary-foreground rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all"
				>
					<House size={20} stroke-width={2.5} />
					Kembali ke Kasir
				</A>

				<button
					onClick={() => window.history.back()}
					class="h-12 bg-muted/50 text-muted-foreground hover:bg-muted rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all border border-border/40"
				>
					<ArrowLeft size={16} stroke-width={2.5} />
					Halaman Sebelumnya
				</button>
			</div>

			<div class="mt-16 pt-8 border-t border-border/20 w-full max-w-[200px]">
				<p class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
					Ngepos POS v0.3.0
				</p>
			</div>
		</main>
	);
}
