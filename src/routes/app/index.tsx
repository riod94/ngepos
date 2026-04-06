import { createSignal, createResource, Show, For, Suspense } from "solid-js";
import { Search, Plus, Check } from "lucide-solid";
import { db, type Product, type VariantOption } from "~/db/db";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { addToCart } from "~/stores/cart";
import { CartFloatingButton } from "~/components/CartFloatingButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";

const ProductSkeleton = () => (
  <div class="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-2 w-full animate-pulse">
    {Array.from({ length: 8 }).map(() => (
      <div class="overflow-hidden border border-border/30 rounded-2xl bg-card/60 flex flex-col h-full shadow-sm">
        <div class="aspect-square w-full bg-muted/40 rounded-t-[18px]"></div>
        <div class="p-3.5 flex flex-col justify-between flex-1 gap-3">
          <div class="h-3.5 bg-muted/50 rounded-full w-3/4"></div>
          <div class="h-3 bg-muted/30 rounded-full w-1/2 mt-1"></div>
        </div>
      </div>
    ))}
  </div>
);
export default function Home() {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [activeCategory, setActiveCategory] = createSignal("Semua");

  const [products] = createResource(async () => await db.products.toArray());
  const [categories] = createResource(async () => await db.categories.orderBy('orderIndex').toArray());

  const filteredProducts = () => {
    const rawProducts = products() || [];
    return rawProducts.filter(product => {
      const matchSearch = product.name.toLowerCase().includes(searchQuery().toLowerCase());
      const matchCategory = activeCategory() === "Semua" || product.category === activeCategory();
      return matchSearch && matchCategory;
    });
  };

  // ShopeeFood/GoFood Style Variant Modifier Logic
  const [selectedProduct, setSelectedProduct] = createSignal<Product | null>(null);
  const [modifierSheetOpen, setModifierSheetOpen] = createSignal(false);
  const [selectedVariants, setSelectedVariants] = createSignal<{ groupName: string; option: VariantOption }[]>([]);

  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      
      // Auto-select first options for REQUIRED single groups
      const defaults: {groupName: string; option: VariantOption}[] = [];
      product.variants.forEach(g => {
        if (g.isRequired && g.type === 'SINGLE' && g.options.length > 0) {
          defaults.push({ groupName: g.name, option: g.options[0] });
        }
      });
      setSelectedVariants(defaults);
      setModifierSheetOpen(true);
    } else {
      addToCart(product);
    }
  };

  const toggleVariant = (groupName: string, option: VariantOption, isSingle: boolean) => {
    setSelectedVariants(prev => {
      if (isSingle) {
         const filtered = prev.filter(v => v.groupName !== groupName);
         return [...filtered, { groupName, option }];
      } else {
         const exists = prev.find(v => v.groupName === groupName && v.option.name === option.name);
         if (exists) {
           return prev.filter(v => !(v.groupName === groupName && v.option.name === option.name));
         }
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
  
  const handleConfirmModifier = () => {
    const prod = selectedProduct();
    if (!prod) return;
    
    addToCart(prod, selectedVariants().map(v => ({ 
      groupName: v.groupName, 
      optionName: v.option.name, 
      priceModifier: v.option.priceModifier 
    })));
    
    setModifierSheetOpen(false);
    setTimeout(() => {
       setSelectedProduct(null);
       setSelectedVariants([]);
    }, 300); // Wait for transition
  };

  return (
    <div class="flex flex-col gap-5 pb-32 px-5 py-4">
      {/* Neo-Header */}
      <div class="flex flex-col gap-1 mb-2">
        <h1 class="font-black text-2xl tracking-tighter text-foreground leading-[1.1]">Selamat Datang,</h1>
        <p class="text-xs font-black text-muted-foreground uppercase tracking-[0.12em] mt-0.5">Apa yang ingin dipesan hari ini?</p>
      </div>

      {/* Search Header */}
      <div class="relative w-full">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <input 
          type="text"
          placeholder="Cari kopi, pastry, sirup..." 
          class="flex h-14 w-full rounded-2xl border-2 border-border/80 bg-card px-3 py-2 text-sm font-bold ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 pl-12 shadow-[0_4px_15px_rgba(0,0,0,0.02)] transition-all"
          value={searchQuery()}
          onInput={(e: Event) => setSearchQuery((e.target as HTMLInputElement).value)}
        />
      </div>

      {/* Categories Horizontal Scroll */}
      <div class="flex gap-2.5 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
        <Button
            variant={activeCategory() === "Semua" ? "default" : "outline"}
            class={`whitespace-nowrap rounded-full px-6 h-11 font-black text-sm uppercase tracking-wider transition-all ${
              activeCategory() === "Semua" ? 'shadow-md shadow-primary/20' : 'bg-card hover:bg-muted/50 border-border/50 text-muted-foreground'
            }`}
            onClick={() => setActiveCategory("Semua")}
          >
            Semua
        </Button>
        {categories()?.filter(c => c.name.toLowerCase() !== "semua").map(category => (
          <Button
            variant={activeCategory() === category.name ? "default" : "outline"}
            class={`whitespace-nowrap rounded-full px-6 h-11 font-black text-sm uppercase tracking-wider transition-all ${
              activeCategory() === category.name ? 'shadow-md shadow-primary/20' : 'bg-card hover:bg-muted/50 border-border/50 text-muted-foreground'
            }`}
            onClick={() => setActiveCategory(category.name)}
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Dense Product Grid (3 or 4 cols) */}
      <Suspense fallback={<ProductSkeleton />}>
        <div class="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-2">
          {filteredProducts().map(product => (
            <Card 
              class="overflow-hidden border-border/60 shadow-[0_4px_15px_rgba(0,0,0,0.03)] rounded-2xl active:scale-[0.96] transition-transform duration-200 cursor-pointer pointer-events-auto group bg-card flex flex-col" 
              role="button"
              tabIndex={0}
              onClick={() => handleProductClick(product)}
              onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleProductClick(product); } }}
            >
              <div class="aspect-square w-full relative bg-muted/30 overflow-hidden rounded-t-[18px]">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  loading="lazy"
                />
                <Show when={product.stock < 10}>
                  <div class="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs uppercase tracking-widest px-2 py-0.5 rounded-full font-black shadow-sm">
                    Sisa {product.stock}
                  </div>
                </Show>
                <Show when={product.variants && product.variants.length > 0}>
                  <div class="absolute top-2 right-2 bg-background/90 backdrop-blur-sm text-foreground text-xs uppercase tracking-widest px-2 py-0.5 rounded-full font-black shadow-sm border border-border/50">
                    Kustom
                  </div>
                </Show>
                <Button size="icon" class="absolute bottom-2 right-2 h-8 w-8 rounded-full shadow-md bg-white/95 text-primary group-hover:bg-primary group-hover:text-white backdrop-blur border-none flex-shrink-0">
                  <Plus size={18} stroke-width={3} />
                </Button>
              </div>
              <CardContent class="p-3.5 flex flex-col justify-between flex-1">
                <h3 class="font-black text-sm leading-tight line-clamp-2 text-foreground/90">{product.name}</h3>
                <p class="text-primary font-black text-sm mt-2 tracking-tighter italic">Rp {(product.price / 1000).toFixed(0)}k</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Suspense>
      
      {/* Varian Modifier Sheet (GoFood Style) */}
      <Sheet open={modifierSheetOpen()} onOpenChange={setModifierSheetOpen}>
        <SheetContent position="bottom" class="h-[90vh] md:max-w-lg md:mx-auto rounded-t-[32px] pt-6 flex flex-col px-0 pb-0 shadow-[0_-20px_50px_rgba(0,0,0,0.15)] border-none">
          <SheetHeader class="px-6 mb-2 text-left">
             <SheetTitle class="font-black text-2xl tracking-tight">{selectedProduct()?.name}</SheetTitle>
             <p class="text-sm font-bold text-primary mt-1">Rp {selectedProduct()?.price.toLocaleString('id-ID')}</p>
          </SheetHeader>
          
          <div class="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide flex flex-col gap-6 mt-4">
            <For each={selectedProduct()?.variants}>
              {(group) => (
                <div class="flex flex-col">
                  <div class="flex items-center justify-between mb-3 bg-muted/40 p-3 rounded-2xl border border-border/50">
                    <div>
                      <h4 class="font-black text-base uppercase tracking-wide">{group.name}</h4>
                      <p class="text-xs font-bold text-muted-foreground mt-0.5">
                        {group.type === 'SINGLE' ? 'Pilih satu opsi' : 'Bisa pilih lebih dari satu'}
                      </p>
                    </div>
                    <Show when={group.isRequired}>
                      <span class="bg-primary/10 text-primary text-xs uppercase font-black tracking-widest px-2 py-1 rounded-md">Wajib</span>
                    </Show>
                  </div>
                  
                  <div class="flex flex-col gap-2">
                    <For each={group.options}>
                      {(option) => {
                        const isSelected = () => isVariantSelected(group.name, option.name);
                        return (
                          <button 
                            type="button"
                            onClick={() => toggleVariant(group.name, option, group.type === 'SINGLE')}
                            class={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer w-full text-left ${
                              isSelected() 
                                ? 'border-primary bg-primary/5 shadow-[0_4px_15px_rgba(230,90,20,0.05)]' 
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
             <Button class="w-full h-14 rounded-2xl text-base font-black premium-shadow border-none hover:bg-primary/95 flex items-center justify-between px-6" onClick={handleConfirmModifier}>
                <span>Tambah Pesanan</span>
                <span>Rp {((selectedProduct()?.price || 0) + currentVariantPrice()).toLocaleString('id-ID')}</span>
             </Button>
          </div>
        </SheetContent>
      </Sheet>

      <CartFloatingButton />
    </div>
  );
}
