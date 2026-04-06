import { createSignal, createResource, Show, For } from "solid-js";
import { ArrowLeft, Plus, Pencil, Trash2, Tag } from "lucide-solid";
import { A } from "@solidjs/router";
import { db, type Category } from "~/db/db";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";

export default function Categories() {
  const [categories, { refetch }] = createResource(async () =>
    await db.categories.orderBy("orderIndex").toArray()
  );

  const [isOpen, setIsOpen] = createSignal(false);
  const [isEditing, setIsEditing] = createSignal(false);
  const [formId, setFormId] = createSignal("");
  const [formName, setFormName] = createSignal("");
  const [isSaving, setIsSaving] = createSignal(false);

  const openAdd = () => {
    setIsEditing(false);
    setFormId(`cat_${Date.now()}`);
    setFormName("");
    setIsOpen(true);
  };

  const openEdit = (cat: Category) => {
    setIsEditing(true);
    setFormId(cat.id);
    setFormName(cat.name);
    setIsOpen(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (isSaving()) return;
    setIsSaving(true);
    try {
      const count = await db.categories.count();
      if (isEditing()) {
        await db.categories.update(formId(), { name: formName() });
      } else {
        await db.categories.add({ id: formId(), name: formName(), orderIndex: count });
      }
      setIsOpen(false);
      refetch();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e: Event) => {
    e.stopPropagation();
    const productsInCat = await db.products.where("category").equals(
      (await db.categories.get(id))?.name ?? ""
    ).count();

    if (productsInCat > 0) {
      alert(`Tidak bisa menghapus — ada ${productsInCat} produk di kategori ini. Pindahkan produk terlebih dahulu.`);
      return;
    }
    if (confirm("Hapus kategori ini?")) {
      await db.categories.delete(id);
      refetch();
    }
  };

  return (
    <div class="flex flex-col min-h-screen bg-muted/10 pb-24">
      {/* Header */}
      <div class="flex items-center justify-between px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
        <div class="flex items-center gap-3">
          <A href="/app/settings" class="w-10 h-10 flex items-center justify-center bg-card rounded-3xl shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95">
            <ArrowLeft size={18} />
          </A>
          <div>
            <h1 class="font-black text-xl tracking-tight leading-none">Kategori</h1>
            <span class="text-xs font-black text-muted-foreground uppercase tracking-widest mt-1 block">Manajemen Kategori Produk</span>
          </div>
        </div>
        <Button
          onClick={openAdd}
          class="h-11 px-5 rounded-full font-black text-sm uppercase tracking-wider shadow-md active:scale-95 transition-all"
        >
          <Plus size={16} class="mr-1.5" stroke-width={3} /> Tambah
        </Button>
      </div>

      {/* Dialog */}
      <Dialog open={isOpen()} onOpenChange={setIsOpen}>
        <DialogContent class="w-[90vw] max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle class="text-xl font-black tracking-tight">
              {isEditing() ? "Edit Kategori" : "Kategori Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} class="flex flex-col gap-4 mt-4">
            <div class="flex flex-col gap-2">
              <label for="cat-name" class="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Nama Kategori
              </label>
              <input
                id="cat-name"
                required
                type="text"
                class="h-14 w-full rounded-xl border-2 border-border/80 bg-card px-4 font-bold text-base focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                value={formName()}
                onInput={(e) => setFormName((e.target as HTMLInputElement).value)}
                placeholder="Contoh: Minuman Panas"
              />
            </div>
            <Button
              type="submit"
              disabled={isSaving()}
              class="w-full h-14 rounded-2xl font-black text-base mt-2"
            >
              {isSaving() ? "Menyimpan..." : isEditing() ? "Perbarui Kategori" : "Simpan Kategori"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* List */}
      <div class="p-5 flex flex-col gap-3">
        <Show
          when={categories() && categories()!.length > 0}
          fallback={
            <div class="flex flex-col items-center py-20 text-muted-foreground gap-4">
              <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border/50">
                <Tag size={24} class="opacity-40" />
              </div>
              <div class="text-center">
                <p class="font-bold text-sm">Belum ada kategori</p>
                <p class="text-sm mt-1">Tambahkan kategori untuk mengorganisir produk.</p>
              </div>
            </div>
          }
        >
          <For each={categories()}>
            {(cat) => (
              <div class="flex items-center gap-4 bg-card p-4 rounded-2xl border border-border/70 shadow-sm group hover:border-primary/30 transition-all">
                <div class="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center shadow-inner shrink-0">
                  <Tag size={20} stroke-width={2} />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-black text-base tracking-tight">{cat.name}</h3>
                  <p class="text-sm font-semibold text-muted-foreground mt-0.5">
                    Urutan ke-{cat.orderIndex + 1}
                  </p>
                </div>
                <div class="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    class="h-9 w-9 rounded-full border-border/60 shadow-sm hover:border-blue-300"
                    onClick={() => openEdit(cat)}
                  >
                    <Pencil size={14} class="text-blue-500" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    class="h-9 w-9 rounded-full border-border/60 bg-red-50 hover:bg-red-100 shadow-sm"
                    onClick={(e) => handleDelete(cat.id, e)}
                  >
                    <Trash2 size={14} class="text-red-500" />
                  </Button>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}
