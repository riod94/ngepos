import { onMount, onCleanup, createSignal, Show } from "solid-js";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, RefreshCw } from "lucide-solid";
import { parseQrCode } from "~/stores/loyalty";
import { toast } from "solid-toast";

interface QrScanResult {
  text: string;
}

interface QrCodeScannerProps {
  onScan: (customerId: string) => void;
  onClose: () => void;
  title?: string;
}

export function QrCodeScanner(props: QrCodeScannerProps) {
  let scanner: Html5QrcodeScanner | null = null;
  const SCANNER_ID = "qr-reader";
  const [isInitializing, setIsInitializing] = createSignal(true);

  onMount(() => {
    // Menunda inisialisasi sedikit untuk memastikan DOM siap
    setTimeout(() => {
      try {
        scanner = new Html5QrcodeScanner(
          SCANNER_ID,
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            const customerId = parseQrCode(decodedText);
            if (customerId) {
              if (scanner) scanner.clear();
              props.onScan(customerId);
            } else {
              toast.error("Format QR Code tidak dikenali");
            }
          },
          (errorMessage) => {
            // Error scanning biasanya berisik, abaikan saja
          }
        );
        
        setIsInitializing(false);
      } catch (err) {
        console.error("Scanner initialization failed:", err);
        toast.error("Gagal membuka kamera");
        setIsInitializing(false);
      }
    }, 500);
  });

  onCleanup(() => {
    if (scanner) {
      scanner.clear().catch(err => console.error("Failed to clear scanner:", err));
    }
  });

  return (
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="bg-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative border-4 border-primary/20 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div class="p-4 flex items-center justify-between border-b border-border/40 bg-card">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-xl text-primary">
              <Camera size={20} />
            </div>
            <h3 class="font-black text-sm uppercase tracking-widest">
              {props.title || "Scan Member QR"}
            </h3>
          </div>
          <button 
            onClick={props.onClose}
            class="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scanner Container */}
        <div class="p-6 bg-black relative aspect-square">
          <div id={SCANNER_ID} class="w-full h-full overflow-hidden rounded-2xl border-2 border-primary/20" />
          
          <Show when={isInitializing()}>
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-black text-white gap-4">
              <RefreshCw size={32} class="animate-spin text-primary" />
              <span class="text-xs font-black uppercase tracking-widest animate-pulse">Menyiapkan Kamera...</span>
            </div>
          </Show>

          {/* Simple Viewfinder Overlay (CSS based) */}
          <div class="absolute inset-0 pointer-events-none flex items-center justify-center p-12">
             <div class="w-full h-full border-[3px] border-primary/40 rounded-3xl relative">
                {/* Corners */}
                <div class="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div class="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div class="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div class="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                
                {/* Scanning line animation */}
                <div class="absolute top-0 left-4 right-4 h-1 bg-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] animate-scan-line rounded-full" />
             </div>
          </div>
        </div>

        {/* Footer / Instructions */}
        <div class="p-6 bg-muted/30 text-center">
          <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
            Arahkan kamera ke QR Code pelanggan.<br/>
            Pastikan pencahayaan cukup dan QR Code terlihat jelas.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
          position: absolute;
        }
        /* Overwrite html5-qrcode styles to match theme */
        #qr-reader { border: none !important; }
        #qr-reader__dashboard { font-family: 'Outfit', sans-serif !important; }
        #qr-reader__status_span { font-size: 10px !important; text-transform: uppercase !important; font-weight: 800 !important; }
        button#html5-qrcode-button-camera-start, 
        button#html5-qrcode-button-camera-stop {
          background-color: rgb(var(--primary)) !important;
          color: white !important;
          border-radius: 12px !important;
          padding: 8px 16px !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          font-size: 12px !important;
          letter-spacing: 0.05em !important;
          border: none !important;
          cursor: pointer !important;
          margin-top: 10px !important;
        }
      `}</style>
    </div>
  );
}
