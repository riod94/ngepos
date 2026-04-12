import { createSignal, createResource, Show, For } from "solid-js";
import { ArrowLeft, Plus, Trash2, Tag, Zap } from "lucide-solid";
import { A, useNavigate } from "@solidjs/router";
import { db, type Category } from "~/db/db";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { ConfirmDialog } from "~/components/ConfirmDialog";

const CAT_ICONS = [
  "🏪", "📦", "☕", "🍵", "🥤", "🧋", "🍺", "🍷", "🍹", "🥛", 
  "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🍳",
  "🍜", "🍝", "🍱", "🍣", "🍛", "🍲", "🥘", "🍚",
  "🍰", "🧁", "🍩", "🍪", "🍦", "🍞", "🥐", "🥓"
];

export default function Categories() {
  const navigate = useNavigate();
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
    <div class="flex flex-col min-h-screen bg-muted/10 pb-24 font-jakarta text-left">
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
            <h1 class="font-bold text-lg tracking-tight leading-none text-foreground">Kategori</h1>
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

      {/* Edit/Add Sheet — 100% Match with products.tsx style */}
      <Sheet open={isOpen()} onOpenChange={setIsOpen}>
        <SheetContent position="bottom" class="h-auto max-h-[92vh] rounded-t-[32px] flex flex-col p-0 border-none shadow-[0_-20px_60px_rgba(0,0,0,0.15)] overflow-hidden font-jakarta pb-safe">
          <SheetHeader class="px-5 pt-6 pb-4 border-b border-border/50 shrink-0">
            <SheetTitle class="font-black text-xl tracking-tight text-left">
              {isEditing() ? "Edit Kategori" : "Tambah Kategori"}
            </SheetTitle>
          </SheetHeader>

          <form id="category-form" onSubmit={handleSave} class="flex-1 overflow-y-auto p-5 flex flex-col gap-5 text-left bg-background">
            <div class="flex flex-col gap-1.5">
              <label for="cat-name" class="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
                Nama Kategori
              </label>
              <input
                id="cat-name"
                required
                type="text"
                class="h-12 w-full rounded-xl border border-border/70 bg-muted/30 px-3.5 font-medium text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
                value={formName()}
                onInput={(e) => setFormName((e.target as HTMLInputElement).value)}
                placeholder="Misal: Minuman Dingin"
              />
            </div>

            <div class="flex flex-col gap-3">
               <div class="flex items-center justify-between px-1">
                  <label class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pilih Icon</label>
                  <span class="text-primary font-bold text-xs bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                    Visual: {formIcon()}
                  </span>
               </div>
               <div class="grid grid-cols-7 gap-2 max-h-[160px] overflow-y-auto p-3 bg-muted/20 border border-border/40 rounded-2xl shadow-inner">
                <For each={CAT_ICONS}>
                  {(icon) => (
                    <button
                      type="button"
                      onClick={() => setFormIcon(icon)}
                      class={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all border-2 ${
                        formIcon() === icon 
                        ? "bg-primary border-primary shadow-lg shadow-primary/20 scale-105 z-10" 
                        : "bg-background border-transparent hover:border-border/60"
                      }`}
                    >
                      {icon}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </form>
          
          <div class="px-5 pb-8 pt-4 border-t border-border/50 bg-background shrink-0">
            <Button
              type="submit"
              form="category-form"
              disabled={isSaving()}
              class="w-full h-12 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all gap-2"
            >
              <Zap size={16} class="fill-current" />
              {isSaving() ? "Menyimpan..." : isEditing() ? "Perbarui Kategori" : "Simpan Kategori"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs for Critical Actions */}
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

      {/* Category List — Match product list structure */}
      <div class="flex flex-col gap-2.5 p-4">
        <Show
          when={categories() && categories()!.length > 0}
          fallback={
            <div class="flex flex-col items-center py-20 text-muted-foreground gap-4">
                <div class="w-14 h-14 rounded-full bg-muted flex items-center justify-center border border-border/50">
                   <Tag size={22} class="opacity-40" />
                </div>
                <div class="text-center">
                   <p class="font-bold text-sm">Belum ada kategori</p>
                   <p class="text-xs mt-1">Tambahkan kategori untuk produk Anda.</p>
                </div>
            </div>
          }
        >
          <For each={categories()}>
            {(cat) => (
              <div
                role="button"
                tabIndex={0}
                onClick={() => openEdit(cat)}
                class="flex items-center w-full text-left gap-3 bg-card px-3.5 py-3 rounded-2xl border border-border/60 shadow-sm cursor-pointer hover:border-primary/30 transition-all active:scale-[0.99] group"
              >
                <div class="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/50 flex items-center justify-center text-2xl">
                  {cat.icon ?? "📦"}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-sm leading-tight truncate text-foreground">{cat.name}</h3>
                  <p class="text-xs font-medium text-muted-foreground mt-0.5">Urutan #{cat.orderIndex + 1}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 rounded-full hover:bg-red-50 shrink-0 text-muted-foreground hover:text-red-500 transition-colors ml-auto"
                  onClick={(e) => { e.stopPropagation(); requestDelete(cat, e); }}
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
