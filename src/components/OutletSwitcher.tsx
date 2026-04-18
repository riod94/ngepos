import { createSignal, createResource, Show, For, createEffect } from "solid-js";
import { Store, ChevronDown, Check, Building2, RefreshCw } from "lucide-solid";
import {
  getActiveOutlets,
  getUserOutlets,
  getCurrentOutletId,
  switchOutlet,
  type Outlet,
} from "~/db/outletDb";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { toast } from "solid-toast";

interface OutletSwitcherProps {
  trigger?: "button" | "nav";
}

export function OutletSwitcher(props: OutletSwitcherProps) {
  const [open, setOpen] = createSignal(false);
  const [currentOutletId, setCurrentOutletId] = createSignal<string | null>(null);
  const [switching, setSwitching] = createSignal(false);

  const [outlets, { refetch: refetchOutlets }] = createResource(async () => {
    const outlets = await getActiveOutlets();
    const currentId = await getCurrentOutletId();
    setCurrentOutletId(currentId || outlets[0]?.id || null);
    return outlets;
  });

  createEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (userId) {
      refetchOutlets();
    }
  });

  const currentOutlet = () => {
    const id = currentOutletId();
    return outlets()?.find((o) => o.id === id) || outlets()?.[0];
  };

  const handleSwitchOutlet = async (outlet: Outlet) => {
    setSwitching(true);
    try {
      await switchOutlet(outlet.id);
      setCurrentOutletId(outlet.id);
      localStorage.setItem("current_outlet_id", outlet.id);
      toast.success(`Berhasil beralih ke outlet "${outlet.name}"`);
      setOpen(false);

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      toast.error("Gagal切换 outlet");
    } finally {
      setSwitching(false);
    }
  };

  const triggerContent = (
    <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-card hover:bg-muted transition-colors border border-border/50">
      <Store size={18} class="text-primary" />
      <div class="flex flex-col items-start">
        <span class="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Outlet
        </span>
        <span class="text-sm font-black text-foreground">
          {currentOutlet()?.name || "Pilih Outlet"}
        </span>
      </div>
      <ChevronDown size={16} class="text-muted-foreground ml-auto" />
    </div>
  );

  return (
    <Sheet open={open()} onOpenChange={setOpen}>
      <Show when={props.trigger === "nav"}>
        <SheetTrigger as="button" class="w-full">
          {triggerContent}
        </SheetTrigger>
      </Show>

      <Show when={props.trigger !== "nav"}>
        <SheetTrigger as="button">{triggerContent}</SheetTrigger>
      </Show>

      <SheetContent position="bottom" class="h-[70vh] rounded-t-[32px]">
        <SheetHeader class="text-left mb-4">
          <SheetTitle class="font-black text-xl">Pilih Outlet</SheetTitle>
          <p class="text-sm text-muted-foreground">
            Beralih outlet akan memuat data sesuai outlet yang dipilih
          </p>
        </SheetHeader>

        <div class="flex flex-col gap-3 overflow-y-auto pb-6">
          <Show
            when={!outlets.loading}
            fallback={
              <div class="flex items-center justify-center py-8">
                <RefreshCw size={24} class="animate-spin text-muted-foreground" />
              </div>
            }
          >
            <For each={outlets()}>
              {(outlet) => {
                const isSelected = () => currentOutletId() === outlet.id;
                return (
                  <button
                    type="button"
                    onClick={() => handleSwitchOutlet(outlet)}
                    disabled={switching()}
                    class={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      isSelected()
                        ? "border-primary bg-primary/5"
                        : "border-border/60 bg-card hover:bg-muted/30"
                    } ${switching() ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <div
                      class={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSelected() ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <Building2 size={20} />
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <h4 class="font-black text-base">{outlet.name}</h4>
                        <Show when={outlet.isHeadquarters}>
                          <span class="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            HQ
                          </span>
                        </Show>
                      </div>
                      <p class="text-xs text-muted-foreground truncate">
                        {outlet.code} {outlet.address ? `• ${outlet.address}` : ""}
                      </p>
                    </div>

                    <Show when={isSelected()}>
                      <div class="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check size={14} class="text-primary-foreground" strokeWidth={3} />
                      </div>
                    </Show>
                  </button>
                );
              }}
            </For>
          </Show>
        </div>

        <div class="border-t border-border/50 pt-4 mt-auto">
          <p class="text-xs text-center text-muted-foreground">
            outlet aktif: <span class="font-bold">{currentOutlet()?.name}</span>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function OutletBadge() {
  const [currentOutletId, setCurrentOutletId] = createSignal<string | null>(null);

  createEffect(async () => {
    const id = await getCurrentOutletId();
    setCurrentOutletId(id);
  });

  const [outlets] = createResource(async () => getActiveOutlets());

  const currentOutlet = () => {
    const id = currentOutletId();
    return outlets()?.find((o) => o.id === id);
  };

  return (
    <Show when={currentOutlet()}>
      <div class="inline-flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-full">
        <Store size={12} class="text-muted-foreground" />
        <span class="text-xs font-semibold text-muted-foreground">
          {currentOutlet()!.code}
        </span>
      </div>
    </Show>
  );
}

export function OutletHeader() {
  return (
    <div class="px-4 py-2 bg-muted/30 border-b border-border/50">
      <OutletSwitcher trigger="nav" />
    </div>
  );
}
