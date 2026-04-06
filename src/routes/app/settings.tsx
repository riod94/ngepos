import { createSignal, createResource, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Package, Users, Database, Tags, QrCode, Upload, Check } from "lucide-solid";
import { db, getSetting, setSetting } from "~/db/db";
import { Button } from "~/components/ui/button";

// ─── QRIS Upload Section ──────────────────────────────────────────────────────

function QrisSettings() {
  const [qrisImage, { refetch }] = createResource(async () => await getSetting("qris_image"));
  const [saving, setSaving] = createSignal(false);
  const [saved, setSaved] = createSignal(false);

  const handleFile = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Hanya file gambar yang didukung."); return; }
    if (file.size > 2 * 1024 * 1024) { alert("Ukuran file maksimal 2MB."); return; }

    const reader = new FileReader();
    reader.onload = async () => {
      setSaving(true);
      try {
        await setSetting("qris_image", reader.result as string);
        refetch();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = async () => {
    if (!confirm("Hapus gambar QRIS statis? Metode pembayaran QRIS tidak akan muncul di kasir.")) return;
    await db.settings.delete("qris_image");
    refetch();
  };

  return (
    <div class="bg-card p-5 rounded-3xl border border-border/70 shadow-sm flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner shrink-0">
          <QrCode size={22} stroke-width={2} />
        </div>
        <div>
          <h3 class="font-black text-base tracking-tight">QRIS Statis</h3>
          <p class="text-sm font-semibold text-muted-foreground mt-0.5">Upload gambar QR code pembayaran Anda</p>
        </div>
      </div>

      <Show when={qrisImage()} fallback={
        <label class="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-border/60 rounded-2xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group">
          <input type="file" accept="image/*" class="hidden" onChange={handleFile} />
          <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
            <Upload size={22} class="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div class="text-center">
            <p class="font-black text-sm">Upload Gambar QRIS</p>
            <p class="text-sm text-muted-foreground font-semibold mt-0.5">PNG, JPG, max 2MB</p>
          </div>
          {saving() && <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
        </label>
      }>
        <div class="flex flex-col gap-3">
          <div class="relative w-full aspect-square max-h-52 bg-muted rounded-2xl overflow-hidden border border-border/60">
            <img src={qrisImage()!} alt="QRIS" class="w-full h-full object-contain p-3" />
            <Show when={saved()}>
              <div class="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                <div class="bg-emerald-500 text-white rounded-full w-10 h-10 flex items-center justify-center">
                  <Check size={24} />
                </div>
              </div>
            </Show>
          </div>
          <div class="flex gap-2">
            <label class="flex-1">
              <input type="file" accept="image/*" class="hidden" onChange={handleFile} />
              <div class="w-full h-11 rounded-xl border border-border/70 bg-muted/30 flex items-center justify-center gap-2 font-black text-sm cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload size={15} /> Ganti Gambar
              </div>
            </label>
            <Button variant="outline" class="flex-1 h-11 rounded-xl font-black text-sm text-red-500 border-red-200 hover:bg-red-50" onClick={handleRemove}>
              Hapus QRIS
            </Button>
          </div>
          <p class="text-xs font-bold text-emerald-600 flex items-center gap-1">
            <Check size={13} /> QRIS aktif — metode QRIS tersedia di kasir
          </p>
        </div>
      </Show>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MenuItem {
  href: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
  badge?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { href: "/app/products",  icon: Package,   iconBg: "bg-blue-100",    iconColor: "text-blue-600",    title: "Katalog Produk",      subtitle: "Atur menu, stok, HPP & varian" },
  { href: "/app/categories",icon: Tags,      iconBg: "bg-violet-100",  iconColor: "text-violet-600",  title: "Manajemen Kategori",  subtitle: "Tambah & atur kategori produk" },
  { href: "#", icon: Users, iconBg: "bg-orange-100", iconColor: "text-orange-600", title: "Manajemen Staf",    subtitle: "Kelola akses dan peran kasir", disabled: true, badge: "Segera Hadir" },
  { href: "#", icon: Database, iconBg: "bg-teal-100", iconColor: "text-teal-600",  title: "Sinkronisasi Cloud", subtitle: "Backup & sync data ke server",  disabled: true, badge: "Segera Hadir" },
];

export default function SettingsPage() {
  return (
    <div class="flex flex-col min-h-screen bg-muted/10 pb-24">
      <div class="px-5 pt-6 pb-5 border-b border-border/40 bg-background sticky top-0 z-10 backdrop-blur-xl">
        <h1 class="font-black text-2xl tracking-tighter leading-none">Pengaturan</h1>
        <p class="text-xs font-black text-muted-foreground uppercase tracking-[0.12em] mt-1.5">Konfigurasi & Manajemen Sistem</p>
      </div>

      <div class="p-5 flex flex-col gap-3">
        {/* QRIS Upload widget */}
        <QrisSettings />

        {/* Menu Items */}
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const inner = (
            <div class={`flex items-center gap-4 bg-background p-4 rounded-2xl border shadow-sm transition-all ${
              item.disabled
                ? "border-border/50 opacity-50 cursor-not-allowed"
                : "border-border/70 hover:border-primary/30 hover:bg-muted/20 active:scale-[0.98]"
            }`}>
              <div class={`w-12 h-12 rounded-2xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shadow-inner shrink-0`}>
                <Icon size={22} stroke-width={2} />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-black text-base tracking-tight">{item.title}</h3>
                <p class="text-sm font-semibold text-muted-foreground mt-0.5">{item.subtitle}</p>
              </div>
              {item.badge && (
                <span class="text-xs font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-lg whitespace-nowrap">
                  {item.badge}
                </span>
              )}
            </div>
          );
          return item.disabled ? <div>{inner}</div> : <A href={item.href}>{inner}</A>;
        })}
      </div>

      <div class="mt-auto px-5 pb-6 text-center">
        <p class="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">Ngepos POS · v0.3.0-alpha</p>
      </div>
    </div>
  );
}
