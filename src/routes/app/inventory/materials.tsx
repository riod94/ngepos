import { createSignal, createResource, Show, For } from "solid-js";
import { ArrowLeft, Plus, Box, ArrowDownCircle, ArrowRightLeft, Scale, ChevronLeft, Zap } from "lucide-solid";
import { A } from "@solidjs/router";
import { db, type RawMaterialLibrary } from "~/db/db";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { toast } from "solid-toast";

export default function Materials() {
  const [materials, { refetch }] = createResource(async () =>
    await db.rawMaterialLibrary.toArray()
  );

  const [isAddOpen, setIsAddOpen] = createSignal(false);
  const [isRestockOpen, setIsRestockOpen] = createSignal(false);
  const [activeMaterial, setActiveMaterial] = createSignal<RawMaterialLibrary | null>(null);

  // Add Material State
  const [formName, setFormName] = createSignal("");
  const [formUnit, setFormUnit] = createSignal("gram");
  const [formCost, setFormCost] = createSignal<number | "">("");
  const [showCustomUnit, setShowCustomUnit] = createSignal(false);
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [isSaving, setIsSaving] = createSignal(false);

  // Restock State
  const [purchaseQty, setPurchaseQty] = createSignal<number>(1);
  const [purchaseUnit, setPurchaseUnit] = createSignal("KG");
  const [customMultiplier, setCustomMultiplier] = createSignal<number>(1000);
  const [purchasePrice, setPurchasePrice] = createSignal<number | "">("");
  const [isRestocking, setIsRestocking] = createSignal(false);

  const COMMON_UNITS = ["gram", "ml", "pcs", "kg", "liter", "box"];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const handlePurchaseUnitChange = (val: string) => {
    setPurchaseUnit(val);
    const pUnit = val.toLowerCase();
    const bUnit = activeMaterial()?.unit.toLowerCase() || "";
    
    if ((pUnit === "kg") && (bUnit === "gram" || bUnit === "gr" || bUnit === "g")) setCustomMultiplier(1000);
    else if ((pUnit === "liter" || pUnit === "l") && bUnit === "ml") setCustomMultiplier(1000);
    else if (pUnit === "lusin" && bUnit === "pcs") setCustomMultiplier(12);
    else if (pUnit === bUnit) setCustomMultiplier(1);
  };

  const openAdd = () => {
    setEditingId(null);
    setFormName("");
    setFormUnit("gram");
    setFormCost("");
    setShowCustomUnit(false);
    setIsAddOpen(true);
  };

  const openEdit = (mat: RawMaterialLibrary) => {
    setEditingId(mat.id);
    setFormName(mat.name);
    setFormUnit(mat.unit);
    setFormCost(mat.costPerUnit);
    setShowCustomUnit(!COMMON_UNITS.includes(mat.unit));
    setIsAddOpen(true);
  };

  const handleAddSave = async (e: Event) => {
    e.preventDefault();
    if (isSaving()) return;
    setIsSaving(true);
    try {
      const id = editingId() || `mat_${Date.now()}`;
      await db.rawMaterialLibrary.put({
        id,
        name: formName().trim(),
        unit: formUnit().trim(),
        stock: editingId() ? (materials()?.find(m => m.id === id)?.stock || 0) : 0,
        costPerUnit: Number(formCost()) || 0,
        isActive: editingId() ? (materials()?.find(m => m.id === id)?.isActive ?? true) : true,
      });
      setIsAddOpen(false);
      refetch();
      toast.success(editingId() ? "Bahan diperbarui" : "Bahan berhasil ditambahkan");
    } finally {
      setIsSaving(false);
    }
  };

  const openRestock = (mat: RawMaterialLibrary) => {
    setActiveMaterial(mat);
    setPurchaseQty(1);
    
    let pUnit = "Unit";
    let mult = 1;
    const bUnit = mat.unit.toLowerCase();
    if (bUnit === "gram" || bUnit === "gr" || bUnit === "g") { pUnit = "KG"; mult = 1000; }
    else if (bUnit === "ml") { pUnit = "Liter"; mult = 1000; }
    else if (bUnit === "pcs") { pUnit = "Lusin"; mult = 12; }
    else { pUnit = mat.unit; mult = 1; }
    
    setPurchaseUnit(pUnit);
    setCustomMultiplier(mult);
    setPurchasePrice("");
    setIsRestockOpen(true);
  };

  const handleRestockSave = async (e: Event) => {
    e.preventDefault();
    if (isRestocking() || !activeMaterial() || purchasePrice() === "") return;
    
    setIsRestocking(true);
    try {
      const mat = activeMaterial()!;
      const addedQty = purchaseQty() * customMultiplier();
      const addedTotalCost = Number(purchasePrice());
      
      const newStock = mat.stock + addedQty;
      const oldTotalValue = mat.stock * mat.costPerUnit;
      const newTotalValue = oldTotalValue + addedTotalCost;
      const newAverageCost = newStock > 0 ? (newTotalValue / newStock) : 0;

      await db.transaction('rw', db.rawMaterialLibrary, db.inventoryLogs, db.expenses, async () => {
        await db.rawMaterialLibrary.update(mat.id, {
          stock: newStock,
          costPerUnit: newAverageCost,
        });

        const timestamp = Date.now();
        await db.inventoryLogs.add({
          id: `log_in_${timestamp}`,
          materialId: mat.id,
          type: "IN",
          quantity: addedQty,
          unitCost: addedTotalCost / addedQty,
          notes: `Restok: ${purchaseQty()} ${purchaseUnit()}`,
          timestamp,
        });

        await db.expenses.add({
           id: `exp_mat_${timestamp}`,
           amount: addedTotalCost,
           category: "bahan_baku",
           description: `Beli Bahan: ${mat.name}`,
           timestamp,
           isBackdated: false,
        });
      });

      toast.success("HPP & Stok berhasil diupdate");
      setIsRestockOpen(false);
      refetch();
    } catch (err: any) {
      toast.error("Gagal: " + err.message);
    } finally {
      setIsRestocking(false);
    }
  };

  return (
    <div class="flex flex-col min-h-screen bg-muted/10 pb-24 font-jakarta text-left">
      {/* Header — 100% Match with products.tsx */}
      <div class="flex items-center justify-between px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
        <div class="flex items-center gap-3">
          <A
            href="/app/inventory"
            class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
          >
            <ArrowLeft size={18} />
          </A>
          <div>
            <h1 class="font-bold text-lg tracking-tight leading-none text-foreground">Bahan Baku</h1>
            <span class="text-xs font-semibold text-muted-foreground mt-0.5 block">
              Manajemen Stok & HPP
            </span>
          </div>
        </div>
        <Button
          onClick={openAdd}
          class="h-10 px-4 rounded-full font-bold text-sm shadow-sm active:scale-95 transition-all text-white"
        >
          <Plus size={15} class="mr-1.5" stroke-width={2.5} /> Tambah
        </Button>
      </div>

      {/* Main List — Match product list structure */}
      <div class="flex flex-col gap-2.5 p-4">
        <Show
          when={materials() && materials()!.length > 0}
          fallback={
            <div class="flex flex-col items-center py-20 text-muted-foreground gap-4">
              <Box size={48} stroke-width={1.5} class="opacity-40" />
              <div class="text-center">
                <p class="font-bold text-sm">Belum ada bahan baku</p>
                <p class="text-xs mt-1">Tambahkan bahan baku untuk resep produk.</p>
              </div>
            </div>
          }
        >
          <For each={materials()}>
            {(mat) => (
              <div 
                role="button"
                tabIndex={0}
                onClick={() => openEdit(mat)}
                class={`flex items-center w-full text-left gap-3 bg-card px-3.5 py-3 rounded-2xl border transition-all shadow-sm cursor-pointer active:scale-[0.99] hover:border-primary/30 ${
                  !mat.isActive ? 'opacity-60 grayscale border-slate-200' : 'border-border/60'
                }`}
              >
                <div class="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/50 flex items-center justify-center text-slate-400">
                  <Box size={22} />
                </div>
                
                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-sm leading-tight truncate text-foreground">
                    {mat.name}
                  </h3>
                  <div class="flex items-center gap-2 mt-1 flex-wrap">
                    <span class={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                      mat.isActive ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                    }`}>
                      {mat.stock.toLocaleString('id-ID')} {mat.unit}
                    </span>
                    <span class="text-[10px] font-bold text-muted-foreground">
                      HPP: {formatCurrency(mat.costPerUnit)}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 ml-auto">
                    <button 
                      onClick={() => toggleActive(mat)}
                      class={`h-8 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                        mat.isActive ? 'bg-white border-slate-200 text-slate-400' : 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      }`}
                    >
                      {mat.isActive ? 'Aktif' : 'Off'}
                    </button>
                    <Button
                      onClick={() => openRestock(mat)}
                      variant="ghost"
                      class="h-9 w-9 p-0 rounded-full text-primary bg-primary/5 hover:bg-primary/10 active:scale-90 transition-all shrink-0"
                    >
                      <ArrowDownCircle size={18} />
                    </Button>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      <Sheet open={isAddOpen()} onOpenChange={setIsAddOpen}>
        <SheetContent position="bottom" class="h-auto max-h-[92vh] rounded-t-[32px] flex flex-col p-0 border-none shadow-[0_-20px_60px_rgba(0,0,0,0.15)] overflow-hidden font-jakarta pb-safe">
          <SheetHeader class="px-5 pt-6 pb-4 border-b border-border/50 shrink-0">
            <SheetTitle class="font-black text-xl tracking-tight text-left text-foreground">
              {editingId() ? "Edit Bahan Baku" : "Tambah Bahan Baku"}
            </SheetTitle>
          </SheetHeader>

          <form id="add-material-form" onSubmit={handleAddSave} class="flex-1 overflow-y-auto p-5 flex flex-col gap-5 bg-background text-left">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Nama Bahan</label>
              <input
                required
                type="text"
                class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-medium text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
                value={formName()}
                onInput={(e) => setFormName((e.target as HTMLInputElement).value)}
                placeholder="Misal: Biji Kopi Arabica"
              />
            </div>

            <div class="flex flex-col gap-3">
              <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Satuan Dasar</label>
              <div class="flex flex-wrap gap-2 px-1">
                <For each={COMMON_UNITS}>
                  {(unit) => (
                    <button
                      type="button"
                      onClick={() => { setFormUnit(unit); setShowCustomUnit(false); }}
                      class={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                        formUnit() === unit && !showCustomUnit()
                        ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                        : "bg-muted/30 border-border/40 text-muted-foreground hover:border-border/60"
                      }`}
                    >
                      {unit}
                    </button>
                  )}
                </For>
                <button
                  type="button"
                  onClick={() => setShowCustomUnit(true)}
                  class={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                    showCustomUnit()
                    ? "bg-secondary border-secondary text-white shadow-md shadow-secondary/20"
                    : "bg-muted/30 border-border/40 text-muted-foreground"
                  }`}
                >
                  Kustom...
                </button>
              </div>

              <Show when={showCustomUnit()}>
                <input
                  required
                  type="text"
                  class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-4 font-bold text-sm focus:outline-none focus:border-primary/60 transition-all text-foreground mt-1"
                  value={formUnit()}
                  onInput={(e) => setFormUnit(e.currentTarget.value)}
                  placeholder="Ketik satuan..."
                />
              </Show>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Harga Satuan Standar (Rp)</label>
              <div class="relative">
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground/50">Rp</span>
                <input
                  required
                  type="number"
                  class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 pl-10 pr-4 font-bold text-base focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
                  value={formCost()}
                  onInput={(e) => setFormCost(Number(e.currentTarget.value))}
                  placeholder="Harga per satuan"
                />
              </div>
              <p class="text-[9px] font-bold text-muted-foreground mt-1 px-1">Harga per {formUnit() || 'satuan'} ini akan digunakan sebagai dasar kalkulasi HPP Produk.</p>
            </div>
          </form>

          <div class="px-5 pb-8 pt-4 border-t border-border/50 bg-background shrink-0">
            <Button type="submit" form="add-material-form" disabled={isSaving()} class="w-full h-12 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all gap-2 text-white">
              <Zap size={16} class="fill-current" />
              {isSaving() ? "Menyimpan..." : "Simpan Bahan Baku"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isRestockOpen()} onOpenChange={setIsRestockOpen}>
        <SheetContent position="bottom" class="h-auto max-h-[92vh] rounded-t-[32px] flex flex-col p-0 border-none shadow-[0_-20px_60px_rgba(0,0,0,0.15)] overflow-hidden font-jakarta pb-safe">
          <SheetHeader class="px-5 pt-6 pb-4 border-b border-border/50 shrink-0">
            <SheetTitle class="font-black text-xl tracking-tight text-left text-foreground">
              Restok Bahan
            </SheetTitle>
            <p class="text-xs font-bold text-primary uppercase tracking-widest mt-1 text-left">{activeMaterial()?.name}</p>
          </SheetHeader>

          <form id="restock-form" onSubmit={handleRestockSave} class="flex-1 overflow-y-auto p-5 flex flex-col gap-6 bg-background text-foreground text-left">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Jumlah</label>
                <input
                  required
                  type="number"
                  step="any"
                  class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-bold text-lg focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 text-center transition-all"
                  value={purchaseQty() || ""}
                  onInput={(e) => setPurchaseQty(parseFloat((e.target as HTMLInputElement).value))}
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Satuan Beli</label>
                <input
                  required
                  type="text"
                  class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-bold text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 text-center transition-all uppercase"
                  value={purchaseUnit()}
                  onInput={(e) => handlePurchaseUnitChange(e.currentTarget.value)}
                  placeholder="KG/Pcs"
                />
              </div>
            </div>

            <div class="bg-muted/20 rounded-2xl p-4 border border-border/40 flex flex-col gap-3 shadow-inner">
              <div class="flex items-center justify-between opacity-60">
                <span class="text-[10px] font-black uppercase tracking-[0.2em]">Konversi</span>
                <Scale size={14} />
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-muted-foreground">1 {purchaseUnit()} =</span>
                <input 
                  type="number"
                  required
                  class="flex-1 h-10 rounded-xl border border-primary/20 bg-background px-3 font-bold text-base text-primary text-center focus:outline-none focus:border-primary"
                  value={customMultiplier() || ""}
                  onInput={e => setCustomMultiplier(Number(e.currentTarget.value))}
                />
                <span class="text-xs font-bold text-primary uppercase w-14 truncate">{activeMaterial()?.unit}</span>
              </div>
              <div class="h-9 flex items-center justify-center bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                  Total Masuk: {(purchaseQty() * customMultiplier() || 0).toLocaleString('id')} {activeMaterial()?.unit}
                </p>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 text-center">Total Biaya Pembelian (Rp)</label>
              <div class="relative">
                 <input
                    required
                    type="number"
                    class="h-16 w-full rounded-2xl border border-emerald-100 bg-emerald-50/30 px-5 font-black text-2xl text-emerald-600 focus:outline-none focus:border-emerald-500 transition-all text-center placeholder:text-emerald-600/20 shadow-inner"
                    value={purchasePrice() || ""}
                    onInput={(e) => setPurchasePrice(parseInt((e.target as HTMLInputElement).value))}
                    placeholder="Rp 0"
                  />
              </div>
            </div>
          </form>

          <div class="px-5 pb-8 pt-4 border-t border-border/50 bg-background shrink-0">
            <Button type="submit" form="restock-form" disabled={isRestocking()} class="w-full h-12 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 text-white">
              <Zap size={16} class="fill-current" />
              {isRestocking() ? "MEMPROSES..." : "KONFIRMASI RESTOK"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
