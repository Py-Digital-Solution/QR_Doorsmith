"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

/**
 * Camera QR scanner. Calls onScan with the decoded text once per code.
 * Requires HTTPS or localhost for camera access.
 */
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const id = useId().replace(/:/g, "");
  const onScanRef = useRef(onScan);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Always keep the callback ref up to date without recreating the scanner.
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const scanner = new Html5Qrcode(id);

    const startPromise = scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => onScanRef.current(decoded),
        undefined,
      )
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes("permission")) {
          setCameraError("Camera permission denied. Allow camera access and reload.");
        } else if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no cameras")) {
          setCameraError("No camera found on this device.");
        } else {
          setCameraError("Camera unavailable.");
        }
      });

    return () => {
      startPromise.finally(() => {
        try {
          const state = scanner.getState();
          if (
            state === Html5QrcodeScannerState.SCANNING ||
            state === Html5QrcodeScannerState.PAUSED
          ) {
            scanner.stop().then(() => scanner.clear()).catch(() => {});
          }
        } catch {
          // already stopped
        }
      });
    };
  }, [id]);

  if (cameraError) {
    return (
      <div className="flex min-h-[280px] w-full max-w-xs items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">{cameraError}</p>
      </div>
    );
  }

  return (
    <div
      id={id}
      className="min-h-[280px] w-full max-w-xs overflow-hidden rounded-lg border border-gray-200 bg-black"
    />
  );
}
