import { createSignal, createResource, Show, For, Suspense } from "solid-js";
import { Search, Plus, Check } from "lucide-solid";
import { db, type Product, type VariantOption } from "~/db/db";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { addToCart } from "~/stores/cart";
import { CartFloatingButton } from "~/components/CartFloatingButton";
import { ProductImage } from "~/components/ProductImage";
import { VariantSelector } from "~/components/VariantSelector";

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
  
  const [selectedProduct, setSelectedProduct] = createSignal<Product | null>(null);
  const [modifierSheetOpen, setModifierSheetOpen] = createSignal(false);

  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setModifierSheetOpen(true);
    } else {
      addToCart(product);
    }
  };

  const handleConfirmModifier = (variants: any[]) => {
    const prod = selectedProduct();
    if (!prod) return;
    
    addToCart(prod, variants);
    setModifierSheetOpen(false);
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
            class={`whitespace-nowrap rounded-2xl px-6 h-12 font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeCategory() === "Semua" ? 'shadow-md shadow-primary/20' : 'bg-card hover:bg-muted/50 border-border/50 text-muted-foreground'
            }`}
            onClick={() => setActiveCategory("Semua")}
          >
            <span class="text-lg">🏪</span> Semua
        </Button>
        {categories()?.filter(c => c.name.toLowerCase() !== "semua").map(category => (
          <Button
            variant={activeCategory() === category.name ? "default" : "outline"}
            class={`whitespace-nowrap rounded-2xl px-5 h-12 font-black text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeCategory() === category.name ? 'shadow-md shadow-primary/20' : 'bg-card hover:bg-muted/50 border-border/50 text-muted-foreground'
            }`}
            onClick={() => setActiveCategory(category.name)}
          >
            <span class="text-lg">{category.icon ?? "📦"}</span>
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
                <ProductImage src={product.image} name={product.name} />
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
       <VariantSelector
        product={selectedProduct()}
        open={modifierSheetOpen()}
        onOpenChange={setModifierSheetOpen}
        onConfirm={handleConfirmModifier}
      />

      <CartFloatingButton />
    </div>
  );
}
