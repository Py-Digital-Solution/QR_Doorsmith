"use client";

import { useState, useRef, useCallback } from "react";
import { Check, X, Image as ImageIcon, Keyboard } from "lucide-react";
import { QrScanner } from "./QrScanner";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

type ScanState =
  | { phase: "scanning" }
  | { phase: "loading"; serialNo: string }
  | { phase: "success"; serialNo: string; sku: string; pointsEarned: number; newBalance: number; type: "product" | "small"; productsScanned?: number }
  | { phase: "error"; message: string };

export function KhatiScanPanel() {
  const [state, setState] = useState<ScanState>({ phase: "scanning" });
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessing = useRef(false);
  // After a scan the camera may still see the same code. Ignore it for 5 s so
  // the user has time to move away before the next scan is accepted.
  const lastSeen = useRef<{ serial: string; at: number } | null>(null);

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
    // Keep isProcessing true  only reset when user taps "Scan next" / "Try again".
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { default: QrScannerLib } = await import("qr-scanner");
      QrScannerLib.WORKER_PATH = "/qr-scanner-worker.min.js";
      const result = await QrScannerLib.scanImage(file, { returnDetailedScanResult: true });
      if (result?.data) {
        handleScan(result.data);
      } else {
        setState({ phase: "error", message: "No QR code could be detected in this photo. Please try another image or type the serial number." });
      }
    } catch {
      setState({ phase: "error", message: "Could not read QR from photo. Please enter the serial number manually." });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScan(manualCode.trim());
  };

  function reset() {
    isProcessing.current = false;
    lastSeen.current = null; // clear cooldown so same code can be re-scanned immediately
    setManualCode("");
    setState({ phase: "scanning" });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden file input for photo QR scanning */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Camera  always mounted so it stays warm; overlay covers it on result */}
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

      {state.phase === "scanning" && (
        <div className="w-full max-w-xs space-y-3">
          <p className="text-center text-xs text-gray-400">
            Point the camera at a product or small box QR code
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <ImageIcon className="size-4 text-gray-500" aria-hidden />
              Upload photo
            </button>
            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className={`focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium shadow-sm transition ${
                showManual
                  ? "border-brand bg-brand/5 text-brand-dark"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Keyboard className="size-4 text-gray-500" aria-hidden />
              {showManual ? "Hide manual" : "Enter code"}
            </button>
          </div>

          {showManual && (
            <form onSubmit={handleManualSubmit} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-card">
              <label className="block text-xs font-medium text-gray-700">Enter QR Serial Number</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g. S-2026-..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="font-mono text-xs uppercase"
                  autoCapitalize="characters"
                  required
                />
                <Button type="submit" size="sm">
                  Claim
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
