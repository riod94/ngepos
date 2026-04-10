import { createSignal, createResource, Show, For } from "solid-js";
import { ArrowLeft, Plus, Trash2, Tag } from "lucide-solid";
import { A } from "@solidjs/router";
import { db, type Category } from "~/db/db";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { ConfirmDialog } from "~/components/ConfirmDialog";

const CAT_ICONS = [
  "🏪", "📦", "☕", "🍵", "🥤", "🧋", "🍺", "🍷", "🍹", "🥛", 
  "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🍳",
  "🍜", "🍝", "🍱", "🍣", "🍛", "🍲", "🥘", "🍚",
  "🍰", "🧁", "🍩", "🍪", "🍦", "🍞", "🥐", "🥓"
];

export default function Categories() {
  const [categories, { refetch }] = createResource(async () =>
    await db.categories.orderBy("orderIndex").toArray()
  );

  const [isOpen, setIsOpen] = createSignal(false);
  const [isEditing, setIsEditing] = createSignal(false);
  const [formId, setFormId] = createSignal("");
  const [formName, setFormName] = createSignal("");
  const [formIcon, setFormIcon] = createSignal(CAT_ICONS[1]);
  const [isSaving, setIsSaving] = createSignal(false);

  // Confirm delete state
  const [deleteTarget, setDeleteTarget] = createSignal<Category | null>(null);
  const [deleteError, setDeleteError] = createSignal<string | null>(null);
  const [isDeleting, setIsDeleting] = createSignal(false);

  const openAdd = () => {
    setIsEditing(false);
    setFormId(`cat_${Date.now()}`);
    setFormName("");
    setFormIcon(CAT_ICONS[1]);
    setIsOpen(true);
  };

  const openEdit = (cat: Category) => {
    setIsEditing(true);
    setFormId(cat.id);
    setFormName(cat.name);
    setFormIcon(cat.icon ?? "☕");
    setIsOpen(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (isSaving()) return;
    setIsSaving(true);
    try {
      const count = await db.categories.count();
      if (isEditing()) {
        await db.categories.update(formId(), { name: formName(), icon: formIcon() });
      } else {
        await db.categories.add({ id: formId(), name: formName(), orderIndex: count, icon: formIcon() });
      }
      setIsOpen(false);
      refetch();
    } finally {
      setIsSaving(false);
    }
  };

  const requestDelete = async (cat: Category, e: Event) => {
    e.stopPropagation();
    const productsInCat = await db.products.where("category").equals(cat.name).count();
    if (productsInCat > 0) {
      setDeleteError(`Tidak bisa menghapus — ada ${productsInCat} produk di kategori ini. Pindahkan produk terlebih dahulu.`);
      return;
    }
    setDeleteTarget(cat);
  };

  const handleDelete = async () => {
    const cat = deleteTarget();
    if (!cat) return;
    setIsDeleting(true);
    try {
      await db.categories.delete(cat.id);
      refetch();
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div class="flex flex-col min-h-screen bg-muted/10 pb-24">
      {/* Header */}
      <div class="flex items-center justify-between px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
        <div class="flex items-center gap-3">
          <A
            href="/app/inventory"
            class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
          >
            <ArrowLeft size={18} />
          </A>
          <div>
            <h1 class="font-bold text-lg tracking-tight leading-none">Kategori</h1>
            <span class="text-xs font-semibold text-muted-foreground mt-0.5 block">
              Manajemen Kategori Produk
            </span>
          </div>
        </div>
        <Button
          onClick={openAdd}
          class="h-10 px-4 rounded-full font-bold text-sm shadow-sm active:scale-95 transition-all"
        >
          <Plus size={15} class="mr-1.5" stroke-width={2.5} /> Tambah
        </Button>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={isOpen()} onOpenChange={setIsOpen}>
        <DialogContent class="w-[90vw] max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle class="text-lg font-bold tracking-tight">
              {isEditing() ? "Edit Kategori" : "Kategori Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} class="flex flex-col gap-6 mt-4">
            <div class="flex flex-col gap-2">
              <label for="cat-name" class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">
                Nama Kategori
              </label>
              <input
                id="cat-name"
                required
                type="text"
                class="h-14 w-full rounded-2xl border-2 border-border/80 bg-muted/20 px-5 font-black text-base focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                value={formName()}
                onInput={(e) => setFormName((e.target as HTMLInputElement).value)}
                placeholder="Misal: Minuman Dingin"
              />
            </div>

            <div class="flex flex-col gap-3">
              <label class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center justify-between">
                Pilih Icon
                <span class="text-primary font-black text-[14px] bg-primary/10 w-8 h-8 rounded-lg flex items-center justify-center">
                  {formIcon()}
                </span>
              </label>
              <div class="grid grid-cols-8 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                <For each={CAT_ICONS}>
                  {(icon) => (
                    <button
                      type="button"
                      onClick={() => setFormIcon(icon)}
                      class={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all border-2 ${
                        formIcon() === icon 
                        ? "bg-primary border-primary shadow-md shadow-primary/20 scale-110 z-10" 
                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                      }`}
                    >
                      {icon}
                    </button>
                  )}
                </For>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isSaving()}
              class="w-full h-12 rounded-xl font-bold text-sm mt-1"
            >
              {isSaving() ? "Menyimpan..." : isEditing() ? "Perbarui" : "Simpan Kategori"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={deleteTarget() !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Kategori?"
        description={`Kategori "${deleteTarget()?.name}" akan dihapus permanen.`}
        confirmLabel="Ya, Hapus"
        variant="danger"
        loading={isDeleting()}
        onConfirm={handleDelete}
      />

      {/* Error Dialog — kategori masih punya produk */}
      <ConfirmDialog
        open={deleteError() !== null}
        onOpenChange={(v) => !v && setDeleteError(null)}
        title="Tidak Bisa Dihapus"
        description={deleteError() ?? ""}
        confirmLabel="OK"
        cancelLabel=""
        variant="warning"
        onConfirm={() => setDeleteError(null)}
      />

      {/* List */}
      <div class="p-4 flex flex-col gap-2.5">
        <Show
          when={categories() && categories()!.length > 0}
          fallback={
            <div class="flex flex-col items-center py-20 text-muted-foreground gap-4">
              <div class="w-14 h-14 rounded-full bg-muted flex items-center justify-center border border-border/50">
                <Tag size={22} class="opacity-40" />
              </div>
              <div class="text-center">
                <p class="font-bold text-sm">Belum ada kategori</p>
                <p class="text-xs mt-1 text-muted-foreground">Tambahkan kategori untuk mengorganisir produk.</p>
              </div>
            </div>
          }
        >
          <For each={categories()}>
            {(cat) => (
              <div
                class="flex items-center gap-3 bg-card px-4 py-3 rounded-2xl border border-border/60 shadow-sm cursor-pointer hover:border-primary/30 transition-all active:scale-[0.99] group"
                role="button"
                tabIndex={0}
                onClick={() => openEdit(cat)}
                onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(cat); } }}
              >
                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xl overflow-hidden">
                  {cat.icon ?? "📦"}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-sm tracking-tight truncate">{cat.name}</h3>
                  <p class="text-xs text-muted-foreground mt-0.5">Urutan #{cat.orderIndex + 1}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 rounded-full hover:bg-red-50 shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                  onClick={(e) => requestDelete(cat, e)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}
