import { createSignal, createResource, Show, For } from "solid-js";
import { ArrowLeft, Plus, Settings2, Trash2, CheckCircle2, XCircle, Zap } from "lucide-solid";
import { A, useNavigate } from "@solidjs/router";
import { db, type VariantTemplate, type VariantOption } from "~/db/db";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { toast } from "solid-toast";

export default function Variations() {
  const navigate = useNavigate();
  const [variations, { refetch }] = createResource(async () =>
    await db.variantTemplates.toArray()
  );

  const [isOpen, setIsOpen] = createSignal(false);
  const [editingId, setEditingId] = createSignal<string | null>(null);
  
  // Form State
  const [name, setName] = createSignal("");
  const [type, setType] = createSignal<'SINGLE' | 'MULTIPLE'>("SINGLE");
  const [isRequired, setIsRequired] = createSignal(false);
  const [options, setOptions] = createSignal<VariantOption[]>([
    { name: "Normal", priceModifier: 0, cogsModifier: 0 }
  ]);

  const openAdd = () => {
    setEditingId(null);
    setName("");
    setType("SINGLE");
    setIsRequired(false);
    setOptions([{ name: "", priceModifier: 0, cogsModifier: 0 }]);
    setIsOpen(true);
  };

  const openEdit = (v: VariantTemplate) => {
    setEditingId(v.id);
    setName(v.name);
    setType(v.type);
    setIsRequired(v.isRequired);
    setOptions([...v.options]);
    setIsOpen(true);
  };

  const addOption = () => {
    setOptions([...options(), { name: "", priceModifier: 0, cogsModifier: 0 }]);
  };

  const updateOption = (idx: number, field: keyof VariantOption, val: any) => {
    const newOptions = [...options()];
    newOptions[idx] = { ...newOptions[idx], [field]: val };
    setOptions(newOptions);
  };

  const removeOption = (idx: number) => {
    if (options().length <= 1) return;
    setOptions(options().filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const id = editingId() || `var_${Date.now()}`;
    
    try {
      await db.variantTemplates.put({
        id,
        name: name(),
        type: type(),
        isRequired: isRequired(),
        options: options().filter(o => o.name.trim() !== ""),
        isActive: true,
      });
      
      toast.success(editingId() ? "Variasi diperbarui" : "Variasi ditambahkan");
      setIsOpen(false);
      refetch();
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    }
  };

  const toggleStatus = async (v: VariantTemplate) => {
    try {
      await db.variantTemplates.update(v.id, { isActive: !v.isActive });
      refetch();
      toast.success(`${v.name} ${!v.isActive ? "Aktif" : "Nonaktif"}`);
    } catch (err: any) {
      toast.error("Gagal mengubah status");
    }
  };

  return (
    <div class="flex flex-col min-h-screen bg-muted/10 pb-24 font-jakarta text-left text-foreground">
      {/* Header — 100% Match with products.tsx */}
      <div class="flex items-center justify-between px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
        <div class="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 class="font-bold text-lg tracking-tight leading-none">Pustaka Variasi</h1>
            <span class="text-xs font-semibold text-muted-foreground mt-0.5 block">
              Grup & Opsi Variasi Global
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

      {/* Variation List — Match product list structure */}
      <div class="flex flex-col gap-2.5 p-4">
        <Show
          when={variations() && variations()!.length > 0}
          fallback={
            <div class="flex flex-col items-center py-20 text-muted-foreground gap-4">
              <Settings2 size={48} stroke-width={1.5} class="opacity-40" />
              <div class="text-center">
                <p class="font-bold text-sm">Belum ada variasi</p>
                <p class="text-xs mt-1">Buat grup variasi global untuk produk Anda.</p>
              </div>
            </div>
          }
        >
          <For each={variations()}>
            {(v) => (
              <div
                role="button"
                tabIndex={0}
                onClick={() => openEdit(v)}
                class="flex items-center w-full text-left gap-3 bg-card px-3.5 py-3 rounded-2xl border border-border/60 shadow-sm cursor-pointer hover:border-primary/30 transition-all active:scale-[0.99] group"
              >
                <div class="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/50 flex items-center justify-center text-slate-400">
                  <Settings2 size={22} />
                </div>
                
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="font-bold text-sm leading-tight truncate text-foreground">{v.name}</h3>
                    <Show when={!v.isActive}>
                      <span class="text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white px-1.5 py-0.5 rounded leading-none shrink-0 border border-slate-900 shadow-sm">Off</span>
                    </Show>
                  </div>
                  <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1.5 flex items-center gap-1.5">
                    {v.options.length} Opsi • {v.type === 'SINGLE' ? 'Pilih Satu' : 'Pilih Banyak'} {v.isRequired ? '• Wajib' : ''}
                  </p>
                  
                  <div class="flex flex-wrap gap-1 mt-2">
                    <For each={v.options.slice(0, 3)}>
                      {(opt) => (
                        <span class="text-[9px] font-bold bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded border border-border/40">
                          {opt.name}
                        </span>
                      )}
                    </For>
                    <Show when={v.options.length > 3}>
                      <span class="text-[9px] font-bold text-muted-foreground/40 px-1">+{v.options.length - 3}</span>
                    </Show>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 ml-auto">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleStatus(v); }}
                      class={`h-8 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                        v.isActive ? 'bg-white border-slate-200 text-slate-400' : 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      }`}
                    >
                      {v.isActive ? 'Aktif' : 'Off'}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 rounded-full hover:bg-red-50 shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                      onClick={(e) => { e.stopPropagation(); if(confirm('Hapus grup variasi ini?')) db.variantTemplates.delete(v.id).then(refetch); }}
                    >
                      <Trash2 size={13} />
                    </Button>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Edit/Add Variasi Sheet — Sync with products.tsx style */}
      <Sheet open={isOpen()} onOpenChange={setIsOpen}>
        <SheetContent position="bottom" hideClose={true} class="h-auto max-h-[92vh] rounded-t-[32px] flex flex-col p-0 border-none shadow-[0_-20px_60px_rgba(0,0,0,0.15)] overflow-hidden font-jakarta pb-safe">
          <SheetHeader class="px-5 pt-6 pb-4 border-b border-border/50 shrink-0">
            <SheetTitle class="font-black text-xl tracking-tight text-left text-foreground">
              {editingId() ? "Edit Variasi" : "Tambah Variasi"}
            </SheetTitle>
          </SheetHeader>

          <form id="variation-form" onSubmit={handleSubmit} class="flex-1 overflow-y-auto p-5 flex flex-col gap-6 bg-background text-left">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Nama Grup Variasi</label>
              <input 
                required 
                type="text" 
                class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-medium text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all text-foreground" 
                value={name()} 
                onInput={e => setName(e.currentTarget.value)} 
                placeholder="e.g. Level Pedas / Topping" 
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Aturan Pilih</label>
                <select 
                  class="h-12 rounded-xl bg-muted/30 border border-border/70 px-4 font-bold text-xs focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all text-foreground" 
                  value={type()} 
                  onChange={e => setType(e.currentTarget.value as any)}
                >
                  <option value="SINGLE">Satu Pilihan Saja</option>
                  <option value="MULTIPLE">Bisa Banyak Pilihan</option>
                </select>
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Sifat Variasi</label>
                <button
                  type="button"
                  onClick={() => setIsRequired(!isRequired())}
                  class={`flex items-center justify-center h-12 gap-3 px-4 border border-border/70 rounded-xl transition-all ${
                    isRequired() 
                    ? 'bg-primary/5 border-primary/40 text-primary' 
                    : 'bg-muted/10 border-border/40 text-muted-foreground'
                  }`}
                >
                  <div class={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isRequired() ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30 bg-background'}`}>
                    <Show when={isRequired()}><CheckCircle2 size={12} fill="currentColor" class="text-white" /></Show>
                  </div>
                  <span class="text-[10px] font-bold uppercase tracking-widest">Wajib Pilih</span>
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-4">
               <div class="flex items-center justify-between px-1">
                  <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Opsi Variasi</label>
                  <button type="button" onClick={addOption} class="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 hover:bg-primary/20 transition-all items-center flex gap-1.5">
                    <Plus size={14} stroke-width={3} /> Tambah Opsi
                  </button>
               </div>
               
               <div class="flex flex-col gap-2.5">
                 <For each={options()}>
                   {(opt, idx) => (
                     <div class="flex items-center gap-2 group p-2 bg-muted/10 border border-border/40 rounded-2xl transition-all hover:border-primary/30">
                       <input 
                        required 
                        type="text" 
                        class="h-10 flex-1 rounded-xl bg-background border border-border/70 px-3.5 font-bold text-xs focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 text-foreground shadow-sm" 
                        value={opt.name} 
                        onInput={e => updateOption(idx(), 'name', e.currentTarget.value)} 
                        placeholder="e.g. Normal" 
                       />
                       <div class="relative w-32">
                         <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-muted-foreground/30">Rp</span>
                         <input 
                          type="number" 
                          class="h-10 w-full rounded-xl bg-background border border-border/70 pl-7 pr-3 font-bold text-xs focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 text-foreground shadow-sm text-center" 
                          value={opt.priceModifier} 
                          onInput={e => updateOption(idx(), 'priceModifier', parseInt(e.currentTarget.value) || 0)} 
                         />
                       </div>
                       <button 
                        type="button" 
                        onClick={() => removeOption(idx())} 
                        class="h-10 w-10 flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                       >
                        <XCircle size={16} />
                       </button>
                     </div>
                   )}
                 </For>
               </div>
            </div>
          </form>
 
          <div class="px-5 pb-8 pt-4 border-t border-border/50 bg-background shrink-0 text-left flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              class="flex-1 h-12 rounded-full font-bold text-sm border-border/60 hover:bg-muted active:scale-95 transition-all text-muted-foreground"
            >
              Batal
            </Button>
            <Button type="submit" form="variation-form" class="flex-[2] h-12 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all gap-2 text-white">
              <Zap size={16} class="fill-current" />
              SIMPAN VARIASI
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
