import * as React from "react";

import { Camera, QrCode, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type BarcodeFieldProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  autoFocus?: boolean;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

function getBarcodeDetector(): (new (opts?: { formats?: string[] }) => BarcodeDetectorLike) | null {
  const ctor = (window as unknown as { BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike })
    .BarcodeDetector;
  return ctor ?? null;
}

export function BarcodeField({
  id = "barcode",
  label = "Barcode",
  value,
  onChange,
  className,
  autoFocus,
}: BarcodeFieldProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);

  const [scanning, setScanning] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [hint, setHint] = React.useState<string | null>(null);

  function stopCamera() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  React.useEffect(() => () => stopCamera(), []);

  function focusForHardwareScan() {
    setHint("Point your barcode scanner here, then scan (or type and press Enter)");
    setScanError(null);
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }

  async function startCameraScan() {
    setScanError(null);
    setHint(null);
    const Detector = getBarcodeDetector();
    if (!Detector) {
      setScanError("Camera barcode scan is not supported in this browser. Use a USB/Bluetooth scanner or type the code.");
      focusForHardwareScan();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError("Camera access is not available. Use a scanner or type the code.");
      focusForHardwareScan();
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const video = videoRef.current;
      if (!video) {
        stopCamera();
        return;
      }
      video.srcObject = stream;
      await video.play();

      const detector = new Detector({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"],
      });

      const tick = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          const raw = codes[0]?.rawValue?.trim();
          if (raw) {
            onChange(raw);
            setHint(`Scanned: ${raw}`);
            stopCamera();
            inputRef.current?.focus();
            return;
          }
        } catch {
          // keep scanning
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      stopCamera();
      setScanError("Could not open camera. Allow camera permission, or use a scanner / type the code.");
      focusForHardwareScan();
    }
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          inputMode="numeric"
          placeholder="Scan or type barcode"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const next = document.getElementById("partNo") as HTMLInputElement | null;
              next?.focus();
              if (value.trim()) setHint("Barcode captured");
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10"
          aria-label="Focus for hardware barcode scanner"
          title="Use USB/Bluetooth scanner"
          onClick={focusForHardwareScan}
        >
          <QrCode className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10"
          aria-label="Scan with camera"
          title="Scan with camera"
          onClick={() => (scanning ? stopCamera() : startCameraScan())}
        >
          {scanning ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
        </Button>
      </div>
      {hint ? <p className="text-xs text-primary">{hint}</p> : null}
      {scanError ? <p className="text-xs text-destructive">{scanError}</p> : null}
      {!hint && !scanError ? (
        <p className="text-xs text-muted-foreground">
          Scanner gun: tap barcode icon, then scan. Phone: tap camera icon.
        </p>
      ) : null}

      {scanning ? (
        <div className="relative mt-2 overflow-hidden rounded-xl border bg-black">
          <video ref={videoRef} className="h-48 w-full object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-0 border-[3px] border-primary/70 m-8 rounded-lg" />
          <p className="absolute inset-x-0 bottom-2 text-center text-xs text-white/90">Align barcode in the frame</p>
        </div>
      ) : null}
    </div>
  );
}
