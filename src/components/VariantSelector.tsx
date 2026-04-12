import { createSignal, Show, For, createMemo } from "solid-js";
import { Check } from "lucide-solid";
import type { Product, VariantOption } from "~/db/db";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";

interface VariantSelectorProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVariants?: { groupName: string; optionName: string; priceModifier: number }[];
  onConfirm: (variants: { groupName: string; optionName: string; priceModifier: number }[]) => void;
  confirmLabel?: string;
}

export function VariantSelector(props: VariantSelectorProps) {
  const [selectedVariants, setSelectedVariants] = createSignal<{ groupName: string; option: VariantOption }[]>([]);

  // Sync initial variants when dialog opens
  createMemo(() => {
    if (props.open && props.product) {
      if (props.initialVariants && props.initialVariants.length > 0) {
        // Map from {groupName, optionName} to {groupName, option: VariantOption}
        const initial: { groupName: string; option: VariantOption }[] = [];
        props.product.variants?.forEach(group => {
          const match = props.initialVariants?.find(iv => iv.groupName === group.name);
          if (match) {
            const option = group.options.find(o => o.name === match.optionName);
            if (option) {
              initial.push({ groupName: group.name, option });
            }
          }
        });
        setSelectedVariants(initial);
      } else {
        // Auto-select first options for REQUIRED single groups
        const defaults: { groupName: string; option: VariantOption }[] = [];
        props.product.variants?.forEach(g => {
          if (g.isRequired && g.type === 'SINGLE' && g.options.length > 0) {
            defaults.push({ groupName: g.name, option: g.options[0] });
          }
        });
        setSelectedVariants(defaults);
      }
    }
  });

  const toggleVariant = (group: any, option: VariantOption) => {
    const groupName = group.name;
    const isSingle = group.type === 'SINGLE';
    const isRequired = group.isRequired;
    const max = group.maxSelectable || 0;

    setSelectedVariants(prev => {
      const isSelected = prev.some(v => v.groupName === groupName && v.option.name === option.name);

      if (isSingle) {
        if (isSelected) {
          if (isRequired) return prev;
          return prev.filter(v => v.groupName !== groupName);
        }
        return [...prev.filter(v => v.groupName !== groupName), { groupName, option }];
      } else {
        if (isSelected) {
          return prev.filter(v => !(v.groupName === groupName && v.option.name === option.name));
        }
        const count = prev.filter(v => v.groupName === groupName).length;
        if (max > 0 && count >= max) return prev;
        return [...prev, { groupName, option }];
      }
    });
  };

  const isVariantSelected = (groupName: string, optionName: string) => {
    return selectedVariants().some(v => v.groupName === groupName && v.option.name === optionName);
  };

  const currentVariantPrice = () => {
    return selectedVariants().reduce((acc, curr) => acc + curr.option.priceModifier, 0);
  };

  const getEffectiveBasePrice = () => {
    const prod = props.product as any;
    if (!prod) return 0;
    
    // Use stored basePrice if available (from recent cart update)
    if (prod.basePrice !== undefined) return prod.basePrice;
    
    // If not, calculate it by subtracting initial variant prices from current price
    // This handles old session items or items being added for the first time
    const initialModifiers = props.initialVariants?.reduce((s, v) => s + v.priceModifier, 0) || 0;
    return prod.price - initialModifiers;
  };

  const handleConfirm = () => {
    const prod = props.product;
    if (!prod) return;

    // Validate REQUIRED groups
    const missing = activeGroups().filter(g => 
      g.isRequired && !selectedVariants().some(sv => sv.groupName === g.name)
    );

    if (missing && missing.length > 0) {
      alert(`Mohon pilih varian: ${missing.map(m => m.name).join(', ')}`);
      return;
    }

    props.onConfirm(selectedVariants().map(v => ({
      groupName: v.groupName,
      optionName: v.option.name,
      priceModifier: v.option.priceModifier
    })));
  };

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent position="bottom" class="h-[90vh] md:max-w-lg md:mx-auto rounded-t-[32px] pt-6 flex flex-col px-0 pb-0 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] border-none">
        <SheetHeader class="px-6 mb-2 text-left">
          <SheetTitle class="font-black text-2xl tracking-tight">{props.product?.name}</SheetTitle>
          <p class="text-sm font-bold text-primary mt-1">Rp {getEffectiveBasePrice().toLocaleString('id-ID')}</p>
        </SheetHeader>

        <div class="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide flex flex-col gap-6 mt-4">
          <For each={activeGroups()}>
            {(group) => (
              <div class="flex flex-col">
                <div class={`flex items-center justify-between mb-3 p-3 rounded-2xl border transition-all ${
                  group.isRequired && !selectedVariants().some(sv => sv.groupName === group.name)
                    ? 'bg-red-50 border-red-200'
                    : 'bg-muted/40 border-border/50'
                }`}>
                  <div>
                    <h4 class="font-black text-sm uppercase tracking-widest">{group.name}</h4>
                    <p class="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wide">
                      {group.type === 'SINGLE' 
                        ? 'Pilih satu opsi' 
                        : group.maxSelectable 
                          ? `Pilih maksimal ${group.maxSelectable}` 
                          : 'Bisa pilih lebih dari satu'}
                    </p>
                  </div>
                  <Show when={group.isRequired}>
                    <span class={`text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md ${
                      !selectedVariants().some(sv => sv.groupName === group.name)
                        ? 'bg-red-500 text-white'
                        : 'bg-primary/10 text-primary'
                    }`}>Wajib</span>
                  </Show>
                </div>

                <div class="flex flex-col gap-2">
                  <For each={group.options}>
                    {(option) => {
                      const isSelected = () => isVariantSelected(group.name, option.name);
                      return (
                        <button 
                          type="button"
                          onClick={() => toggleVariant(group, option)}
                          class={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer w-full text-left ${
                            isSelected() 
                              ? 'border-primary bg-primary/5 shadow-[0_4px_15_rgba(230,90,20,0.05)]' 
                              : 'border-border/60 bg-card hover:bg-muted/30'
                          }`}
                        >
                          <div class="flex items-center gap-3">
                            <div class={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                              isSelected() ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
                            }`}>
                              <Show when={isSelected()}>
                                <Check size={12} stroke-width={4} />
                              </Show>
                            </div>
                            <span class={`font-bold text-sm ${isSelected() ? 'text-foreground' : 'text-foreground/80'}`}>{option.name}</span>
                          </div>
                          <Show when={option.priceModifier > 0}>
                            <span class="font-bold text-sm text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg">
                              + Rp {option.priceModifier.toLocaleString('id-ID')}
                            </span>
                          </Show>
                        </button>
                      );
                    }}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>

        <div class="border-t border-border/50 bg-background/95 backdrop-blur-xl p-5 pb-safe sticky bottom-0 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
          <Button class="w-full h-14 rounded-2xl text-base font-black premium-shadow border-none hover:bg-primary/95 flex items-center justify-between px-6" onClick={handleConfirm}>
            <span>{props.confirmLabel || 'Tambah Pesanan'}</span>
            <span>Rp {(getEffectiveBasePrice() + currentVariantPrice()).toLocaleString('id-ID')}</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
