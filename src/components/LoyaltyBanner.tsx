import { createResource, Show, Suspense, For } from "solid-js";
import { 
  Users, 
  Trophy, 
  X, 
  Gift, 
  Loader2,
  CheckCircle,
  Calendar
} from "lucide-solid";
import { db } from "~/db/db";
import { 
  getCustomerProgress, 
  getActiveProgram,
  type CustomerProgress 
} from "~/stores/loyalty";
import { linkedCustomerId, setLinkedCustomerId, appliedRewardId, setAppliedRewardId } from "~/stores/cart";
import { toast } from "solid-toast";

interface LoyaltyBannerProps {
  customerId: string;
}

export function LoyaltyBanner(props: LoyaltyBannerProps) {
  const [program] = createResource(getActiveProgram);
  
  const [customer] = createResource(async () => {
    return await db.customers.get(props.customerId);
  });

  const [progress] = createResource(async () => {
    const p = program();
    if (!p) return null;
    return await getCustomerProgress(props.customerId, p.id);
  });

  const [availableRewards] = createResource(async () => {
    return await db.customerRewards
      .where("customerId").equals(props.customerId)
      .and(r => r.status === 'AVAILABLE')
      .toArray();
  });

  const handleApplyReward = (rewardId: string) => {
    setAppliedRewardId(rewardId);
    toast.success("Reward berhasil dipasang!");
  };

  const handleRemoveReward = () => {
    setAppliedRewardId(null);
    toast("Reward dilepas");
  };

  return (
    <div class="animate-in fade-in slide-in-from-top-4 duration-300">
      <Suspense fallback={
        <div class="h-24 bg-muted/20 rounded-[32px] animate-pulse flex items-center justify-center">
          <Loader2 class="animate-spin text-muted-foreground/40" size={24} />
        </div>
      }>
        <div class="relative overflow-hidden bg-white rounded-[32px] border border-border/60 shadow-lg group">
          {/* Background Accent */}
          <div class="absolute top-0 right-0 p-6 opacity-[0.03] -mr-8 -mt-8 scale-150 rotate-12 text-primary pointer-events-none">
            <Trophy size={100} />
          </div>

          <div class="p-5 flex flex-col gap-4">
            {/* Header: Member Info */}
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <Users size={20} />
                </div>
                <div>
                  <h4 class="text-sm font-black uppercase tracking-tight leading-none">
                    {customer()?.name || "Member Baru"}
                  </h4>
                  <p class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    ID: {props.customerId.substring(0, 10).toUpperCase()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setLinkedCustomerId(null);
                  setAppliedRewardId(null);
                }}
                class="p-2 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded-full transition-colors"
                title="Lepas Member"
              >
                <X size={18} />
              </button>
            </div>

            {/* Progress Section */}
            <Show when={progress()}>
              <div class="space-y-2">
                <div class="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                  <span class="text-primary">{progress()!.currentStamps} / {progress()!.targetStamps} Stamp</span>
                  <span class="text-muted-foreground">
                    {progress()!.currentStamps >= progress()!.targetStamps 
                      ? "Target Tercapai! 🎉" 
                      : `${progress()!.targetStamps - progress()!.currentStamps} transaksi lagi`}
                  </span>
                </div>
                <div class="h-2.5 bg-muted/40 rounded-full overflow-hidden border border-border/10 shadow-inner">
                  <div 
                    class="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary-rgb),0.4)]" 
                    style={{ width: `${Math.min(100, (progress()!.currentStamps / progress()!.targetStamps) * 100)}%` }}
                  />
                </div>
              </div>
            </Show>

            {/* Available Rewards Banner */}
            <Show when={availableRewards() && availableRewards()!.length > 0}>
               <div class="pt-2">
                  <div class="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col gap-3">
                     <div class="flex items-center gap-3 text-amber-700">
                        <div class="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center shrink-0">
                           <Gift size={18} />
                        </div>
                        <div class="flex-1 min-w-0">
                           <p class="text-[10px] font-black uppercase tracking-widest leading-none">Reward Tersedia!</p>
                           <p class="text-xs font-black truncate mt-0.5">Hadiah klaim menanti Anda</p>
                        </div>
                     </div>

                     <Show when={!appliedRewardId()} fallback={
                        <button 
                          onClick={handleRemoveReward}
                          class="w-full h-10 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-700 active:scale-95 transition-all shadow-md shadow-amber-600/20"
                        >
                           <CheckCircle size={14} /> Reward Terpasang
                        </button>
                     }>
                        <div class="flex flex-col gap-2">
                           <For each={availableRewards()}>
                              {reward => (
                                 <button 
                                   onClick={() => handleApplyReward(reward.id)}
                                   class="w-full h-10 bg-white border-2 border-amber-300 text-amber-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-100 transition-all"
                                 >
                                    Gunakan Reward Sekarang
                                 </button>
                              )}
                           </For>
                        </div>
                     </Show>
                  </div>
               </div>
            </Show>

            {/* Expiry Warning */}
            <Show when={progress()?.expiresAt}>
               <div class="flex items-center gap-2 text-[8px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                  <Calendar size={10} />
                  Stamp hangus pada {new Date(progress()!.expiresAt!).toLocaleDateString()}
               </div>
            </Show>
          </div>
        </div>
      </Suspense>
    </div>
  );
}
