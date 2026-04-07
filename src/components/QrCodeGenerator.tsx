import { onMount, createSignal } from "solid-js";
import QRCode from "qrcode";
import { Package } from "lucide-solid";

interface QrCodeGeneratorProps {
  value: string;
  size?: number;
  label?: string;
  subLabel?: string;
}

export function QrCodeGenerator(props: QrCodeGeneratorProps) {
  let canvasRef: HTMLCanvasElement | undefined;
  const [error, setError] = createSignal(false);

  onMount(async () => {
    if (canvasRef) {
      try {
        await QRCode.toCanvas(canvasRef, props.value, {
          width: props.size || 150,
          margin: 2,
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
    <div class="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border border-border/20">
      <div class="relative w-fit h-fit bg-white p-2 rounded-xl border-2 border-primary/10">
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
      {props.label && (
        <span class="text-xs font-black text-foreground uppercase tracking-wider">
          {props.label}
        </span>
      )}
      {props.subLabel && (
        <span class="text-[9px] font-bold text-muted-foreground uppercase tracking-widest -mt-1">
          {props.subLabel}
        </span>
      )}
    </div>
  );
}

interface QrCodePrintGridProps {
  items: { id: string; qrCode: string; label?: string }[];
}

export function QrCodePrintGrid(props: QrCodePrintGridProps) {
  return (
    <div class="print-container bg-white p-0 min-h-screen">
      <style>{`
        @media print {
          @page { 
            size: A4; 
            margin: 10mm; 
          }
          body { 
            margin: 0; 
            padding: 0; 
            background: white; 
            -webkit-print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .print-container { 
            display: block !important;
            width: 190mm; /* A4 width (210) - 2x margin (10) */
            margin: 0;
            background: white;
          }
          .qr-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 2mm !important;
            padding: 0 !important;
          }
          .qr-item {
            width: 45mm !important;
            height: 60mm !important;
            border: 0.1mm dashed #e2e8f0 !important;
            padding: 5mm !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
        
        /* Non-print preview */
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
          padding: 20px;
        }
        .qr-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1px dashed #cbd5e1;
          padding: 12px;
          border-radius: 12px;
          background: white;
          transition: all 0.2s;
        }
      `}</style>
      
      <div class="qr-grid">
        {props.items.map((item) => (
          <div class="qr-item">
            <QrCodeGenerator 
              value={item.qrCode} 
              size={120} 
              label={`ID: ${item.label || item.id.substring(0, 8)}`}
              subLabel="NGEPOS MEMBER"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
