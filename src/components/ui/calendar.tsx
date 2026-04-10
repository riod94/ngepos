import { createSignal, createMemo, For, Show, createEffect, on } from "solid-js";
import { ChevronLeft, ChevronRight } from "lucide-solid";
import { cn } from "~/lib/utils";

interface CalendarProps {
	value?: number; // active picking value
	from?: number; // range start
	to?: number; // range end
	onChange: (timestamp: number) => void;
	class?: string;
}

export function Calendar(props: CalendarProps) {
	const [viewDate, setViewDate] = createSignal(new Date(props.value || props.from || Date.now()));

	createEffect(on(() => props.value || props.from, (target) => {
		if (target) {
			const d = new Date(target);
			const current = viewDate();
			if (d.getMonth() !== current.getMonth() || d.getFullYear() !== current.getFullYear()) {
				setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
			}
		}
	}, { defer: true }));

	const days = createMemo(() => {
		const v = viewDate();
		const y = v.getFullYear();
		const m = v.getMonth();
		
		const firstDay = new Date(y, m, 1).getDay();
		const totalDays = new Date(y, m + 1, 0).getDate();
		
		const arr: ({ id: string; day: number | null })[] = [];
		// Padding days
		for (let i = 0; i < firstDay; i++) {
			arr.push({ id: `pad-${y}-${m}-${i}`, day: null });
		}
		// Active days
		for (let i = 1; i <= totalDays; i++) {
			arr.push({ id: `day-${y}-${m}-${i}`, day: i });
		}
		return arr;
	});

	const handleDayClick = (day: number) => {
		const d = new Date(viewDate());
		d.setDate(day);
		props.onChange(d.getTime());
	};

	const checkState = (day: number) => {
		const v = viewDate();
		const y = v.getFullYear();
		const m = v.getMonth();
		
		const dayDate = new Date(y, m, day);
		const currentTs = dayDate.getTime();
		
		const startDate = props.from ? new Date(props.from) : null;
		const endDate = props.to ? new Date(props.to) : null;
		const pickedDate = props.value ? new Date(props.value) : null;

		const isStart = startDate ? (
			startDate.getDate() === day && 
			startDate.getMonth() === m && 
			startDate.getFullYear() === y
		) : false;

		const isEnd = endDate ? (
			endDate.getDate() === day && 
			endDate.getMonth() === m && 
			endDate.getFullYear() === y
		) : false;

		const isPicking = pickedDate ? (
			pickedDate.getDate() === day && 
			pickedDate.getMonth() === m && 
			pickedDate.getFullYear() === y
		) : false;
		
		const startTs = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime() : null;
		const endTs = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime() : null;
		const isBetween = startTs && endTs && currentTs > startTs && currentTs < endTs;

		const today = new Date();
		const isToday = today.getDate() === day && today.getMonth() === m && today.getFullYear() === y;

		return { isStart, isEnd, isBetween, isPicking, isToday };
	};

	const changeMonth = (offset: number) => {
		const d = new Date(viewDate());
		d.setMonth(d.getMonth() + offset);
		setViewDate(d);
	};

	return (
		<div class={cn("bg-transparent w-full select-none", props.class)}>
			<div class="flex items-center justify-between mb-6">
				<div class="flex flex-col">
					<h4 class="font-black text-xl tracking-tighter text-foreground leading-none">
						{viewDate().toLocaleDateString("id-ID", { month: "long" })}
					</h4>
					<span class="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
						{viewDate().getFullYear()}
					</span>
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						onClick={() => changeMonth(-1)}
						class="w-10 h-10 flex items-center justify-center rounded-2xl bg-muted/30 hover:bg-muted transition-all active:scale-90"
					>
						<ChevronLeft size={20} stroke-width={3} />
					</button>
					<button
						type="button"
						onClick={() => changeMonth(1)}
						class="w-10 h-10 flex items-center justify-center rounded-2xl bg-muted/30 hover:bg-muted transition-all active:scale-90"
					>
						<ChevronRight size={20} stroke-width={3} />
					</button>
				</div>
			</div>

			<div class="grid grid-cols-7 mb-2">
				<For each={["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"]}>
					{(day) => (
						<div class="h-8 flex items-center justify-center text-[10px] font-black text-muted-foreground/30">
							{day}
						</div>
					)}
				</For>
			</div>

			<div class="grid grid-cols-7 gap-y-1">
				<For each={days()}>
					{(item) => {
						if (item.day === null) return <div class="aspect-square" />;
						const day = item.day;
						const { isStart, isEnd, isBetween, isPicking, isToday } = checkState(day);
						
						return (
							<div class="aspect-square relative flex items-center justify-center">
								<Show when={isBetween}>
									<div class="absolute inset-x-0 inset-y-1 bg-primary/10" />
								</Show>
								<Show when={isStart && props.to && props.from !== props.to}>
									<div class="absolute inset-y-1 right-0 left-1/2 bg-primary/10" />
								</Show>
								<Show when={isEnd && props.from && props.from !== props.to}>
									<div class="absolute inset-y-1 left-0 right-1/2 bg-primary/10" />
								</Show>

								<button
									type="button"
									onClick={() => handleDayClick(day)}
									class={cn(
										"relative z-10 w-10 h-10 flex items-center justify-center text-sm font-black transition-all rounded-full",
										(isStart || isEnd) 
											? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
											: isPicking
												? "bg-primary/20 text-primary border-2 border-primary"
												: isBetween
													? "text-primary font-bold"
													: "text-foreground/80 hover:bg-muted"
									)}
								>
									{day}
									<Show when={isToday && !isStart && !isEnd && !isPicking}>
										<div class="absolute bottom-1 w-1.5 h-1.5 bg-primary rounded-full shadow-sm" />
									</Show>
								</button>
							</div>
						);
					}}
				</For>
			</div>
		</div>
	);
}
