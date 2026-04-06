import { Show, createSignal } from "solid-js";
import { Package } from "lucide-solid";

interface ProductImageProps {
  readonly src?: string;
  readonly name: string;
  readonly class?: string;
}

export function ProductImage(props: ProductImageProps) {
  const [hasError, setHasError] = createSignal(false);
  const initials = () => {
    return props.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div class={`relative overflow-hidden flex items-center justify-center shrink-0 ${props.class || "w-full h-full"}`}>
      <Show
        when={props.src && props.src !== "" && !hasError()}
        fallback={
          <div class="w-full h-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-orange-500 flex items-center justify-center relative overflow-hidden group/placeholder">
            {/* Decorative background icon */}
            <Package 
              size={64} 
              class="absolute -bottom-2 -right-2 text-white/10 rotate-12 transition-transform duration-700 group-hover/placeholder:scale-125 group-hover/placeholder:rotate-0" 
              stroke-width={1.5}
            />
            <Package 
              size={32} 
              class="absolute top-2 left-2 text-white/5 -rotate-12" 
              stroke-width={2}
            />
            
            {/* Monogram */}
            <span class="relative font-black text-white text-xl tracking-tighter drop-shadow-md select-none group-hover/placeholder:scale-110 transition-transform duration-300">
              {initials() || "NP"}
            </span>

            {/* Subtle overlay */}
            <div class="absolute inset-0 bg-black/5 opacity-0 group-hover/placeholder:opacity-100 transition-opacity" />
          </div>
        }
      >
        <img
          src={props.src}
          alt={props.name}
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      </Show>
    </div>
  );
}
