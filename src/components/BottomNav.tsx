import { A, useLocation } from "@solidjs/router";
import { Store, History, Receipt, ChartBar, Settings } from "lucide-solid";

const TABS = [
  { name: "Kasir",      href: "/app",             icon: Store,    exact: true  },
  { name: "Riwayat",    href: "/app/history",     icon: History,  exact: false },
  { name: "Pengeluaran", href: "/app/expenses",    icon: Receipt,  exact: false },
  { name: "Laporan",    href: "/app/reports",     icon: ChartBar, exact: false },
  { name: "Setelan",    href: "/app/settings",    icon: Settings, exact: false },
] as const;

export function BottomNav() {
  const location = useLocation();

  const isActive = (href: string, exact: boolean) =>
    exact
      ? location.pathname === href || location.pathname === href + "/"
      : location.pathname.startsWith(href);

  return (
    <nav class="fixed bottom-0 w-full bg-background/90 backdrop-blur-xl border-t border-border/60 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
      <div class="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {TABS.map((tab) => {
          const active = () => isActive(tab.href, tab.exact);
          const Icon = tab.icon;
          return (
            <A
              href={tab.href}
              class={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all outline-none ${
                active() ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div class={`p-1.5 rounded-xl transition-all duration-200 ${active() ? "bg-primary/10 scale-110" : ""}`}>
                <Icon size={20} stroke-width={active() ? 2.5 : 1.8} />
              </div>
              <span class={`text-[8px] sm:text-[9px] uppercase tracking-widest leading-none ${active() ? "font-black" : "font-bold"}`}>
                {tab.name}
              </span>
            </A>
          );
        })}
      </div>
    </nav>
  );
}
