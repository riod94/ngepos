import { useParams, useNavigate, A } from "@solidjs/router";
import { createResource, Show, For } from "solid-js";
import { ArrowLeft, Printer, Store } from "lucide-solid";
import { db, getSetting } from "~/db/db";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/stores/auth";

export default function Receipt() {
  const params = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [transaction] = createResource(params.id, async (id) => {
    const tx = await db.transactions.get(id);
    if (!tx) return null;
    const items = await db.transactionItems.where("transactionId").equals(id).toArray();
    return { ...tx, items };
  });

  const [outletName] = createResource(async () => (await getSetting("outlet_name")) ?? "Ngepos Coffee");
  const [outletAddress] = createResource(async () => (await getSetting("outlet_address")) ?? "Jl. Kopi No. 123");
  const [outletLogo] = createResource(async () => await getSetting("outlet_logo"));
  const [showLogo] = createResource(async () => (await getSetting("receipt_show_logo")) !== "false");
  const [footerText] = createResource(async () => (await getSetting("receipt_footer_text")) ?? "— TERIMA KASIH —");
  const cashierName = () => transaction()?.cashierName ?? currentUser()?.name ?? "Admin";

  return (
    <div class="flex flex-col min-h-screen bg-muted/20 pb-24 print:pb-0 print:bg-white print:min-h-0">
      {/* App Bar */}
      <div class="flex items-center justify-between p-5 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl print:hidden">
        <div class="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => navigate(-1)} 
            class="w-10 h-10 flex items-center justify-center bg-card rounded-3xl shadow-sm border border-border/60 transition-all hover:bg-muted active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 class="font-black text-xl tracking-tight leading-none">Detail Transaksi</h1>
            <p class="text-xs font-black text-muted-foreground uppercase tracking-[0.12em] mt-1.5 block">Nota Digital #{transaction()?.receiptNumber || '...'}</p>
          </div>
        </div>
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
              <Show when={showLogo() ?? true}>
                <div class="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center text-primary mb-3 overflow-hidden border border-border/40 shrink-0">
                  <Show when={outletLogo()} fallback={<Store size={32} stroke-width={2} class="text-muted-foreground/60" />}>
                    <img src={outletLogo()!} alt="Logo" class="w-full h-full object-cover" />
                  </Show>
                </div>
              </Show>
              <h2 class="font-black text-xl tracking-tight text-foreground uppercase font-sans text-center">
                {outletName()}
              </h2>
              <p class="text-[11px] text-muted-foreground font-bold mt-1.5 text-center font-sans max-w-[200px] leading-relaxed">
                {outletAddress()}
              </p>

              <div class="w-full border-b border-dashed border-border/60 my-5" />

              <div class="w-full flex justify-between text-sm text-muted-foreground font-semibold mb-1 font-sans">
                <span>{new Date(transaction()!.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span>{new Date(transaction()!.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div class="w-full flex justify-between text-sm font-bold text-foreground/80 mb-5 font-sans">
                <span>#{transaction()!.receiptNumber}</span>
                <span class="text-right">Kasir: {cashierName()}</span>
              </div>

              <div class="w-full flex flex-col gap-3">
                <For each={transaction()!.items}>
                  {(item) => (
                    <div class="flex justify-between items-start text-sm">
                      <div class="flex flex-col flex-1 truncate">
                        <span class="font-black text-foreground font-sans truncate">{item.productName}</span>
                        <Show when={item.selectedVariants && item.selectedVariants.length > 0}>
                          <div class="flex flex-wrap gap-x-1 gap-y-0.5 mt-0.5 mb-1">
                            <For each={item.selectedVariants}>
                              {(v) => (
                                <span class="text-[10px] font-bold text-muted-foreground/70 font-sans">
                                  • {v.optionName}
                                </span>
                              )}
                            </For>
                          </div>
                        </Show>
                        <span class="text-xs text-muted-foreground font-bold font-sans">
                          {item.quantity} × Rp {item.priceAtTime.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span class="font-black text-foreground ml-2">
                        {(item.quantity * item.priceAtTime).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </For>
              </div>

              <div class="w-full border-b border-dashed border-border/60 my-5" />

              <div class="w-full flex flex-col gap-1.5 mb-5 leading-tight font-sans text-left">
                <div class="w-full flex justify-between text-xs font-bold text-muted-foreground italic">
                  <span>Subtotal Produk</span>
                  <span>Rp {(transaction()?.originalAmount ?? 0).toLocaleString('id-ID')}</span>
                </div>

                <Show when={(transaction()?.discountTotal ?? 0) > 0}>
                  <div class="w-full flex justify-between text-xs font-bold text-emerald-600 italic">
                    <span class="truncate max-w-[150px]">Promo ({transaction()?.discountNote ?? 'Diskon'})</span>
                    <span>- Rp {(transaction()?.discountTotal ?? 0).toLocaleString('id-ID')}</span>
                  </div>
                </Show>

                <Show when={transaction()?.isAdjustment}>
                  {(() => {
                    const baseAfterPromo = (transaction()?.originalAmount || 0) - (transaction()?.discountTotal || 0);
                    const diff = (transaction()?.totalAmount || 0) - baseAfterPromo;
                    if (Math.abs(diff) < 1) return null;
                    return (
                      <div class="w-full flex justify-between text-xs font-bold italic">
                        <span class={diff > 0 ? "text-blue-600" : "text-red-500"}>
                          {diff > 0 ? "Fee Platform/Markup" : "Penyesuaian"}
                        </span>
                        <span class={diff > 0 ? "text-blue-600" : "text-red-500"}>
                          {diff > 0 ? "+" : "-"} Rp {Math.abs(diff).toLocaleString('id-ID')}
                        </span>
                      </div>
                    );
                  })()}
                </Show>
              </div>

              <div class="w-full flex justify-between text-lg font-black font-sans leading-none">
                <span>Total Bayar</span>
                <span>Rp {transaction()!.totalAmount.toLocaleString('id-ID')}</span>
              </div>
              <div class="w-full flex justify-between text-sm font-bold text-muted-foreground mt-3 font-sans">
                <span>Metode Bayar</span>
                <span class="text-primary font-black bg-primary/10 px-2 py-0.5 rounded">
                  {transaction()!.paymentMethod}
                </span>
              </div>

              <div class="pt-8 pb-4 text-center">
                <p class="text-xs font-bold text-muted-foreground opacity-60 tracking-widest uppercase">
                  {footerText() || "— TERIMA KASIH —"}
                </p>
              </div>
            </div>

            <div class="h-2 w-full border-b border-dashed border-border/40" />
          </div>

          {/* Actions */}
          <div class="flex gap-3 w-full max-w-sm mt-6 print:hidden">
            <Button
              onClick={() => globalThis.print()}
              variant="outline"
              class="flex-1 h-14 rounded-2xl font-black border-border/80 shadow-sm text-sm bg-card"
            >
              <Printer size={18} class="mr-2" />
              Cetak Struk
            </Button>
            <A href="/app" class="flex-1">
              <Button class="w-full h-14 rounded-2xl font-black shadow-md text-sm">
                Kembali ke Kasir
              </Button>
            </A>
          </div>
        </div>
      </Show>
    </div>
  );
}
