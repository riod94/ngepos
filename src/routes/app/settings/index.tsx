import { JSX } from "solid-js";
import { A } from "@solidjs/router";
import {
	Package,
	Users,
	Database,
	Tags,
	QrCode,
	Store,
	ShieldCheck,
} from "lucide-solid";
// ─── Main Component ───────────────────────────────────────────────────────────

interface MenuItem {
	href: string;
	icon: any;
	iconBg: string;
	iconColor: string;
	title: string;
	subtitle: string;
	disabled?: boolean;
	badge?: string;
	customLink?: JSX.Element;
}

const MENU_ITEMS: MenuItem[] = [
	{
		href: "/app/settings/outlet",
		icon: Store,
		iconBg: "bg-orange-100",
		iconColor: "text-orange-600",
		title: "Informasi Outlet",
		subtitle: "Profil & kustomisasi identitas toko",
	},
	{
		href: "/app/products",
		icon: Package,
		iconBg: "bg-blue-100",
		iconColor: "text-blue-600",
		title: "Katalog Produk",
		subtitle: "Atur menu, stok, HPP & varian",
	},
	{
		href: "/app/categories",
		icon: Tags,
		iconBg: "bg-violet-100",
		iconColor: "text-violet-600",
		title: "Manajemen Kategori",
		subtitle: "Tambah & atur kategori produk",
	},
	{
		href: "/app/settings/payment",
		icon: QrCode,
		iconBg: "bg-emerald-100",
		iconColor: "text-emerald-600",
		title: "Metode Pembayaran",
		subtitle: "QRIS & Pesanan Online",
	},
	{
		href: "/app/settings/staff",
		icon: Users,
		iconBg: "bg-indigo-100",
		iconColor: "text-indigo-600",
		title: "Manajemen Staff",
		subtitle: "Kelola data & jabatan karyawan",
	},
	{
		href: "/app/settings/roles",
		icon: ShieldCheck,
		iconBg: "bg-violet-100",
		iconColor: "text-violet-600",
		title: "Hak Akses & Peran",
		subtitle: "Atur izin & peran staff dinamis",
	},
	{
		href: "#",
		icon: Database,
		iconBg: "bg-teal-100",
		iconColor: "text-teal-600",
		title: "Sinkronisasi Cloud",
		subtitle: "Backup & sync data ke server",
		disabled: true,
		badge: "Segera Hadir",
	},
];

export default function SettingsPage() {
	return (
		<div class="flex flex-col min-h-screen bg-muted/10 pb-24">
			<div class="px-5 pt-6 pb-5 border-b border-border/40 bg-background sticky top-0 z-10 backdrop-blur-xl">
				<h1 class="font-black text-2xl tracking-tighter leading-none">
					Pengaturan
				</h1>
				<p class="text-xs font-black text-muted-foreground uppercase tracking-[0.12em] mt-1.5">
					Konfigurasi & Manajemen Sistem
				</p>
			</div>

			<div class="p-5 flex flex-col gap-3">
				{/* Menu Items */}
				{MENU_ITEMS.map((item) => {
					const Icon = item.icon;
					const inner = (
						<div
							class={`flex items-center gap-4 bg-background p-4 rounded-2xl border shadow-sm transition-all ${
								item.disabled
									? "border-border/50 opacity-50 cursor-not-allowed"
									: "border-border/70 hover:border-primary/30 hover:bg-muted/20 active:scale-[0.98]"
							}`}
						>
							<div
								class={`w-12 h-12 rounded-2xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shadow-inner shrink-0`}
							>
								<Icon size={22} stroke-width={2} />
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="font-black text-base tracking-tight">
									{item.title}
								</h3>
								<p class="text-sm font-semibold text-muted-foreground mt-0.5">
									{item.subtitle}
								</p>
							</div>
							{item.badge && (
								<span class="text-xs font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-lg whitespace-nowrap">
									{item.badge}
								</span>
							)}
						</div>
					);
					if (item.disabled) return <div>{inner}</div>;
					return <A href={item.href}>{inner}</A>;
				})}
			</div>

			<div class="mt-auto px-5 pb-6 text-center">
				<p class="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
					Ngepos POS · v0.3.0-alpha
				</p>
			</div>
		</div>
	);
}
