import { A } from "@solidjs/router";
import { ArrowRight, Coffee, Zap, WifiOff, LayoutGrid } from "lucide-solid";
import { Button } from "~/components/ui/button";

export default function LandingPage() {
  return (
    <div class="flex flex-col min-h-screen bg-background selection:bg-primary/20 selection:text-primary">
      {/* Neo-brutalist header */}
      <header class="flex items-center justify-between p-6 border-b border-border/60 backdrop-blur-md sticky top-0 z-50 bg-background/90 shadow-sm">
        <div class="flex items-center gap-2">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-inner">
            <Coffee size={24} stroke-width={3} />
          </div>
          <span class="font-black text-2xl tracking-tighter uppercase text-foreground">Ngepos .</span>
        </div>
        <A href="/app">
          <Button class="rounded-full font-bold px-6 shadow-[0_4px_10px_rgba(0,0,0,0.05)] border border-border/80 text-sm hover:bg-muted transition-colors bg-card text-foreground">
            Akses POS <ArrowRight size={16} class="ml-2" />
          </Button>
        </A>
      </header>

      <main class="flex-1 flex flex-col pt-20 pb-32">
        <div class="max-w-5xl mx-auto px-6 flex flex-col items-center text-center">
          <div class="inline-flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-full mb-8 border border-border shadow-inner">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span class="text-xs font-black uppercase tracking-widest text-muted-foreground">Arsitektur Offline-First</span>
          </div>

          <h1 class="text-6xl md:text-7xl font-black tracking-tighter leading-[1.05] mb-8 max-w-4xl text-foreground !font-sans">
            Kasir Tangguh, <br class="hidden sm:block"/> 
            <span class="bg-gradient-to-r from-primary to-orange-400 text-transparent bg-clip-text pr-2 py-2">Anti Badai.</span> 
          </h1>
          <p class="text-lg md:text-xl font-semibold text-muted-foreground max-w-2xl leading-relaxed mb-12 !font-sans">
            Didesain heroik untuk bisnis F&B. Menjamin kelancaran kasir meski WiFi tumbang total. Mengemas manajemen varian kompleks dan analisa HPP tanpa batas.
          </p>

          <div class="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <A href="/app">
              <Button class="h-16 px-8 rounded-2xl font-black text-lg w-full sm:w-auto shadow-xl shadow-primary/20 bg-primary text-primary-foreground group transition-all hover:scale-[1.02] border-none">
                Buka Mesin Kasir Gratis
                <ArrowRight class="ml-2 opacity-80 group-hover:translate-x-1.5 transition-transform" stroke-width={3} />
              </Button>
            </A>
            <Button variant="outline" class="h-16 px-8 rounded-2xl font-black text-lg w-full sm:w-auto border-2 border-border/80 bg-background hover:bg-muted/50 transition-all text-foreground shadow-sm">
              <LayoutGrid size={20} class="mr-2" stroke-width={2.5}/> Hubungi Tim Kami
            </Button>
          </div>

          {/* Value Prop Modules */}
          <div class="grid sm:grid-cols-3 gap-6 mt-28 text-left w-full h-full max-w-5xl mx-auto">
             <div class="bg-card p-8 rounded-3xl border border-border/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-shadow">
               <div class="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-blue-200">
                 <WifiOff size={28} stroke-width={2.5} />
               </div>
               <h3 class="font-black text-xl mb-3 tracking-tight !font-sans">Offline-First Murni</h3>
               <p class="text-sm text-muted-foreground leading-relaxed font-semibold">Tinggalkan sistem "Load Spinner". Semua data database dikunci aman secara lokal via format modern IndexedDB. Tetap jualan tanpa sinyal!</p>
             </div>
             
             <div class="bg-card p-8 rounded-3xl border border-border/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-shadow">
               <div class="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-orange-200">
                 <Coffee size={28} stroke-width={2.5} />
               </div>
               <h3 class="font-black text-xl mb-3 tracking-tight !font-sans">Modifiers & Varian</h3>
               <p class="text-sm text-muted-foreground leading-relaxed font-semibold">Eskop tidak lengkap tanpa kustomisasi. Dukungan varian ekstra toping ala <i>Gofood</i> bawaan memudahkan kasir Anda dalam 1 klik.</p>
             </div>

             <div class="bg-card p-8 rounded-3xl border border-border/60 shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-shadow">
               <div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-emerald-200">
                 <Zap size={28} stroke-width={2.5} />
               </div>
               <h3 class="font-black text-xl mb-3 tracking-tight !font-sans">Bedah HPP Detail</h3>
               <p class="text-sm text-muted-foreground leading-relaxed font-semibold">Berhenti asal tebak untung-rugi. Masukkan resep bahan bakunya, dan biarkan mesin mendiagnosa seberapa sehat margin finansial Anda.</p>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
