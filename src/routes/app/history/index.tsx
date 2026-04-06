import { createSignal, createResource, Show } from "solid-js";
import { History, Clock, RefreshCw, TriangleAlert } from "lucide-solid";
import { A } from "@solidjs/router";
import { db } from "~/db/db";
import { Button } from "~/components/ui/button";

export default function HistoryPage() {
  const [filter, setFilter] = createSignal<'HARI_INI' | 'SEMUA'>('HARI_INI');

  const [transactions, { refetch }] = createResource(filter, async (f) => {
    const query = db.transactions.orderBy('timestamp').reverse();
    if (f === 'HARI_INI') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return await query.filter(tx => tx.timestamp >= today.getTime()).toArray();
    }
    return await query.toArray();
  });

  const totalSales = () => transactions()?.reduce((acc, tx) => acc + tx.totalAmount, 0) ?? 0;

  return (
    <div class="flex flex-col min-h-screen bg-background pb-24">
      <div class="px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
        <h1 class="font-black text-[28px] tracking-tighter leading-none">Riwayat</h1>
        <p class="text-[11px] font-black text-muted-foreground uppercase tracking-[0.12em] mt-1.5">
          Transaksi {filter() === 'HARI_INI' ? 'hari ini' : 'semua waktu'}
        </p>

        <div class="flex items-center gap-2 mt-4">
          <Button
            onClick={() => setFilter('HARI_INI')}
            variant={filter() === 'HARI_INI' ? 'default' : 'outline'}
            class={`flex-1 h-11 rounded-full font-black text-[13px] uppercase tracking-wider ${filter() === 'HARI_INI' ? 'shadow-md shadow-primary/20' : 'bg-card border-border/60 text-muted-foreground'}`}
          >
            Hari Ini
          </Button>
          <Button
            onClick={() => setFilter('SEMUA')}
            variant={filter() === 'SEMUA' ? 'default' : 'outline'}
            class={`flex-1 h-11 rounded-full font-black text-[13px] uppercase tracking-wider ${filter() === 'SEMUA' ? 'shadow-md shadow-primary/20' : 'bg-card border-border/60 text-muted-foreground'}`}
          >
            Semua
          </Button>
          <Button variant="outline" size="icon" class="h-11 w-11 shrink-0 rounded-full bg-card border-border/60" onClick={() => refetch()}>
            <RefreshCw size={18} class="text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div class="p-5 flex-1 flex flex-col gap-4">
        {/* Total Hero */}
        <div class="p-6 rounded-[28px] bg-gradient-to-br from-primary to-orange-500 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
          <div class="absolute -right-6 -top-6 opacity-10">
            <History size={140} />
          </div>
          <span class="text-[11px] font-black opacity-80 uppercase tracking-widest block mb-2">Total Penjualan</span>
          <h2 class="text-[34px] font-black tracking-tighter">Rp {totalSales().toLocaleString('id-ID')}</h2>
          <span class="text-[10px] font-black opacity-90 mt-2 block bg-black/10 w-fit px-2.5 py-1 rounded-lg uppercase tracking-widest">
            {transactions()?.length ?? 0} Transaksi
          </span>
        </div>

        <div class="flex items-center justify-between">
          <h3 class="font-black text-[15px] uppercase tracking-widest text-muted-foreground">Daftar Transaksi</h3>
          <A
            href="/app/history/backdate"
            class="text-[10px] font-black text-primary flex items-center bg-primary/10 px-3.5 py-2 rounded-full hover:bg-primary/20 transition-all active:scale-95 uppercase tracking-widest"
          >
            <Clock size={12} class="mr-1.5" stroke-width={3} />
            Input Lampau
          </A>
        </div>

        <Show
          when={transactions() && transactions()!.length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 border border-border/50">
                <History size={24} class="opacity-40" />
              </div>
              <span class="font-bold text-[15px]">Belum ada transaksi</span>
              <span class="text-sm mt-1 text-center max-w-[200px] opacity-70">
                {filter() === 'HARI_INI' ? 'Belum ada penjualan hari ini.' : 'Database masih kosong.'}
              </span>
            </div>
          }
        >
          <div class="flex flex-col gap-3">
            {transactions()!.map(tx => (
              <A
                href={`/app/receipt/${tx.id}`}
                class="flex items-center justify-between p-4 bg-card rounded-[20px] border border-border/60 shadow-sm active:scale-[0.98] transition-transform hover:border-primary/30 group"
              >
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-2">
                    <span class="font-black text-[14px] group-hover:text-primary transition-colors">{tx.receiptNumber}</span>
                    <Show when={tx.isBackdated}>
                      <span class="bg-amber-100 text-amber-700 text-[9px] uppercase font-black px-1.5 py-0.5 rounded tracking-widest">Lampau</span>
                    </Show>
                  </div>
                  <span class="text-[12px] font-semibold text-muted-foreground">
                    {new Date(tx.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div class="flex flex-col items-end gap-1.5">
                  <span class="font-black text-[16px]">Rp {tx.totalAmount.toLocaleString('id-ID')}</span>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] font-black text-muted-foreground uppercase bg-muted/70 px-1.5 py-0.5 rounded tracking-widest">
                      {tx.paymentMethod}
                    </span>
                    <Show when={tx.status === 'PENDING'}>
                      <TriangleAlert size={13} class="text-orange-400" />
                    </Show>
                  </div>
                </div>
              </A>
            ))}
          </div>
        </Show>
      </div>
    </div>
  );
}
