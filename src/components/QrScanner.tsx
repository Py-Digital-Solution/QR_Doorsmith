"use client";

import { useEffect, useRef, useState } from "react";
import type QrScannerType from "qr-scanner";

/**
 * Camera QR scanner backed by qr-scanner (Nimiq).
 * Uses native BarcodeDetector on Android Chrome (fastest path),
 * falls back to WASM on iOS/Firefox — both faster than html5-qrcode.
 */
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScannerType | null>(null);
  const onScanRef = useRef(onScan);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!videoRef.current) return;
    let destroyed = false;

    (async () => {
      const { default: QrScannerLib } = await import("qr-scanner");
      QrScannerLib.WORKER_PATH = "/qr-scanner-worker.min.js";

      if (destroyed) return;

      const scanner = new QrScannerLib(
        videoRef.current!,
        (result) => onScanRef.current(result.data),
        {
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 15,
          returnDetailedScanResult: true,
        },
      );

      scannerRef.current = scanner;

      try {
        await scanner.start();
      } catch (err) {
        if (destroyed) return;
        const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
        if (msg.includes("permission")) {
          setCameraError("Camera permission denied. Allow camera access and reload.");
        } else if (msg.includes("not found") || msg.includes("no camera")) {
          setCameraError("No camera found on this device.");
        } else {
          setCameraError("Camera unavailable: " + msg);
        }
      }
    })();

    return () => {
      destroyed = true;
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, []);

  if (cameraError) {
    return (
      <div className="flex min-h-[280px] w-full max-w-xs items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">{cameraError}</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="w-full max-w-xs rounded-lg border border-gray-200 bg-black"
      style={{ display: "block", aspectRatio: "4/3" }}
      muted
      playsInline
    />
  );
}
