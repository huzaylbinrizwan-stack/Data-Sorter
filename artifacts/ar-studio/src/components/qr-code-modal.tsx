import { useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, X, QrCode } from "lucide-react";

interface QRCodeModalProps {
  projectName: string;
  studioUrl: string;
  onClose: () => void;
}

export default function QRCodeModal({ projectName, studioUrl, onClose }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`;
    link.click();
  }, [projectName]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-sm shadow-2xl w-full max-w-sm mx-4 p-8 flex flex-col items-center gap-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <h2 className="font-serif text-xl font-bold text-foreground">QR Code</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-muted-foreground text-sm text-center w-full">
          Scan to open <span className="text-foreground font-medium">{projectName}</span> in AR
        </p>

        <div className="bg-white p-4 rounded-sm">
          <QRCodeCanvas
            value={studioUrl}
            size={200}
            level="H"
            includeMargin={false}
            ref={canvasRef}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center break-all px-2">{studioUrl}</p>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-2.5 rounded-sm font-medium text-sm"
        >
          <Download className="w-4 h-4" />
          Download PNG
        </button>
      </div>
    </div>
  );
}
