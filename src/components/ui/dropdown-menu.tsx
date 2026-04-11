import { DropdownMenu as DropdownMenuPrimitive } from "@kobalte/core/dropdown-menu";
import { type Component, type ComponentProps, splitProps } from "solid-js";
import { cn } from "~/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export const DropdownMenuContent: Component<DropdownMenuPrimitive.DropdownMenuContentProps> = (props) => {
	const [local, others] = splitProps(props, ["class"]);
	return (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content
				class={cn(
					"z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
					local.class,
				)}
				{...others}
			/>
		</DropdownMenuPrimitive.Portal>
	);
};

export const DropdownMenuItem: Component<DropdownMenuPrimitive.DropdownMenuItemProps> = (props) => {
	const [local, others] = splitProps(props, ["class"]);
	return (
		<DropdownMenuPrimitive.Item
			class={cn(
				"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				local.class,
			)}
			{...others}
		/>
	);
};
