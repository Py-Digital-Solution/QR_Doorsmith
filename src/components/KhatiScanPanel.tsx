"use client";

import { useState, useRef, useCallback } from "react";
import { Check, X, Upload } from "lucide-react";
import { QrScanner } from "./QrScanner";
import { Button } from "./ui/Button";

type ScanState =
  | { phase: "scanning" }
  | { phase: "loading"; serialNo: string }
  | { phase: "success"; serialNo: string; sku: string; pointsEarned: number; newBalance: number; type: "product" | "small"; productsScanned?: number }
  | { phase: "error"; message: string };

export function KhatiScanPanel() {
  const [state, setState] = useState<ScanState>({ phase: "scanning" });
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [uploading, setUploading] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const isProcessing = useRef(false);
  const lastSeen = useRef<{ serial: string; at: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScan = useCallback(async (text: string) => {
    if (isProcessing.current) return;
    const serialNo = text.trim();
    if (!serialNo) return;

    const prev = lastSeen.current;
    if (prev && prev.serial === serialNo && Date.now() - prev.at < 5000) return;

    isProcessing.current = true;
    lastSeen.current = { serial: serialNo, at: Date.now() };
    setState({ phase: "loading", serialNo });

    try {
      const res = await fetch("/api/khati/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialNo }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected error." }));
      if (data.ok) {
        setState({
          phase: "success",
          serialNo: data.serialNo,
          sku: data.sku,
          pointsEarned: data.pointsEarned,
          newBalance: data.newBalance,
          type: data.type ?? "product",
          productsScanned: data.productsScanned,
        });
      } else {
        setState({ phase: "error", message: data.error ?? "Scan failed." });
      }
    } catch {
      setState({ phase: "error", message: "Network error. Please try again." });
    }
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    if (isProcessing.current) return;
    setScanningImage(true);

    try {
      const { default: QrScannerLib } = await import("qr-scanner");

      const imageBitmap = await createImageBitmap(file);
      const result = await QrScannerLib.scanImage(imageBitmap, {
        returnDetailedScanResult: true,
      });
      imageBitmap.close();

      const text = typeof result === "string" ? result : result.data;
      if (text) {
        await handleScan(text);
      } else {
        setState({ phase: "error", message: "No QR code found in this image." });
        isProcessing.current = false;
      }
    } catch {
      setState({ phase: "error", message: "Could not read QR code from image. Try a clearer photo." });
      isProcessing.current = false;
    } finally {
      setScanningImage(false);
    }
  }, [handleScan]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      handleImageUpload(file);
    }
  }

  function reset() {
    isProcessing.current = false;
    lastSeen.current = null;
    setState({ phase: "scanning" });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mode toggle — shown only when idle */}
      {state.phase === "scanning" && !scanningImage && (
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
              mode === "camera"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Camera
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
              mode === "upload"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Upload Image
          </button>
        </div>
      )}

      {mode === "camera" && (
        <div className="relative w-full max-w-xs">
          <QrScanner onScan={handleScan} />

          {state.phase !== "scanning" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/95 p-4 text-center backdrop-blur-[2px]">
              {state.phase === "loading" && (
                <>
                  <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
                  <p className="text-sm text-gray-500">Checking code…</p>
                  <p className="mt-1 font-mono text-xs text-gray-400">{state.serialNo}</p>
                </>
              )}

              {state.phase === "success" && (
                <>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Check className="size-6 text-green-600" strokeWidth={2.5} aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-green-700">
                    {state.type === "small" ? "Small Box Scanned!" : "Points Earned!"}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-brand">+{state.pointsEarned}</p>
                  {state.type === "small" && state.productsScanned != null && (
                    <p className="mt-1 text-xs font-medium text-green-600">
                      {state.productsScanned} product{state.productsScanned !== 1 ? "s" : ""} credited
                    </p>
                  )}
                  {state.sku && <p className="mt-1 text-xs text-gray-500">{state.sku}</p>}
                  <p className="mt-2 text-xs text-gray-400">
                    Balance: <span className="font-semibold text-gray-700">{state.newBalance}</span>
                  </p>
                  <Button onClick={reset} className="mt-4">
                    Scan next
                  </Button>
                </>
              )}

              {state.phase === "error" && (
                <>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <X className="size-6 text-red-500" strokeWidth={2.5} aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-red-600">Scan failed</p>
                  <p className="mt-1 text-xs text-gray-500">{state.message}</p>
                  <Button variant="secondary" onClick={reset} className="mt-4">
                    Try again
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {mode === "upload" && (
        <div className="w-full max-w-xs">
          {scanningImage ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
              <p className="text-sm text-gray-500">Scanning image for QR code…</p>
            </div>
          ) : state.phase !== "scanning" ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 text-center">
              {state.phase === "loading" && (
                <>
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
                  <p className="text-sm text-gray-500">Checking code…</p>
                  <p className="mt-1 font-mono text-xs text-gray-400">{state.serialNo}</p>
                  <Button variant="secondary" onClick={reset} className="mt-2">Cancel</Button>
                </>
              )}

              {state.phase === "success" && (
                <>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Check className="size-6 text-green-600" strokeWidth={2.5} aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-green-700">
                    {state.type === "small" ? "Small Box Scanned!" : "Points Earned!"}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-brand">+{state.pointsEarned}</p>
                  {state.type === "small" && state.productsScanned != null && (
                    <p className="mt-1 text-xs font-medium text-green-600">
                      {state.productsScanned} product{state.productsScanned !== 1 ? "s" : ""} credited
                    </p>
                  )}
                  {state.sku && <p className="mt-1 text-xs text-gray-500">{state.sku}</p>}
                  <p className="mt-2 text-xs text-gray-400">
                    Balance: <span className="font-semibold text-gray-700">{state.newBalance}</span>
                  </p>
                  <Button onClick={reset} className="mt-4">
                    Scan next
                  </Button>
                </>
              )}

              {state.phase === "error" && (
                <>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <X className="size-6 text-red-500" strokeWidth={2.5} aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-red-600">Scan failed</p>
                  <p className="mt-1 text-xs text-gray-500">{state.message}</p>
                  <Button variant="secondary" onClick={reset} className="mt-4">
                    Try again
                  </Button>
                </>
              )}
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center transition-colors hover:border-brand hover:bg-brand/5">
              <Upload className="size-8 text-gray-400" aria-hidden />
              <div>
                <p className="text-sm font-medium text-gray-700">Upload a QR code image</p>
                <p className="mt-1 text-xs text-gray-400">JPG, PNG — take a photo or pick from gallery</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      )}

      {state.phase === "scanning" && mode === "camera" && (
        <p className="text-center text-xs text-gray-400">
          Point the camera at a product or small box QR code
        </p>
      )}
      {state.phase === "scanning" && mode === "upload" && (
        <p className="text-center text-xs text-gray-400">
          Tap the box above to upload a QR code photo
        </p>
      )}
    </div>
  );
}
