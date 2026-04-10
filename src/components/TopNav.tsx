import { createSignal, onMount, onCleanup } from "solid-js";
import { A } from "@solidjs/router";

export function TopNav() {
  const [isOffline, setIsOffline] = createSignal(false);

  onMount(() => {
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    globalThis.addEventListener("online", handleOnline);
    globalThis.addEventListener("offline", handleOffline);
    onCleanup(() => {
      globalThis.removeEventListener("online", handleOnline);
      globalThis.removeEventListener("offline", handleOffline);
    });
  });

  return (
    <header class="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
      {isOffline() && (
        <div class="px-4 py-1 bg-orange-500 text-white text-xs font-semibold text-center w-full shadow-sm">
          Menjalankan Mode Offline
        </div>
      )}
      <div class="container flex h-14 items-center px-4 max-w-lg mx-auto">
        <div class="flex items-center space-x-2 w-full justify-between">
          <A href="/app" class="flex items-center gap-2 active:scale-95 transition-all">
            <img src="/logo_wordmark.png" alt="Ngepos" class="h-8 object-contain" />
          </A>
          <div class="flex items-center gap-2">
            <A href="/app/profile" class="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary shadow-sm border border-primary/20 active:scale-90 transition-all">
              RP
            </A>
          </div>
        </div>
      </div>
    </header>
  );
}
