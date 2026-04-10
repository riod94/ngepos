import { createResource, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { db } from "~/db/db";
import { getCustomerProgress, getActiveProgram } from "~/stores/loyalty";
import { QrCodeGenerator } from "~/components/QrCodeGenerator";
import { QrCode, Ticket, Store, Tag, Crown } from "lucide-solid";

export default function PublicMemberProfile() {
  const params = useParams();

  const [outletName] = createResource(async () => (await db.settings.get("outlet_name"))?.value ?? "Ngepos Coffee");
  const [outletLogo] = createResource(async () => (await db.settings.get("outlet_logo"))?.value);

  const [customer] = createResource(params.id, async (id) => {
    return await db.customers.get(id);
  });

  const [activeLoyalty] = createResource(async () => {
    return await getActiveProgram();
  });

  const [progress] = createResource(
    () => (customer() ? customer()!.id : null),
    async (id) => {
      const prog = activeLoyalty();
      if (!prog) return null;
      return await getCustomerProgress(id, prog.id);
    }
  );

  const [campaigns] = createResource(async () => {
    return await db.campaigns.where("isActive").equals(1).toArray();
  });

  return (
    <div class="min-h-screen bg-muted/10 pb-24 font-sans text-left">
      <Show 
        when={customer()} 
        fallback={
          <div class="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <div class="w-20 h-20 bg-card rounded-3xl shadow-sm border border-border/60 flex items-center justify-center text-muted-foreground/40 mb-6">
              <QrCode size={32} />
            </div>
            <h1 class="text-xl font-black tracking-tight mb-2">Member Tidak Ditemukan</h1>
            <p class="text-sm font-semibold text-muted-foreground">ID Member tidak valid atau telah dihapus dari sistem.</p>
          </div>
        }
      >
        {(m) => (
          <div class="max-w-md mx-auto relative cursor-default">
            
            {/* Header Area */}
            <div class="bg-primary px-6 pt-12 pb-24 rounded-b-[40px] shadow-lg relative overflow-hidden text-center">
              <div class="absolute -right-10 -top-10 text-white/5 rotate-12 pointer-events-none">
                <Crown size={240} />
              </div>
              <div class="relative z-10 flex flex-col items-center">
                <Show when={outletLogo()} fallback={<div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-4 backdrop-blur-md"><Store size={28} /></div>}>
                  <div class="w-16 h-16 bg-white/10 p-1 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
                    <img src={outletLogo()!} class="w-full h-full object-cover rounded-xl" />
                  </div>
                </Show>
                <h1 class="text-white text-2xl font-black tracking-tight leading-none mb-1 shadow-black/20">
                  {outletName()}
                </h1>
                <p class="text-white/80 text-[10px] uppercase font-black tracking-[0.2em]">Member Connect</p>
              </div>
            </div>

            <div class="px-5 -mt-16 relative z-20 flex flex-col gap-5">
              
              {/* Virtual Card */}
              <div class="bg-card rounded-[32px] p-6 shadow-2xl shadow-black/5 border border-border/60 text-center">
                <div class="bg-primary/5 p-4 rounded-[24px] border border-primary/10 mb-6 w-fit mx-auto shadow-inner">
                  <QrCodeGenerator value={m().qrCode} size={150} plain />
                </div>
                
                <h2 class="text-2xl font-black tracking-tight uppercase leading-none mb-1">
                  {m().name || "Member Baru"}
                </h2>
                <div class="flex items-center justify-center gap-2 mt-2">
                  <span class={`text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-full ${m().status === "ASSIGNED" ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground/50"}`}>
                    {m().status === "ASSIGNED" ? "Aktif" : "Belum Daftar"}
                  </span>
                  <span class="text-[11px] font-black text-muted-foreground/60 font-mono tracking-widest">
                    ID: {m().id.substring(m().id.length - 8).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Loyalty Progress */}
              <Show when={activeLoyalty() && progress()}>
                <div class="bg-card rounded-[32px] p-6 shadow-xl shadow-black/5 border border-border/60">
                  <div class="flex items-center justify-between mb-5">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                        <Crown size={16} />
                      </div>
                      <h3 class="font-black text-sm uppercase tracking-tight">Reward Stamp</h3>
                    </div>
                    <span class="text-[10px] font-black bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/10">
                      {progress()?.currentStamps} / {progress()?.targetStamps} Stamp
                    </span>
                  </div>

                  <div class="grid grid-cols-5 gap-2.5 mb-5">
                    <For each={Array.from({length: progress()!.targetStamps})}>
                      {(_, i) => (
                        <div class={`aspect-square rounded-[14px] flex items-center justify-center border-2 transition-all duration-500 shadow-sm ${i() < progress()!.currentStamps ? "bg-primary border-primary text-white scale-105" : "bg-muted/30 border-border/40 text-muted-foreground/10"}`}>
                          <Crown size={14} stroke-width={3} />
                        </div>
                      )}
                    </For>
                  </div>

                  <div class="bg-muted/40 rounded-2xl p-4 text-center border border-border/50">
                    <p class="text-xs font-bold text-muted-foreground">
                      {progress()!.isEligibleForReward 
                        ? `🎉 Hore! Kamu berhak mendapat ${activeLoyalty()!.rewardType === "FREE_PRODUCT" ? "Produk Gratis" : "Diskon"}!`
                        : `Kumpulkan ${(progress()!.targetStamps) - (progress()!.currentStamps)} stamp lagi untuk klaim hadiahmu.`}
                    </p>
                  </div>
                </div>
              </Show>

              {/* Promo Banners */}
              <Show when={campaigns() && campaigns()!.length > 0}>
                <div class="bg-card rounded-[32px] p-6 shadow-xl shadow-black/5 border border-border/60">
                  <div class="flex items-center gap-2 mb-5">
                    <div class="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
                      <Tag size={16} />
                    </div>
                    <h3 class="font-black text-sm uppercase tracking-tight">Promo Menarik</h3>
                  </div>

                  <div class="flex flex-col gap-3">
                    <For each={campaigns()}>
                      {(campaign) => (
                        <div class="relative overflow-hidden bg-gradient-to-br from-pink-500 to-rose-600 rounded-[20px] p-5 text-white shadow-md border border-pink-500/20">
                          <div class="absolute -right-4 -top-4 opacity-10">
                            <Ticket size={100} />
                          </div>
                          <div class="relative z-10">
                            <span class="inline-block px-2 py-0.5 bg-white/20 text-white rounded text-[8px] font-black uppercase tracking-widest backdrop-blur-sm mb-2 border border-white/20">
                              {campaign.type.replace(/_/g, " ")}
                            </span>
                            <h4 class="font-black text-lg leading-tight mb-1">{campaign.name}</h4>
                            <Show when={campaign.description}>
                              <p class="text-xs font-medium text-white/80 leading-relaxed max-w-[85%]">{campaign.description}</p>
                            </Show>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

            </div>

            {/* Global Footer */}
            <div class="text-center mt-12 pb-8">
              <div class="w-8 h-1 bg-border/40 mx-auto rounded-full mb-3" />
              <p class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                Powered by NgePOS
              </p>
            </div>
            
          </div>
        )}
      </Show>
    </div>
  );
}
