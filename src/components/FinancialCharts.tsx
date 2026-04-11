import { createSignal, onMount, onCleanup, createEffect, Show } from "solid-js";
import { 
	Chart, 
	LineController, 
	LineElement, 
	PointElement, 
	LinearScale, 
	Title, 
	CategoryScale, 
	Tooltip, 
	Legend, 
	Filler,
	DoughnutController,
	ArcElement
} from "chart.js";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-solid";

// Register Chart.js components
Chart.register(
	LineController, 
	LineElement, 
	PointElement, 
	LinearScale, 
	Title, 
	CategoryScale, 
	Tooltip, 
	Legend, 
	Filler,
	DoughnutController,
	ArcElement
);

interface TrendPoint {
	label: string;
	omset: number;
	cogs: number;
}

interface PaymentPoint {
	method: string;
	total: number;
}

interface FinancialChartsProps {
	trendData: TrendPoint[];
	paymentData: PaymentPoint[];
}

export function FinancialCharts(props: FinancialChartsProps) {
	const [isExpanded, setIsExpanded] = createSignal(false);
	let trendCanvas: HTMLCanvasElement | undefined;
	let paymentCanvas: HTMLCanvasElement | undefined;
	let trendChart: Chart | undefined;
	let paymentChart: Chart | undefined;

	onMount(() => {
		if (isExpanded()) {
			initCharts();
		}
	});

	const initCharts = () => {
		if (isExpanded()) {
			// Small delay to ensure canvas is rendered
			setTimeout(() => {
				initTrendChart();
				initPaymentChart();
			}, 0);
		}
	};

	createEffect(() => {
		if (isExpanded()) {
			initCharts();
		} else {
			trendChart?.destroy();
			paymentChart?.destroy();
			trendChart = undefined;
			paymentChart = undefined;
		}
	});

	createEffect(() => {
		if (isExpanded() && trendChart && props.trendData) {
			trendChart.data.labels = props.trendData.map(d => d.label);
			trendChart.data.datasets[0].data = props.trendData.map(d => d.omset);
			trendChart.data.datasets[1].data = props.trendData.map(d => d.cogs);
			trendChart.update("none");
		}
	});

	createEffect(() => {
		if (isExpanded() && paymentChart && props.paymentData) {
			paymentChart.data.labels = props.paymentData.map(d => d.method);
			paymentChart.data.datasets[0].data = props.paymentData.map(d => d.total);
			paymentChart.update("none");
		}
	});

	onCleanup(() => {
		trendChart?.destroy();
		paymentChart?.destroy();
	});

	const initTrendChart = () => {
		if (!trendCanvas || trendChart) return;
		trendChart = new Chart(trendCanvas, {
			type: "line",
			data: {
				labels: props.trendData.map(d => d.label),
				datasets: [
					{
						label: "Omset",
						data: props.trendData.map(d => d.omset),
						borderColor: "rgb(79, 70, 229)", // indigo-600
						backgroundColor: "rgba(79, 70, 229, 0.1)",
						borderWidth: 3,
						fill: true,
						tension: 0.4,
						pointRadius: 0,
						pointHoverRadius: 6,
					},
					{
						label: "HPP",
						data: props.trendData.map(d => d.cogs),
						borderColor: "rgba(244, 63, 94, 0.5)", // rose-500 alpha
						backgroundColor: "transparent",
						borderWidth: 2,
						borderDash: [5, 5],
						tension: 0.4,
						pointRadius: 0,
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						mode: "index",
						intersect: false,
						backgroundColor: "rgba(15, 23, 42, 0.9)", // slate-900
						titleFont: { size: 10, weight: "bold" },
						bodyFont: { size: 12 },
						padding: 12,
						cornerRadius: 12,
					}
				},
				scales: {
					x: {
						grid: { display: false },
						ticks: { font: { size: 10, weight: "600" }, color: "#94a3b8" }
					},
					y: {
						grid: { color: "rgba(226, 232, 240, 0.5)" },
						ticks: { 
							font: { size: 10 }, 
							color: "#94a3b8",
							callback: (val) => "Rp" + (Number(val) / 1000).toLocaleString() + "k"
						}
					}
				}
			}
		});
	};

	const initPaymentChart = () => {
		if (!paymentCanvas || paymentChart) return;
		paymentChart = new Chart(paymentCanvas, {
			type: "doughnut",
			data: {
				labels: props.paymentData.map(d => d.method),
				datasets: [{
					data: props.paymentData.map(d => d.total),
					backgroundColor: [
						"rgb(79, 70, 229)", // indigo-600
						"rgb(16, 185, 129)", // emerald-500
						"rgb(245, 158, 11)", // amber-500
						"rgb(100, 116, 139)", // slate-500
					],
					borderWidth: 0,
					hoverOffset: 4
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: "75%",
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: "rgba(15, 23, 42, 0.9)",
						padding: 12,
						cornerRadius: 12,
						bodyFont: { size: 12, weight: "bold" },
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw as number;
                return `${ctx.label}: Rp ${val.toLocaleString("id-ID")}`;
              }
            }
					}
				}
			}
		});
	};

	return (
		<div class="flex flex-col gap-3 mb-6">
			{/* Toggle Header */}
			<button 
				onClick={() => setIsExpanded(!isExpanded())}
				class="flex items-center justify-between px-5 py-3 bg-card border border-border/60 rounded-2xl shadow-sm hover:bg-muted/30 transition-all active:scale-[0.99]"
			>
				<div class="flex items-center gap-3">
					<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
						<BarChart3 size={16} />
					</div>
					<div class="text-left">
						<h3 class="font-black text-xs uppercase tracking-widest text-foreground">Visualisasi Performa</h3>
						<p class="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Tren & Distribusi Keuangan</p>
					</div>
				</div>
				<div class="text-muted-foreground">
					{isExpanded() ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
				</div>
			</button>

			<Show when={isExpanded()}>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-200">
					{/* Trend Chart */}
					<div class="md:col-span-2 bg-card p-5 rounded-3xl border border-border/60 shadow-sm flex flex-col gap-4">
						<div class="flex items-center justify-between">
							<h3 class="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Tren Keuangan</h3>
							<div class="flex items-center gap-3">
								<div class="flex items-center gap-1.5">
									<div class="w-2 h-2 rounded-full bg-indigo-600" />
									<span class="text-[10px] font-bold text-muted-foreground">Omset</span>
								</div>
								<div class="flex items-center gap-1.5">
									<div class="w-2 h-2 rounded-full bg-rose-400 opacity-50" />
									<span class="text-[10px] font-bold text-muted-foreground">HPP</span>
								</div>
							</div>
						</div>
						<div class="h-[200px] w-full">
							<canvas ref={trendCanvas} />
						</div>
					</div>

					{/* Payment Chart */}
					<div class="bg-card p-5 rounded-3xl border border-border/60 shadow-sm flex flex-col gap-4">
						<h3 class="font-black text-[10px] uppercase tracking-widest text-muted-foreground">Metode Bayar</h3>
						<div class="relative h-[160px] w-full flex items-center justify-center">
							<canvas ref={paymentCanvas} />
							<div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
								<span class="text-[10px] font-black uppercase text-muted-foreground opacity-60">Total</span>
								<span class="text-xs font-black tracking-tight">
									{props.paymentData.length} Jenis
								</span>
							</div>
						</div>
						<div class="grid grid-cols-2 gap-2 mt-auto">
							{props.paymentData.slice(0, 4).map((d, i) => (
								<div class="flex items-center gap-2">
									<div class={`w-2 h-2 rounded-full`} style={{ "background-color": ["rgb(79, 70, 229)", "rgb(16, 185, 129)", "rgb(245, 158, 11)", "rgb(100, 116, 139)"][i] }} />
									<span class="text-[10px] font-bold text-muted-foreground truncate">{d.method}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</Show>
		</div>
	);
}
