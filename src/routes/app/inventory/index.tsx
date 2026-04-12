import { A } from "@solidjs/router";
import { Package, Tags, LayoutGrid, Package2 } from "lucide-solid";

interface MenuItem {
	href: string;
	icon: any;
	iconBg: string;
	iconColor: string;
	title: string;
	subtitle: string;
}

const INVENTORY_ITEMS: MenuItem[] = [
	{
		href: "/app/inventory/materials",
		icon: Package2,
		iconBg: "bg-emerald-100",
		iconColor: "text-emerald-600",
		title: "Bahan Baku (Resep)",
		subtitle: "Atur semua bahan baku",
	},
	{
		href: "/app/inventory/variations",
		icon: LayoutGrid,
		iconBg: "bg-indigo-100",
		iconColor: "text-indigo-600",
		title: "Daftar Variasi",
		subtitle: "Toping, Level & Modifiers",
	},
	{
		href: "/app/inventory/products",
		icon: Package,
		iconBg: "bg-blue-100",
		iconColor: "text-blue-600",
		title: "Katalog Produk",
		subtitle: "Atur menu & harga jual",
	},
	{
		href: "/app/inventory/categories",
		icon: Tags,
		iconBg: "bg-violet-100",
		iconColor: "text-violet-600",
		title: "Manajemen Kategori",
		subtitle: "Atur kategori produk",
	},
];

export default function InventoryHub() {
	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-24">
			<div class="px-5 pt-6 pb-5 border-b border-border/40 bg-background sticky top-0 z-10 backdrop-blur-xl">
				<h1 class="font-black text-2xl tracking-tighter leading-none text-primary">
					Persediaan
				</h1>
				<p class="text-xs font-black text-muted-foreground uppercase tracking-[0.12em] mt-1.5">
					Manajemen Produk & Kategori
				</p>
			</div>

			<div class="p-5 flex flex-col gap-3">
				{INVENTORY_ITEMS.map((item) => {
					const Icon = item.icon;
					return (
						<A href={item.href} class="block">
							<div class="flex items-center gap-4 bg-background p-4 rounded-3xl border border-border/70 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/10 active:scale-[0.98]">
								<div
									class={`w-12 h-12 rounded-2xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shadow-inner shrink-0`}
								>
									<Icon size={22} stroke-width={2.5} />
								</div>
								<div class="flex-1 min-w-0 text-left">
									<h3 class="font-black text-base tracking-tight">
										{item.title}
									</h3>
									<p class="text-sm font-semibold text-muted-foreground mt-0.5">
										{item.subtitle}
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
							</div>
						</A>
					);
				})}
			</div>
		</div>
	);
}
