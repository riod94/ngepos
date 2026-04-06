import { createSignal, JSX, Show } from "solid-js";
import { Trash2 } from "lucide-solid";

interface SwipeableProps {
	children: JSX.Element;
	onDelete: () => void;
	disabled?: boolean;
}

export function Swipeable(props: SwipeableProps) {
	const [startX, setStartX] = createSignal(0);
	const [currentX, setCurrentX] = createSignal(0);
	const [isSwiping, setIsSwiping] = createSignal(false);
	const [isOpen, setIsOpen] = createSignal(false);

	const threshold = 80; // revealing the button at this offset

	const handleStart = (e: PointerEvent) => {
		if (props.disabled) return;
		setStartX(e.clientX);
		setIsSwiping(true);
	};

	const handleMove = (e: PointerEvent) => {
		if (!isSwiping()) return;
		const diff = e.clientX - startX();
		
		// We only care about swiping LEFT (negative diff)
		// If already open, diff is from the -threshold position
		const base = isOpen() ? -threshold : 0;
		const nextX = Math.min(0, Math.max(-threshold * 1.5, base + diff));
		setCurrentX(nextX);
	};

	const handleEnd = () => {
		if (!isSwiping()) return;
		setIsSwiping(false);

		// If swiped more than half of threshold, snap to open
		if (currentX() < -threshold / 2) {
			setCurrentX(-threshold);
			setIsOpen(true);
		} else {
			setCurrentX(0);
			setIsOpen(false);
		}
	};

	return (
		<div 
			class="relative overflow-hidden rounded-2xl touch-pan-y shadow-sm"
			onPointerDown={handleStart}
			onPointerMove={handleMove}
			onPointerUp={handleEnd}
			onPointerLeave={handleEnd}
		>
			{/* Action Background */}
			<div 
				class="absolute inset-0 bg-red-500 flex items-center justify-end px-6 transition-opacity duration-200"
				style={{ opacity: Math.abs(currentX()) / threshold }}
			>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						props.onDelete();
						setCurrentX(0);
						setIsOpen(false);
					}}
					class="w-12 h-12 rounded-xl flex items-center justify-center text-white active:scale-90 transition-transform"
				>
					<Trash2 size={24} stroke-width={2.5} />
				</button>
			</div>

			{/* Foreground Content */}
			<div
				class="relative z-10 transition-transform duration-200 ease-out"
				style={{ 
					transform: `translateX(${currentX()}px)`,
				}}
			>
				{props.children}
			</div>
		</div>
	);
}
