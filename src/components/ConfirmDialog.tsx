import { createSignal, Show, type JSX } from "solid-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { AlertTriangle, Trash2, Info } from "lucide-solid";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfirmVariant = "danger" | "info" | "warning";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string | JSX.Element;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConfirm: () => any;
  loading?: boolean;
}

// ─── ConfirmDialog Component ──────────────────────────────────────────────────

export function ConfirmDialog(props: ConfirmDialogProps) {
  const variant = () => props.variant ?? "danger";

  const iconConfig = () => ({
    danger: {
      icon: <Trash2 size={24} />,
      iconBg: "bg-red-100 text-red-500",
      confirmClass:
        "bg-red-500 hover:bg-red-600 text-white border-none shadow-sm",
    },
    warning: {
      icon: <AlertTriangle size={24} />,
      iconBg: "bg-amber-100 text-amber-500",
      confirmClass:
        "bg-amber-500 hover:bg-amber-600 text-white border-none shadow-sm",
    },
    info: {
      icon: <Info size={24} />,
      iconBg: "bg-primary/10 text-primary",
      confirmClass: "border-none shadow-sm",
    },
  })[variant()];

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent class="w-[88vw] max-w-xs rounded-3xl p-6 shadow-2xl border-border/60">
        <div class="flex flex-col items-center gap-4">
          {/* Icon */}
          <div
            class={`w-14 h-14 rounded-2xl flex items-center justify-center ${iconConfig().iconBg}`}
          >
            {iconConfig().icon}
          </div>

          {/* Text */}
          <div class="text-center">
            <DialogHeader>
              <DialogTitle class="text-base font-bold tracking-tight">
                {props.title}
              </DialogTitle>
            </DialogHeader>
            <Show when={props.description}>
              <DialogDescription class="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
                {props.description}
              </DialogDescription>
            </Show>
          </div>

          {/* Actions */}
          <div class={`flex gap-2 w-full mt-1 ${props.cancelLabel === '' ? 'justify-center' : ''}`}>
            <Show when={props.cancelLabel !== ''}>
              <Button
                variant="outline"
                class="flex-1 h-11 rounded-xl font-bold text-sm"
                onClick={() => props.onOpenChange(false)}
                disabled={props.loading}
              >
                {props.cancelLabel ?? "Batal"}
              </Button>
            </Show>
            <Button
              class={`flex-1 h-11 rounded-xl font-bold text-sm ${iconConfig().confirmClass}`}
              disabled={props.loading}
              onClick={async () => {
                await props.onConfirm();
                props.onOpenChange(false);
              }}
            >
              <Show
                when={!props.loading}
                fallback={
                  <div class="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                }
              >
                {props.confirmLabel ?? "Hapus"}
              </Show>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── useConfirm hook — simple imperative API ──────────────────────────────────

interface ConfirmState {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void | Promise<void>;
}

const DEFAULT_STATE: ConfirmState = {
  open: false,
  title: "",
  onConfirm: () => {},
};

export function createConfirmDialog() {
  const [state, setState] = createSignal<ConfirmState>(DEFAULT_STATE);

  const confirm = (opts: Omit<ConfirmState, "open">) => {
    setState({ ...opts, open: true });
  };

  const close = () => setState((s) => ({ ...s, open: false }));

  const DialogEl = () => (
    <ConfirmDialog
      open={state().open}
      onOpenChange={(v) => !v && close()}
      title={state().title}
      description={state().description}
      confirmLabel={state().confirmLabel}
      variant={state().variant}
      onConfirm={state().onConfirm}
    />
  );

  return { confirm, DialogEl };
}
