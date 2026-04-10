import { createSignal, createResource, Show, batch } from "solid-js";
import {
	TrendingUp,
	TrendingDown,
	Minus,
	ChartBar,
	RefreshCw,
	Wallet,
	ShoppingBag,
	ArrowUpRight,
	ArrowDownRight,
} from "lucide-solid";
import { A } from "@solidjs/router";
import { db } from "~/db/db";
import { Button } from "~/components/ui/button";
import { DateFilter, DateFilterType, DateRange } from "~/components/DateFilter";

type Period = DateFilterType;

interface ReportData {
	omset: number; // Total pendapatan dari penjualan
	cogsTotal: number; // Total HPP (modal produk terjual)
	grossProfit: number; // Omset - HPP
	platformAdjustment: number; // Selisih mark-up atau diskon platform (GoFood dsb)
	expenses: number; // Total pengeluaran operasional
	netProfit: number; // Gross Profit - Pengeluaran
	modalReturn: number; // HPP = uang yang harus dikembalikan ke modal
	trueProfit: number; // Net Profit setelah dikurang modal kembali
	txCount: number;
	expenseCount: number;
}

export default function Reports() {
	const [period, setPeriod] = createSignal<DateFilterType>("HARI_INI");
	const [customRange, setCustomRange] = createSignal<DateRange | undefined>(
		undefined,
	);

	const [report] = createResource(
		() => ({ p: period(), r: customRange() }),
		async ({ p, r }): Promise<ReportData> => {
			const now = new Date();
			let startTs = 0;
			let endTs = 8640000000000000;

			if (p === "HARI_INI") {
				startTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
				endTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
			} else if (p === "BULAN_INI") {
				startTs = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
				endTs = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
			} else if (p === "CUSTOM" && r) {
				startTs = r.from;
				endTs = r.to;
			} else if (p === "SEMUA") {
				startTs = 0;
				endTs = 8640000000000000;
			}

			const [allTx, allExp] = await Promise.all([
				db.transactions.toArray(),
				db.expenses.toArray(),
			]);

			const safe = (v: any) => {
				if (typeof v === "number") return isNaN(v) ? 0 : v;
				if (!v) return 0;
				const n = parseFloat(String(v).replace(/[^0-9.-]+/g, ""));
				return isNaN(n) ? 0 : n;
			};

			const txList = allTx.filter((t) => {
				const ts = safe(t.timestamp);
				return ts >= startTs && ts <= endTs;
			});
			const expList = allExp.filter((e) => {
				const ts = safe(e.timestamp);
				return ts >= startTs && ts <= endTs;
			});

			const omset = txList.reduce((s, t) => s + safe(t.totalAmount), 0);
			const baseOmset = txList.reduce((s, t) => s + safe(t.originalAmount || t.totalAmount), 0);
			const platformAdjustment = omset - baseOmset;

			const cogsTotal = txList.reduce((s, t) => s + safe(t.cogsTotal), 0);
			const grossProfit = omset - cogsTotal;
			const expenses = expList.reduce((s, e) => s + safe(e.amount), 0);
			const netProfit = grossProfit - expenses;
			const modalReturn = cogsTotal;
			const trueProfit = netProfit - modalReturn;

			const result = {
				omset,
				platformAdjustment,
				cogsTotal,
				grossProfit,
				expenses,
				netProfit,
				modalReturn,
				trueProfit,
				txCount: txList.length,
				expenseCount: expList.length,
			};

			return result;
		},
	);

	const handleFilterChange = (f: DateFilterType, r?: DateRange) => {
		batch(() => {
			setPeriod(f);
			setCustomRange(r);
		});
	};

	const fmt = (n: number) => `Rp ${Math.abs(n || 0).toLocaleString("id-ID")}`;
	const isPositive = (n: number) => (n || 0) >= 0;

	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-24 text-left">
			{/* Header Hub */}
			<div class="px-5 pt-8 pb-6 bg-background border-b border-border/40 sticky top-0 z-10 backdrop-blur-xl">
				<h1 class="font-black text-2xl tracking-tighter leading-none text-primary">
					Laporan & Analisis
				</h1>
				<p class="text-xs font-black text-muted-foreground uppercase tracking-[0.12em] mt-1.5 mb-5">
					Ringkasan Performa & Navigasi Data
				</p>

				<DateFilter
					activeFilter={period()}
					onFilterChange={handleFilterChange}
					customRange={customRange()}
				/>
			</div>

			<Show
				when={!report.loading && report.latest}
				fallback={
					<div class="flex items-center justify-center py-20 gap-3 text-muted-foreground">
						<div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
						<span class="font-bold">Menghitung laporan...</span>
					</div>
				}
			>
				<div class="p-5 flex flex-col gap-4">
					{/* Hero: Net Profit */}
					<div
						class={`p-6 rounded-3xl relative overflow-hidden shadow-xl text-white ${isPositive(report()!.netProfit) ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20" : "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20"}`}
					>
						<div class="absolute -right-8 -top-8 opacity-10">
							{isPositive(report()!.netProfit) ? (
								<TrendingUp size={160} />
							) : (
								<TrendingDown size={160} />
							)}
						</div>
						<span class="text-xs font-black uppercase tracking-widest opacity-80 block mb-1">
							Pendapatan Bersih
						</span>
						<p class="text-3xl font-black tracking-tighter leading-none">
							{isPositive(report()!.netProfit) ? "" : "−"}
							{fmt(report()!.netProfit)}
						</p>
						<div class="flex gap-2 mt-3">
							<span class="text-xs font-black bg-black/10 px-2 py-0.5 rounded-md uppercase tracking-widest">
								{report()!.txCount} Penjualan
							</span>
							<span class="text-xs font-black bg-black/10 px-2 py-0.5 rounded-md uppercase tracking-widest">
								{report()!.expenseCount} Opex
							</span>
						</div>
					</div>

					{/* Section 1: Penjualan */}
					<div class="bg-card p-5 rounded-2xl border border-border/60 shadow-sm flex flex-col gap-4">
						<h3 class="font-black text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
							<ShoppingBag size={16} class="text-primary" />{" "}
							Penjualan
						</h3>

						<MetricRow
							label="Omset (Total Net Pendapatan)"
							value={fmt(report()!.omset)}
							color="text-foreground"
							sub="Total uang yang benar-benar Anda terima"
						/>
						<div class="h-px bg-border/50" />
						<MetricRow
							label="Penyesuaian Harga Platform"
							value={`${report()!.platformAdjustment > 0 ? "+" : ""}${fmt(report()!.platformAdjustment)}`}
							color={
								report()!.platformAdjustment >= 0
									? "text-emerald-600"
									: "text-red-500"
							}
							sub="Selisih Mark-up (+) atau Fee Platform (-)"
						/>
						<div class="h-px bg-border/50" />
						<MetricRow
							label="HPP (Modal Produk Terjual)"
							value={`−${fmt(report()!.cogsTotal)}`}
							color="text-red-500"
							sub="Biaya bahan baku produk yang terjual"
						/>
						<div class="h-px bg-border/50" />
						<MetricRow
							label="Laba Kotor"
							value={`${isPositive(report()!.grossProfit) ? "" : "−"}${fmt(report()!.grossProfit)}`}
							color={
								isPositive(report()!.grossProfit)
									? "text-emerald-600"
									: "text-red-500"
							}
							bold
							sub="Omset dikurangi HPP"
						/>
					</div>

					{/* Section 2: Biaya Operasional */}
					<div class="bg-card p-5 rounded-3xl border border-border/60 shadow-sm flex flex-col gap-4">
						<h3 class="font-black text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
							<Wallet size={16} class="text-red-500" /> Biaya
							Operasional
						</h3>

						<MetricRow
							label="Total Pengeluaran"
							value={`−${fmt(report()!.expenses)}`}
							color="text-red-500"
						/>
						<div class="h-px bg-border/50" />
						<MetricRow
							label="Pendapatan Bersih"
							value={`${isPositive(report()!.netProfit) ? "" : "−"}${fmt(report()!.netProfit)}`}
							color={
								isPositive(report()!.netProfit)
									? "text-emerald-600"
									: "text-red-500"
							}
							bold
							sub="Laba Kotor dikurangi Pengeluaran"
						/>
					</div>

					{/* Section 3: Alokasi Modal & Profit Murni */}
					<div
						class={`p-5 rounded-3xl border-2 shadow-sm flex flex-col gap-4 ${isPositive(report()!.trueProfit) ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}
					>
						<h3
							class={`font-black text-sm uppercase tracking-widest flex items-center gap-2 ${isPositive(report()!.trueProfit) ? "text-emerald-700" : "text-red-700"}`}
						>
							<ChartBar size={16} /> Analisis Modal & Profit
						</h3>

						<MetricRow
							label="Modal Harus Kembali (HPP)"
							value={`−${fmt(report()!.modalReturn)}`}
							color="text-orange-600"
							sub="Dialokasikan untuk restok bahan baku"
						/>
						<div class="h-px bg-border/40" />
						<div
							class={`p-4 rounded-2xl ${isPositive(report()!.trueProfit) ? "bg-emerald-100" : "bg-red-100"}`}
						>
							<p class="text-xs font-black uppercase tracking-widest opacity-60 mb-0.5">
								{isPositive(report()!.trueProfit)
									? "Profit Murni (Uang Bebas)"
									: "DEFISIT — Perlu Perhatian!"}
							</p>
							<p
								class={`text-xl font-black tracking-tighter leading-none mt-1 ${isPositive(report()!.trueProfit) ? "text-emerald-700" : "text-red-700"}`}
							>
								{isPositive(report()!.trueProfit) ? "" : "−"}
								{fmt(report()!.trueProfit)}
							</p>
							<p class="text-xs font-semibold opacity-60 mt-1">
								{isPositive(report()!.trueProfit)
									? "Uang yang benar-benar menjadi keuntungan setelah modal dikembalikan"
									: "Pengeluaran melebihi pendapatan, perlu evaluasi biaya operasional"}
							</p>
						</div>
					</div>

					{/* Hub Navigation Quick Links */}
					<div class="flex flex-col gap-3 mt-4">
						<h3 class="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">
							Navigasi Data Lanjutan
						</h3>
						<div class="grid grid-cols-1 gap-3">
							<A
								href="/app/reports/history"
								class="bg-background p-4 rounded-3xl border border-border/70 shadow-sm flex items-center gap-4 hover:border-primary/30 hover:bg-muted/10 transition-all active:scale-[0.98]"
							>
								<div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner shrink-0">
									<ArrowUpRight size={22} stroke-width={2.5} />
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-black text-base tracking-tight">
										Riwayat Transaksi
									</p>
									<p class="text-xs text-muted-foreground font-semibold">
										Detail semua penjualan & cetak ulang struk
									</p>
								</div>
								<div class="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="3"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="m9 18 6-6-6-6" />
									</svg>
								</div>
							</A>
							<A
								href="/app/reports/expenses"
								class="bg-background p-4 rounded-3xl border border-border/70 shadow-sm flex items-center gap-4 hover:border-red-300 hover:bg-muted/10 transition-all active:scale-[0.98]"
							>
								<div class="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-inner shrink-0">
									<ArrowDownRight size={22} stroke-width={2.5} />
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-black text-base tracking-tight">
										Pengeluaran Operasional
									</p>
									<p class="text-xs text-muted-foreground font-semibold">
										Catat belanja bahan & biaya lainnya
									</p>
								</div>
								<div class="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="3"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="m9 18 6-6-6-6" />
									</svg>
								</div>
							</A>
						</div>
					</div>
				</div>
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
				<p
					class={`${props.bold ? "font-black text-sm" : "font-semibold text-sm"} text-foreground/90`}
				>
					{props.label}
				</p>
				{props.sub && (
					<p class="text-xs font-semibold text-muted-foreground mt-0.5">
						{props.sub}
					</p>
				)}
			</div>
			<p
				class={`${props.bold ? "font-black text-lg" : "font-black text-sm"} shrink-0 ${props.color}`}
			>
				{props.value}
			</p>
		</div>
	);
}
