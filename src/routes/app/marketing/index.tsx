import { JSX } from "solid-js";
import { A } from "@solidjs/router";
import {
	Users,
	Megaphone,
	Trophy,
	IdCard,
} from "lucide-solid";

interface MenuItem {
	href: string;
	icon: any;
	iconBg: string;
	iconColor: string;
	title: string;
	subtitle: string;
	badge?: string;
}

const MARKETING_ITEMS: MenuItem[] = [
	{
		href: "/app/marketing/members",
		icon: Users,
		iconBg: "bg-emerald-100",
		iconColor: "text-emerald-600",
		title: "Members & QR Code",
		subtitle: "Daftar pelanggan & database member",
	},
	{
		href: "/app/marketing/loyalty",
		icon: Trophy,
		iconBg: "bg-amber-100",
		iconColor: "text-amber-600",
		title: "Program Loyalty",
		subtitle: "Atur target stamp & hadiah member",
	},
	{
		href: "/app/marketing/campaigns",
		icon: Megaphone,
		iconBg: "bg-pink-100",
		iconColor: "text-pink-600",
		title: "Kampanye & Promosi",
		subtitle: "Atur bundling, diskon & event khusus",
	},
];

export default function MarketingHub() {
	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-24">
			<div class="px-5 pt-6 pb-5 border-b border-border/40 bg-background sticky top-0 z-10 backdrop-blur-xl">
				<h1 class="font-black text-2xl tracking-tighter leading-none text-primary">
					Pemasaran
				</h1>
				<p class="text-xs font-black text-muted-foreground uppercase tracking-[0.12em] mt-1.5">
					Kelola Pelanggan & Promosi Toko
				</p>
			</div>

			<div class="p-5 flex flex-col gap-3">
				{MARKETING_ITEMS.map((item) => {
					const Icon = item.icon;
					return (
						<A href={item.href} class="block">
							<div
								class="flex items-center gap-4 bg-background p-4 rounded-3xl border border-border/70 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/10 active:scale-[0.98]"
							>
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
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
								</div>
							</div>
						</A>
					);
				})}
			</div>

            <div class="px-5 py-4">
                <div class="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
                    <div class="absolute -right-4 -bottom-4 opacity-10">
                        <Megaphone size={120} />
                    </div>
                    <h4 class="font-black text-lg leading-tight mb-1">Butuh Bantuan?</h4>
                    <p class="text-sm font-medium opacity-90 leading-relaxed mb-4">
                        Maksimalkan fitur pemasaran untuk meningkatkan retensi pelanggan di outlet Anda.
                    </p>
                    <A 
                        href="/app/marketing/members"
                        class="bg-white text-primary px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest active:scale-95 transition-all text-center inline-block"
                    >
                        Mulai Sekarang
                    </A>
                </div>
            </div>
		</div>
	);
}
