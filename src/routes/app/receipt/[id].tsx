import { useParams, A } from "@solidjs/router";
import { createResource, Show, For } from "solid-js";
import { Coffee, ArrowLeft, Printer } from "lucide-solid";
import { db } from "~/db/db";
import { Button } from "~/components/ui/button";

export default function Receipt() {
  const params = useParams();

  const [transaction] = createResource(params.id, async (id) => {
    const tx = await db.transactions.get(id);
    if (!tx) return null;
    const items = await db.transactionItems.where("transactionId").equals(id).toArray();
    return { ...tx, items };
  });

  return (
    <div class="flex flex-col min-h-screen bg-muted/20 pb-24">
      {/* App Bar */}
      <div class="flex items-center justify-between p-4 bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b border-border/50">
        <A href="/app/riwayat" class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60">
          <ArrowLeft size={20} />
        </A>
        <span class="font-black text-[17px] tracking-tight">Struk Transaksi</span>
        <div class="w-10" />
      </div>

      <Show
        when={transaction()}
        fallback={
          <div class="p-8 text-center animate-pulse font-bold text-muted-foreground mt-10">
            Memuat struk...
          </div>
        }
      >
        <div class="p-5 flex flex-col items-center">
          {/* Thermal Receipt */}
          <div class="w-full max-w-sm bg-card rounded-sm overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-border/60 print:shadow-none">
            <div class="h-2 w-full bg-gradient-to-r from-transparent via-border/40 to-transparent border-t border-dashed border-border/40" />

            <div class="p-6 flex flex-col items-center font-mono">
              <div class="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3 print:hidden">
                <Coffee size={28} stroke-width={2.5} />
              </div>
              <h2 class="font-black text-xl tracking-tight text-foreground uppercase font-sans">Kopi Santai</h2>
              <p class="text-[12px] text-muted-foreground font-semibold mt-1 text-center font-sans">
                Jl. Cikini Raya No. 42, Jakarta Pusat
              </p>

              <div class="w-full border-b border-dashed border-border/60 my-5" />

              <div class="w-full flex justify-between text-[12px] text-muted-foreground font-semibold mb-1 font-sans">
                <span>{new Date(transaction()!.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span>{new Date(transaction()!.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div class="w-full flex justify-between text-[12px] font-bold text-foreground/80 mb-5 font-sans">
                <span>#{transaction()!.receiptNumber}</span>
                <span>Kasir: Admin</span>
              </div>

              <div class="w-full flex flex-col gap-3">
                <For each={transaction()!.items}>
                  {(item) => (
                    <div class="flex justify-between items-start text-[13px]">
                      <div class="flex flex-col">
                        <span class="font-black text-foreground font-sans">{item.productName}</span>
                        <span class="text-[11px] text-muted-foreground font-bold font-sans">
                          {item.quantity} × Rp {item.priceAtTime.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span class="font-black text-foreground">
                        {(item.quantity * item.priceAtTime).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </For>
              </div>

              <div class="w-full border-b border-dashed border-border/60 my-5" />

              <div class="w-full flex justify-between text-[18px] font-black font-sans">
                <span>Total</span>
                <span>Rp {transaction()!.totalAmount.toLocaleString('id-ID')}</span>
              </div>
              <div class="w-full flex justify-between text-[12px] font-bold text-muted-foreground mt-3 font-sans">
                <span>Metode Bayar</span>
                <span class="text-primary font-black bg-primary/10 px-2 py-0.5 rounded">
                  {transaction()!.paymentMethod}
                </span>
              </div>

              <p class="text-[10px] font-black text-muted-foreground/50 tracking-widest uppercase font-sans mt-8">
                — Terima Kasih —
              </p>
            </div>

            <div class="h-2 w-full border-b border-dashed border-border/40" />
          </div>

          {/* Actions */}
          <div class="flex gap-3 w-full max-w-sm mt-6 print:hidden">
            <Button
              onClick={() => globalThis.print()}
              variant="outline"
              class="flex-1 h-14 rounded-2xl font-black border-border/80 shadow-sm text-[14px] bg-card"
            >
              <Printer size={18} class="mr-2" />
              Cetak Struk
            </Button>
            <A href="/app" class="flex-1">
              <Button class="w-full h-14 rounded-2xl font-black shadow-md text-[14px]">
                Kembali ke Kasir
              </Button>
            </A>
          </div>
        </div>
      </Show>
    </div>
  );
}
