import { createSignal } from "solid-js";
import { ArrowLeft, Save, Calendar, Clock } from "lucide-solid";
import { A, useNavigate } from "@solidjs/router";
import { db } from "~/db/db";
import { Button } from "~/components/ui/button";

export default function BackdateTransaction() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = createSignal(false);
  const [total, setTotal] = createSignal("");
  const [method, setMethod] = createSignal<"CASH" | "QRIS">("CASH");
  const [dateStr, setDateStr] = createSignal(new Date().toISOString().split('T')[0]);
  const [timeStr, setTimeStr] = createSignal("12:00");

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (isSaving()) return;
    setIsSaving(true);
    try {
      const parsedTotal = Number.parseInt(total().replaceAll(/\D/g, ''), 10) || 0;
      if (parsedTotal <= 0) throw new Error("Total tidak valid");

      const transactionId = `txn_bd_${Date.now()}`;
      const dateTime = new Date(`${dateStr()}T${timeStr()}:00`);

      await db.transactions.add({
        id: transactionId,
        receiptNumber: `BD-${Date.now()}`,
        totalAmount: parsedTotal,
        cogsTotal: 0,
        paymentMethod: method(),
        timestamp: dateTime.getTime(),
        status: 'PENDING',
        isBackdated: true
      });

      await db.transactionItems.add({
        id: `ti_bd_${Date.now()}`,
        transactionId,
        productId: "bd_item",
        productName: "Entri Transaksi Manual",
        quantity: 1,
        priceAtTime: parsedTotal,
        cogsAtTime: 0
      });

      setTimeout(() => navigate('/app/history'), 400);
    } catch {
      alert("Pastikan total diisi dengan angka yang benar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div class="flex flex-col min-h-screen bg-background pb-24">
      <div class="flex items-center gap-3 px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
        <A href="/app/history" class="w-10 h-10 flex items-center justify-center bg-card rounded-3xl shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95">
          <ArrowLeft size={18} />
        </A>
        <div>
          <h1 class="font-black text-xl tracking-tight leading-none">Input Lampau</h1>
          <span class="text-xs font-black text-muted-foreground uppercase tracking-[0.12em] mt-1 block">Catat Transaksi Masa Lalu</span>
        </div>
      </div>

      <div class="p-5 flex-1">
        <div class="bg-card p-6 rounded-3xl border border-border/60 shadow-sm">
          <form id="backdateForm" onSubmit={handleSave} class="flex flex-col gap-5">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Total Pendapatan (Rp)
              </label>
              <input
                id="backdate-total"
                required
                type="number"
                class="h-14 w-full rounded-2xl border-2 border-border/60 bg-background px-4 font-black text-xl text-foreground focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                value={total()}
                onInput={(e) => setTotal((e.target as HTMLInputElement).value)}
                placeholder="0"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label for="backdate-date" class="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Calendar size={14} /> Tanggal
                </label>
                <input
                  id="backdate-date"
                  required
                  type="date"
                  class="h-14 w-full rounded-2xl border border-border/80 bg-background px-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={dateStr()}
                  onInput={(e) => setDateStr((e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="flex flex-col gap-2">
                <label for="backdate-time" class="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Clock size={14} /> Jam
                </label>
                <input
                  id="backdate-time"
                  required
                  type="time"
                  class="h-14 w-full rounded-2xl border border-border/80 bg-background px-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={timeStr()}
                  onInput={(e) => setTimeStr((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-black uppercase tracking-widest text-muted-foreground">Metode Pembayaran</label>
              <div class="flex items-center gap-3 bg-muted/30 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMethod('CASH')}
                  class={`flex-1 h-12 rounded-xl font-black text-sm transition-all ${method() === 'CASH' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  Tunai
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('QRIS')}
                  class={`flex-1 h-12 rounded-xl font-black text-sm transition-all ${method() === 'QRIS' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  QRIS
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSaving()}
              class="w-full h-14 mt-4 rounded-2xl font-black text-base bg-foreground text-background shadow-lg hover:bg-foreground/90 flex items-center justify-center gap-2 border-none"
            >
              {isSaving() ? (
                <div class="w-6 h-6 border-3 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <><Save size={20} /> Simpan Transaksi</>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
