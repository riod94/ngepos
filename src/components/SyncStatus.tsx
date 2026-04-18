import { createSignal, createEffect, Show, onMount, onCleanup } from "solid-js";
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from "lucide-solid";

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

interface SyncStatusIndicatorProps {
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function SyncStatusIndicator(props: SyncStatusIndicatorProps) {
  const [status, setStatus] = createSignal<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = createSignal<number | null>(null);
  const [retryCount, setRetryCount] = createSignal(0);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const labelSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  onMount(() => {
    if (typeof window !== "undefined") {
      setStatus(navigator.onLine ? "idle" : "offline");

      const handleOnline = () => {
        if (status() === "offline") {
          setStatus("idle");
        }
      };
      const handleOffline = () => setStatus("offline");

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      onCleanup(() => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      });
    }
  });

  const getStatusIcon = () => {
    switch (status()) {
      case "syncing":
        return RefreshCw;
      case "synced":
        return Check;
      case "error":
        return AlertCircle;
      case "offline":
        return CloudOff;
      default:
        return Cloud;
    }
  };

  const getStatusText = () => {
    switch (status()) {
      case "syncing":
        return retryCount() > 0 ? `Sinkronisasi (${retryCount()}/5)` : "Sinkronisasi...";
      case "synced":
        return "Tersinkronisasi";
      case "error":
        return "Sinkronisasi Gagal";
      case "offline":
        return "Offline";
      default:
        return "Sinkronkan";
    }
  };

  const getStatusColor = () => {
    switch (status()) {
      case "syncing":
        return "text-blue-500";
      case "synced":
        return "text-green-500";
      case "error":
        return "text-red-500";
      case "offline":
        return "text-orange-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusBgColor = () => {
    switch (status()) {
      case "syncing":
        return "bg-blue-50";
      case "synced":
        return "bg-green-50";
      case "error":
        return "bg-red-50";
      case "offline":
        return "bg-orange-50";
      default:
        return "bg-muted/50";
    }
  };

  const formatLastSyncTime = () => {
    const time = lastSyncTime();
    if (time === null) return "Belum pernah sinkronisasi";
    return `Terakhir sinkronisasi: ${new Date(time).toLocaleTimeString("id-ID")}`;
  };

  return (
    <div
      class={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${getStatusBgColor()} ${props.showLabel ? "pr-4" : ""}`}
      title={formatLastSyncTime()}
    >
      <div class={`relative ${status() === "syncing" ? "animate-spin" : ""}`}>
        {(() => {
          const Icon = getStatusIcon();
          return <Icon class={`${sizeClasses[props.size || "md"]} ${getStatusColor()}`} />;
        })()}
      </div>
      <Show when={props.showLabel}>
        <span class={`font-semibold ${labelSizeClasses[props.size || "md"]} ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </Show>
    </div>
  );
}

export function SyncProgressBar() {
  const [progress, setProgress] = createSignal(0);
  const [isActive, setIsActive] = createSignal(false);

  onMount(() => {
    const interval = setInterval(() => {
      if (isActive() && progress() < 90) {
        setProgress((p) => Math.min(p + Math.random() * 10, 90));
      }
    }, 500);

    onCleanup(() => clearInterval(interval));
  });

  createEffect(() => {
    const currentStatus = status();
    if (currentStatus === "syncing") {
      setIsActive(true);
      setProgress(0);
    } else if (currentStatus === "synced") {
      setProgress(100);
      setTimeout(() => setIsActive(false), 1000);
    } else if (currentStatus === "error" || currentStatus === "offline") {
      setIsActive(false);
    }
  });

  return (
    <Show when={isActive()}>
      <div class="h-1 w-full bg-muted/30 overflow-hidden">
        <div
          class="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress()}%` }}
        />
      </div>
    </Show>
  );
}

export function SyncBadge() {
  return <SyncStatusIndicator showLabel={false} size="sm" />;
}

export function SyncStatusWithLabel() {
  return <SyncStatusIndicator showLabel={true} size="sm" />;
}

let globalStatus: SyncStatus = "idle";
let statusListeners: Set<(status: SyncStatus) => void> = new Set();

export function getSyncStatus(): SyncStatus {
  return globalStatus;
}

export function setSyncStatus(newStatus: SyncStatus): void {
  globalStatus = newStatus;
  statusListeners.forEach((listener) => listener(newStatus));
}

export function onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function status(): SyncStatus {
  return globalStatus;
}
