import { createSignal, Show, For, createMemo } from "solid-js";
import { Calendar as CalendarIcon, ChevronRight, X, ArrowRight } from "lucide-solid";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Calendar } from "~/components/ui/calendar";

export type DateFilterType = "HARI_INI" | "BULAN_INI" | "CUSTOM" | "SEMUA";

export interface DateRange {
	from: number;
	to: number;
}

interface DateFilterProps {
	activeFilter: DateFilterType;
	onFilterChange: (filter: DateFilterType, range?: DateRange) => void;
	customRange?: DateRange;
}

export function DateFilter(props: DateFilterProps) {
	const [isSheetOpen, setIsSheetOpen] = createSignal(false);
	const [isCalendarOpen, setIsCalendarOpen] = createSignal(false);
	const [pickingMode, setPickingMode] = createSignal<"FROM" | "TO">("FROM");
	
	const [tempFrom, setTempFrom] = createSignal(
		props.customRange?.from || new Date().setHours(0, 0, 0, 0),
	);
	const [tempTo, setTempTo] = createSignal(
		props.customRange?.to || new Date().setHours(23, 59, 59, 999),
	);

	const FILTERS: { key: DateFilterType; label: string }[] = [
		{ key: "HARI_INI", label: "Hari Ini" },
		{ key: "BULAN_INI", label: "Bulan Ini" },
		{ key: "CUSTOM", label: "Custom" },
		{ key: "SEMUA", label: "Semua" },
	];

	const handleFilterClick = (key: DateFilterType) => {
		if (key === "CUSTOM") {
			setIsSheetOpen(true);
		} else {
			props.onFilterChange(key);
		}
	};

	const applyCustomRange = () => {
		props.onFilterChange("CUSTOM", { from: tempFrom(), to: tempTo() });
		setIsSheetOpen(false);
	};

	const getRangeLabel = () => {
		if (props.activeFilter !== "CUSTOM" || !props.customRange) return null;
		const f = new Date(props.customRange.from).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
		});
		const t = new Date(props.customRange.to).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
		});
		return `${f} - ${t}`;
	};

	const formatDateShort = (ts: number) => {
		return new Date(ts).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "short",
		});
	};

	const setQuickRange = (days: number) => {
		const end = new Date();
		end.setHours(23, 59, 59, 999);
		const start = new Date();
		start.setDate(start.getDate() - days);
		start.setHours(0, 0, 0, 0);
		setTempFrom(start.getTime());
		setTempTo(end.getTime());
	};

	const openPicker = (mode: "FROM" | "TO") => {
		setPickingMode(mode);
		setIsCalendarOpen(true);
	};

	return (
		<div class="flex flex-col gap-3">
			<div class="flex gap-2 p-1 bg-muted/40 rounded-2xl border border-border/40">
				<For each={FILTERS}>
					{(f) => (
						<button
							type="button"
							onClick={() => handleFilterClick(f.key)}
							class={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
								props.activeFilter === f.key
									? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
									: "text-muted-foreground hover:bg-muted/80"
							}`}
						>
							{f.label}
						</button>
					)}
				</For>
			</div>

			<Show when={getRangeLabel()}>
				<div class="flex items-center justify-between px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-1">
					<div class="flex items-center gap-2 text-primary">
						<CalendarIcon size={14} stroke-width={2.5} />
						<span class="text-[10px] font-black uppercase tracking-widest leading-none">
							{getRangeLabel()}
						</span>
					</div>
					<button 
            onClick={() => props.onFilterChange("SEMUA")}
            class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary/10 text-primary transition-colors"
          >
						<X size={14} stroke-width={3} />
					</button>
				</div>
			</Show>

			<Sheet open={isSheetOpen()} onOpenChange={setIsSheetOpen}>
				<SheetContent
					position="bottom"
					class="h-auto rounded-t-[32px] p-0 border-none shadow-[0_-20px_80px_rgba(0,0,0,0.15)] bg-background max-h-[80vh]"
				>
					<div class="w-10 h-1 bg-border rounded-full mx-auto mt-3 opacity-30" />
					
					<div class="p-6 flex flex-col gap-6">
						<div class="flex items-center justify-between">
							<SheetTitle class="font-black text-xl tracking-tighter text-left">
								Custom Range
							</SheetTitle>
							<div class="flex gap-1.5">
								<button 
									onClick={() => setQuickRange(7)}
									class="px-2.5 py-1.5 rounded-full bg-muted/60 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
								>
									7 Hari
								</button>
								<button 
									onClick={() => setQuickRange(14)}
									class="px-2.5 py-1.5 rounded-full bg-muted/60 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
								>
									14 Hari
								</button>
								<button 
									onClick={() => setQuickRange(30)}
									class="px-2.5 py-1.5 rounded-full bg-muted/60 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
								>
									30 Hari
								</button>
							</div>
						</div>

						{/* Selector Cards */}
						<div class="flex items-center gap-3">
							<button
								onClick={() => openPicker("FROM")}
								class="flex-1 flex flex-col items-center py-4 rounded-[24px] bg-muted/30 border border-border/40 hover:border-primary/50 transition-all active:scale-95"
							>
								<span class="text-[9px] font-black uppercase tracking-widest mb-1 text-primary/60">Mulai</span>
								<span class="text-sm font-black tracking-tight">{formatDateShort(tempFrom())}</span>
							</button>

							<div class="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0 overflow-hidden">
								<ArrowRight size={14} stroke-width={3} />
							</div>

							<button
								onClick={() => openPicker("TO")}
								class="flex-1 flex flex-col items-center py-4 rounded-[24px] bg-muted/30 border border-border/40 hover:border-primary/50 transition-all active:scale-95"
							>
								<span class="text-[9px] font-black uppercase tracking-widest mb-1 text-primary/60">Sampai</span>
								<span class="text-sm font-black tracking-tight">{formatDateShort(tempTo())}</span>
							</button>
						</div>

						<div class="flex flex-col gap-3 mt-2">
							<Button
								class="w-full h-12 rounded-[22px] font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
								onClick={applyCustomRange}
							>
								Terapkan Filter
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{/* Modal Calendar */}
			<Dialog open={isCalendarOpen()} onOpenChange={setIsCalendarOpen}>
				<DialogContent class="max-w-[360px] p-6 rounded-[32px]">
					<DialogHeader class="mb-2">
						<DialogTitle class="text-[10px] font-black uppercase tracking-widest text-primary">
							Pilih Tanggal {pickingMode() === "FROM" ? "Mulai" : "Selesai"}
						</DialogTitle>
					</DialogHeader>
					
					<Calendar 
						value={pickingMode() === "FROM" ? tempFrom() : tempTo()}
						from={tempFrom()}
						to={tempTo()}
						onChange={(ts) => {
							if (pickingMode() === "FROM") {
								const d = new Date(ts);
								d.setHours(0, 0, 0, 0);
								setTempFrom(d.getTime());
								if (tempTo() < d.getTime()) {
									const nextDay = new Date(d);
									nextDay.setHours(23, 59, 59, 999);
									setTempTo(nextDay.getTime());
								}
							} else {
								const d = new Date(ts);
								d.setHours(23, 59, 59, 999);
								if (d.getTime() < tempFrom()) {
									const prevDay = new Date(d);
									prevDay.setHours(0, 0, 0, 0);
									setTempFrom(prevDay.getTime());
								} else {
									setTempTo(d.getTime());
								}
							}
							// ALWAYS HIDE AGAIN AFTER SELECT
							setIsCalendarOpen(false);
						}}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}
