import { createSignal, Show, For } from "solid-js";
import { Calendar, ChevronRight, X } from "lucide-solid";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";

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
	const [tempFrom, setTempFrom] = createSignal(
		new Date().toISOString().split("T")[0],
	);
	const [tempTo, setTempTo] = createSignal(
		new Date().toISOString().split("T")[0],
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
		const fromDate = new Date(`${tempFrom()}T00:00:00`).getTime();
		const toDate = new Date(`${tempTo()}T23:59:59.999`).getTime();
		props.onFilterChange("CUSTOM", { from: fromDate, to: toDate });
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
						<Calendar size={14} stroke-width={2.5} />
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
					class="h-auto rounded-t-[32px] p-0 border-none shadow-[0_-20px_50px_rgba(0,0,0,0.15)] bg-background"
				>
					<SheetHeader class="px-6 pt-6 pb-4 border-b border-border/50">
						<SheetTitle class="font-black text-xl tracking-tight text-left">
							Pilih Rentang Tanggal
						</SheetTitle>
					</SheetHeader>
					<div class="p-6 flex flex-col gap-5">
						<div class="grid grid-cols-2 gap-4">
							<div class="flex flex-col gap-2">
								<label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
									Mulai Dari
								</label>
								<input
									type="date"
									class="h-14 w-full rounded-2xl border-2 border-border/70 bg-muted/20 px-4 font-black text-sm focus:outline-none focus:border-primary/50 transition-all"
									value={tempFrom()}
									onInput={(e) => setTempFrom(e.currentTarget.value)}
								/>
							</div>
							<div class="flex flex-col gap-2">
								<label class="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
									Sampai Dengan
								</label>
								<input
									type="date"
									class="h-14 w-full rounded-2xl border-2 border-border/70 bg-muted/20 px-4 font-black text-sm focus:outline-none focus:border-primary/50 transition-all"
									value={tempTo()}
									onInput={(e) => setTempTo(e.currentTarget.value)}
								/>
							</div>
						</div>

						<Button
							class="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-between px-6"
							onClick={applyCustomRange}
						>
							<span>Terapkan Filter</span>
							<ChevronRight size={20} stroke-width={3} />
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
