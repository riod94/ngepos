import { createSignal, createResource, Show } from "solid-js";
import { ArrowLeft, User, LogOut, ChevronRight, Mail, Phone, Calendar, Check } from "lucide-solid";
import { A, useNavigate } from "@solidjs/router";
import { Button } from "~/components/ui/button";
import { getSetting, setSetting } from "~/db/db";

export default function ProfilePage() {
  const navigate = useNavigate();
  
  const [userName, { refetch: refetchName }] = createResource(
    async () => (await getSetting("user_name")) ?? "Riod Prabowo"
  );
  const [userEmail, { refetch: refetchEmail }] = createResource(
    async () => (await getSetting("user_email")) ?? "riod@ngepos.id"
  );
  const [userPhone, { refetch: refetchPhone }] = createResource(
    async () => (await getSetting("user_phone")) ?? "0812-3456-7890"
  );
  const [userRole] = createSignal("Owner / Administrator");

  const [saving, setSaving] = createSignal(false);
  const [saved, setSaved] = createSignal(false);

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      await setSetting(key, value);
      if (key === "user_name") refetchName();
      if (key === "user_email") refetchEmail();
      if (key === "user_phone") refetchPhone();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="flex flex-col min-h-screen bg-muted/10 pb-24">
      {/* Header */}
      <div class="flex items-center gap-3 px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
        <button
          onClick={() => navigate(-1)}
          class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95 shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 class="font-black text-lg tracking-tight leading-none">Profil Saya</h1>
          <span class="text-xs font-bold text-muted-foreground mt-1 block uppercase tracking-widest leading-none">
            Pengaturan Akun
          </span>
        </div>
      </div>

      <div class="p-5 flex flex-col gap-6">
        {/* User Card */}
        <div class="bg-card p-6 rounded-[32px] border border-border/70 shadow-sm flex flex-col items-center text-center relative overflow-hidden group">
          <div class="absolute top-0 left-0 w-full h-1.5 bg-primary/20" />
          <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 border-2 border-primary/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
            <User size={40} stroke-width={1.5} />
          </div>
          <h2 class="font-black text-xl tracking-tight leading-none">{userName()}</h2>
          <p class="text-sm font-bold text-muted-foreground mt-2 bg-muted/50 px-3 py-1 rounded-full uppercase tracking-tighter shrink-0 border border-border/30">
            {userRole()}
          </p>
        </div>

        {/* Account Details */}
        <div class="flex flex-col gap-2">
          <h3 class="px-2 text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Data Akun</h3>
          
          <div class="bg-card rounded-[24px] border border-border/70 shadow-sm overflow-hidden divide-y divide-border/40">
            <div class="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div class="w-10 h-10 rounded-xl bg-blue-100/50 text-blue-600 flex items-center justify-center shrink-0">
                <Mail size={18} />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Email</p>
                <input 
                  type="email"
                  class="bg-transparent border-none p-0 font-bold text-sm w-full focus:ring-0 focus:outline-none"
                  value={userEmail() ?? ""}
                  onBlur={(e) => handleSave("user_email", e.currentTarget.value)}
                />
              </div>
            </div>

            <div class="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div class="w-10 h-10 rounded-xl bg-orange-100/50 text-orange-600 flex items-center justify-center shrink-0">
                <Phone size={18} />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Telepon</p>
                <input 
                  type="tel"
                  class="bg-transparent border-none p-0 font-bold text-sm w-full focus:ring-0 focus:outline-none"
                  value={userPhone() ?? ""}
                  onBlur={(e) => handleSave("user_phone", e.currentTarget.value)}
                />
              </div>
            </div>

            <div class="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div class="w-10 h-10 rounded-xl bg-teal-100/50 text-teal-600 flex items-center justify-center shrink-0">
                <Calendar size={18} />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Terdaftar Sejak</p>
                <p class="font-bold text-sm truncate opacity-60 italic">01 Januari 2024</p>
              </div>
            </div>
          </div>
        </div>

        <Show when={saved()}>
          <div class="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-3 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-bottom-2">
            <Check size={16} stroke-width={3} />
            <span class="text-xs font-black uppercase tracking-widest leading-none">Profil Diperbarui</span>
          </div>
        </Show>

        {/* Actions */}
        <div class="flex flex-col gap-3 mt-4">
           <Button 
            variant="outline" 
            class="h-14 rounded-2xl border-2 border-red-100 hover:border-red-200 hover:bg-red-50 text-red-500 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            onClick={() => {
              if (confirm("Apakah Anda yakin ingin keluar dari aplikasi?")) {
                navigate("/login");
              }
            }}
          >
            <LogOut size={18} /> Keluar Aplikasi
          </Button>
          
          <p class="text-[10px] text-center font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mt-4">
             Versi Aplikasi 0.3.0-alpha
          </p>
        </div>
      </div>
    </div>
  );
}
