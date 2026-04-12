import { A, useLocation } from "@solidjs/router";
import { Store, Package, Megaphone, ChartBar, Settings } from "lucide-solid";
import { useAuth } from "~/stores/auth";
import { For } from "solid-js";

interface TabItem {
	name: string;
	href: string;
	icon: any;
	exact: boolean;
	permission?: string;
}

const TABS: TabItem[] = [
	{ name: "Kasir", href: "/app", icon: Store, exact: true, permission: "POS_ACCESS" },
	{ name: "Produk", href: "/app/inventory", icon: Package, exact: false, permission: "MANAGE_PRODUCTS" },
	{ name: "Promo", href: "/app/marketing", icon: Megaphone, exact: false, permission: "MANAGE_PAYMENTS" },
	{ name: "Laporan", href: "/app/reports", icon: ChartBar, exact: false, permission: "VIEW_REPORTS" },
	{ name: "Setelan", href: "/app/settings", icon: Settings, exact: false, permission: "MANAGE_STAFF" },
];

export function BottomNav() {
	const location = useLocation();
	const { hasPermission } = useAuth();

	const isActive = (href: string, exact: boolean) =>
		exact
			? location.pathname === href || location.pathname === href + "/"
			: location.pathname.startsWith(href);

	return (
		<nav class="fixed bottom-0 w-full bg-background/90 backdrop-blur-xl border-t border-border/60 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] print:hidden">
			<div class="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
				<For each={TABS.filter(tab => !tab.permission || hasPermission(tab.permission))}>
					{(tab) => {
						const active = () => isActive(tab.href, tab.exact);
						const Icon = tab.icon;
						return (
							<A
								href={tab.href}
								class={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all outline-none ${
									active()
										? "text-primary"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								<div
									class={`p-1.5 rounded-xl transition-all duration-200 ${active() ? "bg-primary/10 scale-110" : ""}`}
								>
									<Icon size={20} stroke-width={active() ? 2.5 : 1.8} />
								</div>
								<span
									class={`text-[10px] uppercase tracking-widest leading-none ${active() ? "font-black" : "font-bold"}`}
								>
									{tab.name}
								</span>
							</A>
						);
					}}
				</For>
			</div>
		</nav>
	);
}
