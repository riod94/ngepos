import { createSignal, createResource, Show, For, createMemo } from "solid-js";
import { Plus, Pencil, Trash2, ArrowLeft, Zap, PlusCircle, X, Tag, Layers } from "lucide-solid";
import { A } from "@solidjs/router";
import { db, type Product, type RawMaterialCost, type VariantGroup, type VariantOption } from "~/db/db";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";

// ────────────── Utilities ──────────────
function calcMargin(price: number, cogs: number) {
  if (price <= 0) return 0;
  return Math.round(((price - cogs) / price) * 100);
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop";

// ────────────── Main Component ──────────────
export default function ProductsManager() {
  const [products, { refetch }] = createResource(async () => await db.products.toArray());
  const [categories] = createResource(async () => await db.categories.orderBy("orderIndex").toArray());

  const [sheetOpen, setSheetOpen] = createSignal(false);
  const [isEditing, setIsEditing] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<"info" | "hpp" | "variants">("info");

  // ── Form state ──
  const [formId, setFormId] = createSignal("");
  const [formName, setFormName] = createSignal("");
  const [formPrice, setFormPrice] = createSignal("0");
  const [formCategoryId, setFormCategoryId] = createSignal("");
  const [formStock, setFormStock] = createSignal("0");
  const [formRaw, setFormRaw] = createSignal<RawMaterialCost[]>([]);
  const [formVariants, setFormVariants] = createSignal<VariantGroup[]>([]);

  const totalHPP = createMemo(() => formRaw().reduce((s, r) => s + (r.cost * r.quantity), 0));
  const marginPct = createMemo(() => calcMargin(parseInt(formPrice()) || 0, totalHPP()));

  // ── Open helpers ──
  function openAdd() {
    setIsEditing(false);
    setFormId(`prod_${Date.now()}`);
    setFormName("");
    setFormPrice("0");
    setFormCategoryId(categories()?.[0]?.name ?? "Kopi");
    setFormStock("0");
    setFormRaw([]);
    setFormVariants([]);
    setActiveTab("info");
    setSheetOpen(true);
  }

  function openEdit(p: Product) {
    setIsEditing(true);
    setFormId(p.id);
    setFormName(p.name);
    setFormPrice(p.price.toString());
    setFormCategoryId(p.category);
    setFormStock(p.stock.toString());
    setFormRaw(JSON.parse(JSON.stringify(p.rawMaterials ?? [])));
    setFormVariants(JSON.parse(JSON.stringify(p.variants ?? [])));
    setActiveTab("info");
    setSheetOpen(true);
  }

  // ── Save ──
  async function saveProduct(e: Event) {
    e.preventDefault();
    if (isSaving()) return;
    setIsSaving(true);
    try {
      const price = parseInt(formPrice()) || 0;
      const cogs = totalHPP() > 0 ? totalHPP() : price * 0.45;
      const product: Product = {
        id: formId(),
        name: formName(),
        price,
        cogs,
        category: formCategoryId(),
        stock: parseInt(formStock()) || 0,
        image: DEFAULT_IMAGE,
        rawMaterials: formRaw().length > 0 ? formRaw() : undefined,
        variants: formVariants().length > 0 ? formVariants() : undefined,
      };
      if (isEditing()) await db.products.update(formId(), product);
      else await db.products.add(product);
      setSheetOpen(false);
      refetch();
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProduct(id: string, e: Event) {
    e.stopPropagation();
    if (!confirm("Hapus produk ini secara permanen?")) return;
    await db.products.delete(id);
    refetch();
  }

  // ── HPP helpers ──
  function addRaw() {
    setFormRaw([...formRaw(), { name: "", cost: 1000, quantity: 1, unit: "pcs" }]);
  }
  function updateRaw(i: number, field: keyof RawMaterialCost, val: string | number) {
    const arr = [...formRaw()];
    (arr[i] as any)[field] = val;
    setFormRaw(arr);
  }
  function removeRaw(i: number) { setFormRaw(formRaw().filter((_, idx) => idx !== i)); }

  // ── Variant helpers ──
  function addGroup() {
    setFormVariants([...formVariants(), { id: `vg_${Date.now()}`, name: "Pilihan", isRequired: false, type: "SINGLE", options: [] }]);
  }
  function updateGroup(i: number, field: keyof VariantGroup, val: any) {
    const arr = [...formVariants()];
    (arr[i] as any)[field] = val;
    setFormVariants(arr);
  }
  function removeGroup(i: number) { setFormVariants(formVariants().filter((_, idx) => idx !== i)); }
  function addOption(gi: number) {
    const arr = [...formVariants()];
    arr[gi].options = [...arr[gi].options, { name: "", priceModifier: 0 }];
    setFormVariants(arr);
  }
  function updateOption(gi: number, oi: number, field: keyof VariantOption, val: any) {
    const arr = [...formVariants()];
    arr[gi].options[oi] = { ...arr[gi].options[oi], [field]: val };
    setFormVariants(arr);
  }
  function removeOption(gi: number, oi: number) {
    const arr = [...formVariants()];
    arr[gi].options = arr[gi].options.filter((_, idx) => idx !== oi);
    setFormVariants(arr);
  }

  // ── Tabs ──
  const TAB_LABELS = [
    { key: "info", label: "Info Dasar" },
    { key: "hpp", label: "Resep & HPP" },
    { key: "variants", label: "Varian" },
  ] as const;

  return (
    <div class="flex flex-col min-h-screen bg-muted/10 pb-24">
      {/* Header */}
      <div class="flex items-center justify-between px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
        <div class="flex items-center gap-3">
          <A href="/app/pengaturan" class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60">
            <ArrowLeft size={18} />
          </A>
          <div>
            <h1 class="font-black text-[22px] tracking-tight">Katalog Produk</h1>
            <span class="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Inventaris & HPP</span>
          </div>
        </div>
        <Button onClick={openAdd} class="h-10 px-4 rounded-full font-black text-[13px] shadow-md">
          <Plus size={16} class="mr-1.5" stroke-width={3} /> Tambah
        </Button>
      </div>

      {/* Product List */}
      <div class="flex flex-col gap-3 p-5">
        <Show
          when={products() && products()!.length > 0}
          fallback={
            <div class="flex flex-col items-center py-20 text-muted-foreground gap-4">
              <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border/50">
                <Tag size={24} class="opacity-40" />
              </div>
              <div class="text-center">
                <p class="font-bold text-[15px]">Belum ada produk</p>
                <p class="text-sm mt-1">Tambahkan produk pertama Anda.</p>
              </div>
            </div>
          }
        >
          <For each={products()}>
            {(p) => (
              <div
                class="flex items-center gap-3 bg-card p-4 rounded-[20px] border border-border/70 shadow-sm cursor-pointer hover:border-primary/30 transition-all active:scale-[0.98] group"
                onClick={() => openEdit(p)}
              >
                <div class="w-16 h-16 rounded-[14px] bg-muted overflow-hidden shrink-0 border border-border/50">
                  <img src={p.image} alt={p.name} class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-black text-[15px] leading-tight truncate">{p.name}</h3>
                  <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span class="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-widest">{p.category}</span>
                    <Show when={p.variants && p.variants.length > 0}>
                      <span class="text-[10px] font-black text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded uppercase tracking-widest flex items-center gap-0.5">
                        <Layers size={9} /> Varian
                      </span>
                    </Show>
                    <Show when={p.rawMaterials && p.rawMaterials.length > 0}>
                      <span class="text-[10px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-widest">
                        Margin {calcMargin(p.price, p.cogs)}%
                      </span>
                    </Show>
                  </div>
                  <p class="font-black text-[14px] mt-1.5">Rp {p.price.toLocaleString('id-ID')}</p>
                </div>
                <div class="shrink-0 flex items-center gap-2">
                  <Button variant="outline" size="icon" class="h-9 w-9 rounded-full border-border/60 bg-red-50 hover:bg-red-100"
                    onClick={(e) => deleteProduct(p.id, e)}>
                    <Trash2 size={14} class="text-red-500" />
                  </Button>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Edit / Add Sheet — Mobile-First */}
      <Sheet open={sheetOpen()} onOpenChange={setSheetOpen}>
        <SheetContent position="bottom" class="h-[96vh] rounded-t-[32px] flex flex-col p-0 border-none shadow-[0_-20px_60px_rgba(0,0,0,0.15)]">
          {/* Sheet Header */}
          <SheetHeader class="px-5 pt-6 pb-4 border-b border-border/50 shrink-0">
            <SheetTitle class="font-black text-[22px] tracking-tight">
              {isEditing() ? "Edit Produk" : "Tambah Produk"}
            </SheetTitle>
          </SheetHeader>

          {/* Tab Bar */}
          <div class="flex gap-1 px-5 py-3 border-b border-border/40 bg-muted/20 shrink-0">
            <For each={TAB_LABELS}>
              {(tab) => (
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  class={`flex-1 h-10 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${
                    activeTab() === tab.key
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              )}
            </For>
          </div>

          {/* Scrollable form body */}
          <form id="product-form" onSubmit={saveProduct} class="flex-1 overflow-y-auto">
            {/* ── Tab 1: Info Dasar ── */}
            <Show when={activeTab() === "info"}>
              <div class="flex flex-col gap-5 p-5">
                <div class="flex flex-col gap-2">
                  <label for="prod-name" class="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Nama Produk</label>
                  <input
                    id="prod-name"
                    required
                    type="text"
                    class="h-14 w-full rounded-2xl border-2 border-border/70 bg-card px-4 font-bold text-[16px] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                    value={formName()}
                    onInput={e => setFormName(e.currentTarget.value)}
                    placeholder="Nama produk..."
                  />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="flex flex-col gap-2">
                    <label for="prod-price" class="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Harga Jual (Rp)</label>
                    <input
                      id="prod-price"
                      required
                      type="number"
                      class="h-14 w-full rounded-2xl border-2 border-border/70 bg-card px-4 font-black text-[22px] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                      value={formPrice()}
                      onInput={e => setFormPrice(e.currentTarget.value)}
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label for="prod-stock" class="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Stok Awal</label>
                    <input
                      id="prod-stock"
                      required
                      type="number"
                      class="h-14 w-full rounded-2xl border-2 border-border/70 bg-card px-4 font-black text-[22px] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                      value={formStock()}
                      onInput={e => setFormStock(e.currentTarget.value)}
                    />
                  </div>
                </div>

                <div class="flex flex-col gap-2">
                  <label for="prod-cat" class="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Kategori</label>
                  <select
                    id="prod-cat"
                    required
                    class="h-14 w-full rounded-2xl border-2 border-border/70 bg-card px-4 font-bold text-[15px] focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                    value={formCategoryId()}
                    onChange={e => setFormCategoryId(e.currentTarget.value)}
                  >
                    <For each={categories()}>
                      {cat => <option value={cat.name}>{cat.name}</option>}
                    </For>
                  </select>
                </div>
              </div>
            </Show>

            {/* ── Tab 2: Resep & HPP ── */}
            <Show when={activeTab() === "hpp"}>
              <div class="flex flex-col gap-4 p-5">
                {/* Margin indicator */}
                <div class={`flex items-center justify-between p-4 rounded-2xl border-2 ${marginPct() >= 40 ? "border-emerald-200 bg-emerald-50" : "border-orange-200 bg-orange-50"}`}>
                  <div>
                    <p class="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Estimasi Margin</p>
                    <p class={`text-[32px] font-black tracking-tighter ${marginPct() >= 40 ? "text-emerald-600" : "text-orange-600"}`}>
                      {marginPct()}%
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Total HPP</p>
                    <p class="font-black text-[18px]">Rp {totalHPP().toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <p class="text-[12px] font-bold text-muted-foreground">
                  Masukkan bahan baku dan biayanya agar margin keuntungan terhitung otomatis.
                </p>

                <div class="flex flex-col gap-3">
                  <For each={formRaw()}>
                    {(raw, i) => (
                      <div class="flex flex-col gap-2 bg-card p-4 rounded-2xl border border-border/60">
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Bahan #{i() + 1}</span>
                          <Button type="button" variant="ghost" size="icon" class="h-7 w-7 text-red-400 hover:text-red-500" onClick={() => removeRaw(i())}>
                            <X size={16} />
                          </Button>
                        </div>
                        <input
                          type="text"
                          class="h-11 w-full rounded-xl border border-border/70 bg-background px-3 font-bold text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Nama bahan"
                          value={raw.name}
                          onInput={e => updateRaw(i(), "name", e.currentTarget.value)}
                        />
                        <div class="grid grid-cols-3 gap-2">
                          <div class="flex flex-col gap-1 col-span-1">
                            <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Qty</label>
                            <input
                              type="number"
                              class="h-10 w-full rounded-xl border border-border/70 bg-background px-3 font-bold text-[14px] focus:outline-none"
                              value={raw.quantity}
                              onInput={e => updateRaw(i(), "quantity", parseFloat(e.currentTarget.value))}
                            />
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Unit</label>
                            <input
                              type="text"
                              class="h-10 w-full rounded-xl border border-border/70 bg-background px-3 font-bold text-[14px] focus:outline-none"
                              placeholder="gr, ml"
                              value={raw.unit}
                              onInput={e => updateRaw(i(), "unit", e.currentTarget.value)}
                            />
                          </div>
                          <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Biaya (Rp)</label>
                            <input
                              type="number"
                              class="h-10 w-full rounded-xl border border-border/70 bg-background px-3 font-bold text-[14px] focus:outline-none"
                              value={raw.cost}
                              onInput={e => updateRaw(i(), "cost", parseInt(e.currentTarget.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </For>

                  <Button type="button" onClick={addRaw} variant="outline"
                    class="w-full h-12 rounded-2xl font-black border-dashed border-2 border-border/60 text-[13px] text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all">
                    <Plus size={16} class="mr-2" /> Tambah Bahan Baku
                  </Button>
                </div>
              </div>
            </Show>

            {/* ── Tab 3: Varian ── */}
            <Show when={activeTab() === "variants"}>
              <div class="flex flex-col gap-4 p-5">
                <p class="text-[12px] font-bold text-muted-foreground">
                  Buat opsi pilihan seperti ukuran gelas, tingkat kemanisan, atau toping tambahan.
                </p>

                <For each={formVariants()}>
                  {(vg, gi) => (
                    <div class="flex flex-col gap-3 bg-card p-4 rounded-2xl border border-border/70">
                      <div class="flex items-center justify-between">
                        <span class="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Grup Varian #{gi() + 1}</span>
                        <Button type="button" variant="ghost" size="icon" class="h-7 w-7 text-red-400 hover:text-red-500" onClick={() => removeGroup(gi())}>
                          <X size={16} />
                        </Button>
                      </div>

                      <input
                        type="text"
                        class="h-12 w-full rounded-xl border border-border/70 bg-background px-4 font-black text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Judul grup, mis: Pilihan Ukuran"
                        value={vg.name}
                        onInput={e => updateGroup(gi(), "name", e.currentTarget.value)}
                      />

                      <div class="grid grid-cols-2 gap-2">
                        <div class="flex flex-col gap-1">
                          <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tipe Pilihan</label>
                          <select
                            class="h-11 rounded-xl border border-border/60 bg-background px-3 font-bold text-[13px] focus:outline-none"
                            value={vg.type}
                            onChange={e => updateGroup(gi(), "type", e.currentTarget.value as "SINGLE" | "MULTIPLE")}
                          >
                            <option value="SINGLE">Satu pilihan</option>
                            <option value="MULTIPLE">Bisa banyak</option>
                          </select>
                        </div>
                        <div class="flex flex-col gap-1">
                          <label class="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</label>
                          <select
                            class="h-11 rounded-xl border border-border/60 bg-background px-3 font-bold text-[13px] focus:outline-none"
                            value={vg.isRequired ? "1" : "0"}
                            onChange={e => updateGroup(gi(), "isRequired", e.currentTarget.value === "1")}
                          >
                            <option value="0">Opsional</option>
                            <option value="1">Wajib dipilih</option>
                          </select>
                        </div>
                      </div>

                      {/* Options */}
                      <div class="flex flex-col gap-2 bg-muted/20 p-3 rounded-xl border border-border/50">
                        <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Opsi Pilihan</p>
                        <For each={vg.options}>
                          {(opt, oi) => (
                            <div class="flex items-center gap-2">
                              <input
                                type="text"
                                class="flex-1 h-10 rounded-lg border border-border/60 bg-background px-3 font-bold text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0"
                                placeholder="Label opsi"
                                value={opt.name}
                                onInput={e => updateOption(gi(), oi(), "name", e.currentTarget.value)}
                              />
                              <input
                                type="number"
                                class="w-24 h-10 shrink-0 rounded-lg border border-border/60 bg-background px-3 font-bold text-[13px] focus:outline-none"
                                placeholder="+Harga"
                                value={opt.priceModifier}
                                onInput={e => updateOption(gi(), oi(), "priceModifier", parseInt(e.currentTarget.value) || 0)}
                              />
                              <Button type="button" variant="ghost" size="icon" class="h-8 w-8 shrink-0 text-red-400 hover:text-red-500"
                                onClick={() => removeOption(gi(), oi())}>
                                <X size={14} />
                              </Button>
                            </div>
                          )}
                        </For>
                        <Button type="button" variant="outline" size="sm" onClick={() => addOption(gi())}
                          class="mt-1 h-9 text-[12px] font-black border-dashed rounded-lg text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5">
                          + Tambah Opsi
                        </Button>
                      </div>
                    </div>
                  )}
                </For>

                <Button type="button" onClick={addGroup}
                  class="w-full h-14 rounded-2xl font-black border-dashed border-2 border-border/60 text-[13px] bg-transparent text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all">
                  <PlusCircle size={18} class="mr-2" /> Tambah Grup Varian
                </Button>
              </div>
            </Show>
          </form>

          {/* Sticky footer */}
          <div class="px-5 pb-8 pt-4 border-t border-border/50 bg-background shrink-0">
            <Button
              type="submit"
              form="product-form"
              disabled={isSaving()}
              class="w-full h-16 rounded-[24px] font-black text-[17px] bg-foreground text-background shadow-lg hover:bg-foreground/90 flex items-center justify-center gap-2 border-none transition-all hover:scale-[1.01]"
            >
              {isSaving() ? (
                <div class="w-6 h-6 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <><Zap size={20} /> {isEditing() ? "Perbarui Produk" : "Simpan Produk"}</>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
