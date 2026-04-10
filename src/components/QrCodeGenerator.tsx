import { onMount, createSignal } from "solid-js";
import QRCode from "qrcode";
import { Package } from "lucide-solid";

interface QrCodeGeneratorProps {
  value: string;
  size?: number;
  label?: string;
  subLabel?: string;
  plain?: boolean;
}

export function QrCodeGenerator(props: QrCodeGeneratorProps) {
  let canvasRef: HTMLCanvasElement | undefined;
  const [error, setError] = createSignal(false);

  onMount(async () => {
    if (canvasRef) {
      try {
        await QRCode.toCanvas(canvasRef, props.value, {
          width: props.size || 150,
          margin: 1, // Reduced margin for cleaner look
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
      } catch (err) {
        console.error("Failed to generate QR Code:", err);
        setError(true);
      }
    }
  });

  return (
    <div class={`flex flex-col items-center gap-2 ${props.plain ? '' : 'p-4 bg-white rounded-2xl shadow-sm border border-border/20'}`}>
      <div class={`relative w-fit h-fit bg-white rounded-xl ${props.plain ? 'p-1 shadow-sm' : 'p-2 border-2 border-primary/10'}`}>
        <canvas 
          ref={canvasRef} 
          class={`rounded-lg ${error() ? 'hidden' : 'block'}`}
        />
        {error() && (
          <div class="w-[150px] h-[150px] flex flex-col items-center justify-center text-red-400 gap-2">
            <Package size={32} />
            <span class="text-[10px] font-black uppercase">Error QR</span>
          </div>
        )}
      </div>
      {(props.label || props.subLabel) && !props.plain && (
        <div class="flex flex-col items-center mt-1">
          {props.label && (
            <span class="text-xs font-black text-foreground uppercase tracking-wider">
              {props.label}
            </span>
          )}
          {props.subLabel && (
            <span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest -mt-0.5">
              {props.subLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export interface QrCodePrintGridProps {
  items: { id: string; qrCode: string; label?: string }[];
  theme?: "light" | "dark" | "gradient" | "lines" | "custom";
  showStamps?: boolean;
  outletName?: string;
  layout?: "portrait" | "horizontal";
  customColor?: string;
}

export function QrCodePrintGrid(props: QrCodePrintGridProps) {
  const isHorizontal = () => props.layout === "horizontal";
  const theme = () => props.theme || "light";
  
  // Define themes
  const getThemeClasses = (t: string) => {
    switch (t) {
      case "dark": return "bg-[#111] text-white border-[#333]";
      case "gradient": return "bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white border-transparent";
      case "lines": return "bg-white text-slate-800 border-slate-200 overflow-hidden";
      case "custom": return "text-white border-transparent"; // background will be set via inline style
      default: return "bg-white text-slate-800 border-dashed border-slate-300";
    }
  };

  return (
    <div class="print-container bg-white p-0 min-h-screen">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { 
            margin: 0; padding: 0; background: white; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          .print-container { 
            display: block !important; width: 190mm; margin: 0; background: white;
          }
          .qr-grid {
            display: grid !important; gap: 4mm !important; padding: 0 !important;
          }
          .qr-grid.portrait { grid-template-columns: repeat(3, 1fr) !important; }
          .qr-grid.horizontal { grid-template-columns: repeat(2, 1fr) !important; }
          
          .qr-item {
            display: flex !important;
            break-inside: avoid; page-break-inside: avoid;
            position: relative !important; overflow: hidden !important;
            box-shadow: 0 0 0 0.5px rgba(0,0,0,0.1) inset !important;
          }
          .qr-item.portrait { width: 55mm !important; min-height: 85mm !important; flex-direction: column !important; }
          .qr-item.horizontal { width: 85.6mm !important; height: 53.98mm !important; flex-direction: row !important; }
        }
        
        .qr-grid {
          display: grid; gap: 16px; padding: 20px;
          grid-template-columns: ${isHorizontal() ? 'repeat(auto-fill, minmax(320px, 1fr))' : 'repeat(auto-fill, minmax(200px, 1fr))'};
        }
        .qr-item {
          display: flex; position: relative; overflow: hidden;
          border-radius: 16px; transition: transform 0.2s;
        }
        .qr-item.portrait { flex-direction: column; min-height: 320px; }
        .qr-item.horizontal { flex-direction: row; height: 204px; }
        
        /* Premium Background Patterns */
        .bg-lines::before {
          content: ""; position: absolute; inset: -50%; z-index: 0;
          background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 11px);
        }
        .bg-gradient::after {
          content: ""; position: absolute; inset: 0; z-index: 0;
          background: linear-gradient(120deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
        }
      `}</style>
      
      <div class={`qr-grid ${isHorizontal() ? 'horizontal' : 'portrait'}`}>
        {props.items.map((item) => (
          <div 
            class={`qr-item ${getThemeClasses(theme())} ${isHorizontal() ? 'horizontal' : 'portrait'} ${theme() === 'lines' ? 'bg-lines' : ''} ${theme() === 'gradient' ? 'bg-gradient' : ''}`}
            style={theme() === 'custom' ? { background: props.customColor || "#4f46e5" } : undefined}
          >
            
            <div class="relative z-10 flex w-full h-full">
              {isHorizontal() ? (
                // HORIZONTAL LAYOUT
                <>
                  <div class="w-1/3 h-full flex flex-col items-center justify-center p-3 border-r border-white/10 bg-black/5">
                    <QrCodeGenerator value={window.location.origin + "/m/" + item.id} size={90} plain />
                    <span class="text-[8px] font-black uppercase tracking-widest mt-2 opacity-60 font-mono">
                      {item.id.substring(item.id.length - 8)}
                    </span>
                  </div>
                  <div class="w-2/3 flex flex-col p-4 justify-between">
                    <div>
                      <h2 class="font-black text-lg tracking-tight leading-none uppercase">{props.outletName || "NGEPOS"}</h2>
                      <p class="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-1">Exclusive Member Card</p>
                    </div>
                    
                    {props.showStamps && (
                      <div class="mt-auto">
                        <div class="flex items-center justify-between mb-1">
                          <span class="text-[7px] font-black uppercase tracking-widest opacity-50">Rewards Stamp</span>
                        </div>
                        <div class="grid grid-cols-5 gap-2 mt-1">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div class={`w-6 h-6 rounded-full flex items-center justify-center border ${theme() === 'dark' || theme() === 'gradient' || theme() === 'custom' ? 'border-white/30 bg-white/10' : 'border-black/20 bg-black/5'}`}>
                              <span class="text-[8px] font-black opacity-40">{i + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // PORTRAIT LAYOUT
                <div class="flex flex-col items-center w-full h-full p-5 justify-between">
                  {/* Header */}
                  <div class="w-full text-center">
                    <h2 class="font-black text-base tracking-tight leading-none uppercase">{props.outletName || "NGEPOS"}</h2>
                    <p class="text-[8px] font-bold opacity-60 uppercase tracking-widest mt-1">MEMBER CARD</p>
                  </div>
                  
                  {/* QR Core */}
                  <div class={`p-3 rounded-[20px] shadow-2xl shadow-black/10 my-4 ${theme() === 'dark' || theme() === 'gradient' ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-black/5 border border-black/10'}`}>
                    <QrCodeGenerator value={window.location.origin + "/m/" + item.id} size={110} plain />
                  </div>
                  
                  {/* ID */}
                  <div class="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 font-mono text-center">
                    ID: {item.label || item.id.substring(item.id.length - 8)}
                  </div>
                  
                  {/* Stamps (if Portrait layout) */}
                  {props.showStamps && (
                    <div class="w-full mt-4 pt-4 border-t border-current/10">
                      <div class="grid grid-cols-5 gap-2">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div class={`aspect-square rounded-full flex items-center justify-center border ${theme() === 'dark' || theme() === 'gradient' || theme() === 'custom' ? 'border-white/30 bg-white/10' : 'border-black/20 bg-black/5'}`}>
                            <span class="text-[7px] font-black opacity-40">{i + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
