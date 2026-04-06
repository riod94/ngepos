import { createSignal, createResource, Show, For } from "solid-js";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, BarChart3, RefreshCw, Wallet, ShoppingBag, ArrowUpRight, ArrowDownRight } from "lucide-solid";
import { A } from "@solidjs/router";
import { db } from "~/db/db";
import { Button } from "~/components/ui/button";

type Period = "HARI_INI" | "BULAN_INI" | "SEMUA";

interface ReportData {
  omset: number;           // Total pendapatan dari penjualan
  cogsTotal: number;       // Total HPP (modal produk terjual)
  grossProfit: number;     // Omset - HPP
  expenses: number;        // Total pengeluaran operasional
  netProfit: number;       // Gross Profit - Pengeluaran
  modalReturn: number;     // HPP = uang yang harus dikembalikan ke modal
  trueProfit: number;      // Net Profit setelah dikurang modal kembali
  txCount: number;
  expenseCount: number;
}

function periodStart(period: Period): number {
  if (period === "HARI_INI") {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  }
  if (period === "BULAN_INI") {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime();
  }
  return 0;
}

export default function Reports() {
  const [period, setPeriod] = createSignal<Period>("BULAN_INI");

  const [report] = createResource(period, async (p): Promise<ReportData> => {
    const start = periodStart(p);

    const [txList, expList] = await Promise.all([
      db.transactions.where("timestamp").aboveOrEqual(start).toArray(),
      db.expenses.where("timestamp").aboveOrEqual(start).toArray(),
    ]);

    const omset       = txList.reduce((s, t) => s + t.totalAmount, 0);
    const cogsTotal   = txList.reduce((s, t) => s + (t.cogsTotal ?? 0), 0);
    const grossProfit = omset - cogsTotal;
    const expenses    = expList.reduce((s, e) => s + e.amount, 0);
    const netProfit   = grossProfit - expenses;
    // Modal kembali: HPP yang harus dialokasikan kembali untuk restok bahan
    const modalReturn = cogsTotal;
    const trueProfit  = netProfit - modalReturn;   // profit setelah alokasi modal

    return {
      omset, cogsTotal, grossProfit,
      expenses, netProfit, modalReturn, trueProfit,
      txCount: txList.length,
      expenseCount: expList.length,
    };
  });

  const PERIODS: { key: Period; label: string }[] = [
    { key: "HARI_INI", label: "Hari Ini" },
    { key: "BULAN_INI", label: "Bulan Ini" },
    { key: "SEMUA", label: "Semua" },
  ];

  const fmt = (n: number) => `Rp ${Math.abs(n).toLocaleString("id-ID")}`;
  const isPositive = (n: number) => n >= 0;

  return (
    <div class="flex flex-col min-h-screen bg-muted/10 pb-24">
      {/* Header */}
      <div class="px-5 pt-6 pb-4 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <A href="/app/pengaturan" class="w-10 h-10 flex items-center justify-center bg-card rounded-full shadow-sm border border-border/60">
              <ArrowLeft size={18} />
            </A>
            <div>
              <h1 class="font-black text-[22px] tracking-tight">Laporan Keuangan</h1>
              <span class="text-[11px] font-black text-muted-foreground uppercase tracking-widest">P&L Overview</span>
            </div>
          </div>
          {/* Shortcut to expenses */}
          <A href="/app/expenses" class="h-10 px-3 rounded-full bg-red-100 text-red-600 flex items-center gap-1.5 font-black text-[12px] uppercase tracking-widest hover:bg-red-200 transition-colors">
            <ArrowDownRight size={16} /> Pengeluaran
          </A>
        </div>

        {/* Period filter */}
        <div class="flex gap-2">
          <For each={PERIODS}>
            {(p) => (
              <button
                type="button"
                onClick={() => setPeriod(p.key)}
                class={`flex-1 h-10 rounded-full text-[12px] font-black uppercase tracking-widest transition-all ${
                  period() === p.key
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            )}
          </For>
        </div>
      </div>

      <Show when={report()} fallback={
        <div class="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span class="font-bold">Menghitung laporan...</span>
        </div>
      }>
        {(r) => {
          const d = r();
          return (
            <div class="p-5 flex flex-col gap-4">

              {/* Hero: Net Profit */}
              <div class={`p-6 rounded-[28px] relative overflow-hidden shadow-xl text-white ${isPositive(d.netProfit) ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20" : "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20"}`}>
                <div class="absolute -right-8 -top-8 opacity-10">
                  {isPositive(d.netProfit) ? <TrendingUp size={160} /> : <TrendingDown size={160} />}
                </div>
                <span class="text-[11px] font-black uppercase tracking-widest opacity-80 block mb-2">
                  Pendapatan Bersih
                </span>
                <p class="text-[42px] font-black tracking-tighter leading-none">
                  {isPositive(d.netProfit) ? "" : "−"}{fmt(d.netProfit)}
                </p>
                <div class="flex gap-3 mt-4">
                  <span class="text-[11px] font-black bg-black/10 px-2 py-1 rounded-lg">
                    {d.txCount} Transaksi
                  </span>
                  <span class="text-[11px] font-black bg-black/10 px-2 py-1 rounded-lg">
                    {d.expenseCount} Pengeluaran
                  </span>
                </div>
              </div>

              {/* Section 1: Penjualan */}
              <div class="bg-card p-5 rounded-[24px] border border-border/60 shadow-sm flex flex-col gap-4">
                <h3 class="font-black text-[13px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <ShoppingBag size={16} class="text-primary" /> Penjualan
                </h3>

                <MetricRow label="Omset (Total Penjualan)" value={fmt(d.omset)} color="text-foreground" />
                <div class="h-px bg-border/50" />
                <MetricRow label="HPP (Modal Produk Terjual)" value={`−${fmt(d.cogsTotal)}`} color="text-red-500" sub="Biaya bahan baku produk yang terjual" />
                <div class="h-px bg-border/50" />
                <MetricRow
                  label="Laba Kotor"
                  value={`${isPositive(d.grossProfit) ? "" : "−"}${fmt(d.grossProfit)}`}
                  color={isPositive(d.grossProfit) ? "text-emerald-600" : "text-red-500"}
                  bold
                  sub="Omset dikurangi HPP"
                />
              </div>

              {/* Section 2: Biaya Operasional */}
              <div class="bg-card p-5 rounded-[24px] border border-border/60 shadow-sm flex flex-col gap-4">
                <h3 class="font-black text-[13px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Wallet size={16} class="text-red-500" /> Biaya Operasional
                </h3>

                <MetricRow label="Total Pengeluaran" value={`−${fmt(d.expenses)}`} color="text-red-500" />
                <div class="h-px bg-border/50" />
                <MetricRow
                  label="Pendapatan Bersih"
                  value={`${isPositive(d.netProfit) ? "" : "−"}${fmt(d.netProfit)}`}
                  color={isPositive(d.netProfit) ? "text-emerald-600" : "text-red-500"}
                  bold
                  sub="Laba Kotor dikurangi Pengeluaran"
                />
              </div>

              {/* Section 3: Alokasi Modal & Profit Murni */}
              <div class={`p-5 rounded-[24px] border-2 shadow-sm flex flex-col gap-4 ${isPositive(d.trueProfit) ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}>
                <h3 class={`font-black text-[13px] uppercase tracking-widest flex items-center gap-2 ${isPositive(d.trueProfit) ? "text-emerald-700" : "text-red-700"}`}>
                  <BarChart3 size={16} /> Analisis Modal & Profit
                </h3>

                <MetricRow label="Modal Harus Kembali (HPP)" value={`−${fmt(d.modalReturn)}`} color="text-orange-600" sub="Dialokasikan untuk restok bahan baku" />
                <div class="h-px bg-border/40" />
                <div class={`p-4 rounded-2xl ${isPositive(d.trueProfit) ? "bg-emerald-100" : "bg-red-100"}`}>
                  <p class="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">
                    {isPositive(d.trueProfit) ? "Profit Murni (Uang Bebas)" : "DEFISIT — Perlu Perhatian!"}
                  </p>
                  <p class={`text-[28px] font-black tracking-tighter ${isPositive(d.trueProfit) ? "text-emerald-700" : "text-red-700"}`}>
                    {isPositive(d.trueProfit) ? "" : "−"}{fmt(d.trueProfit)}
                  </p>
                  <p class="text-[11px] font-semibold opacity-60 mt-1">
                    {isPositive(d.trueProfit)
                      ? "Uang yang benar-benar menjadi keuntungan setelah modal dikembalikan"
                      : "Pengeluaran melebihi pendapatan, perlu evaluasi biaya operasional"
                    }
                  </p>
                </div>
              </div>

              {/* Quick Links */}
              <div class="grid grid-cols-2 gap-3 mt-2">
                <A href="/app/expenses" class="bg-card p-4 rounded-[20px] border border-border/60 shadow-sm flex items-center gap-3 hover:border-red-300 transition-colors active:scale-[0.98]">
                  <div class="w-10 h-10 rounded-[12px] bg-red-100 text-red-600 flex items-center justify-center">
                    <ArrowDownRight size={20} />
                  </div>
                  <div>
                    <p class="font-black text-[13px]">Pengeluaran</p>
                    <p class="text-[10px] text-muted-foreground font-semibold">Kelola biaya</p>
                  </div>
                </A>
                <A href="/app/riwayat" class="bg-card p-4 rounded-[20px] border border-border/60 shadow-sm flex items-center gap-3 hover:border-primary/30 transition-colors active:scale-[0.98]">
                  <div class="w-10 h-10 rounded-[12px] bg-primary/10 text-primary flex items-center justify-center">
                    <ArrowUpRight size={20} />
                  </div>
                  <div>
                    <p class="font-black text-[13px]">Riwayat</p>
                    <p class="text-[10px] text-muted-foreground font-semibold">Semua transaksi</p>
                  </div>
                </A>
              </div>

            </div>
          );
        }}
      </Show>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MetricRowProps {
  label: string;
  value: string;
  color: string;
  sub?: string;
  bold?: boolean;
}

function MetricRow(props: MetricRowProps) {
  return (
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1">
        <p class={`${props.bold ? "font-black text-[15px]" : "font-semibold text-[14px]"} text-foreground/90`}>{props.label}</p>
        {props.sub && <p class="text-[11px] font-semibold text-muted-foreground mt-0.5">{props.sub}</p>}
      </div>
      <p class={`${props.bold ? "font-black text-[17px]" : "font-black text-[15px]"} shrink-0 ${props.color}`}>{props.value}</p>
    </div>
  );
}
