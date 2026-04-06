import { createSignal, onMount, onCleanup } from "solid-js";
import { Store } from "lucide-solid";

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
    <header class="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {isOffline() && (
        <div class="px-4 py-1 bg-orange-500 text-white text-xs font-semibold text-center w-full shadow-sm">
          Menjalankan Mode Offline
        </div>
      )}
      <div class="container flex h-14 items-center px-4 max-w-lg mx-auto">
        <div class="flex items-center space-x-2 w-full justify-between">
          <div class="flex items-center gap-2">
            <div class="p-1.5 bg-primary text-primary-foreground rounded-lg shadow-sm">
              <Store size={20} />
            </div>
            <span class="font-bold text-lg tracking-tight">Ngepos</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shadow-sm border">
              M
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
