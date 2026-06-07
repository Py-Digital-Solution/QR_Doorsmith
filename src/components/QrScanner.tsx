"use client";

import { useEffect, useId, useRef } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

/**
 * Camera QR scanner. Calls onScan with the decoded text. Requires a secure
 * context (HTTPS or localhost) for camera access. Best-effort — if the camera
 * isn't available, the manual serial input is the fallback.
 */
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const id = useId().replace(/:/g, "");
  const cb = useRef(onScan);

  useEffect(() => {
    cb.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const scanner = new Html5Qrcode(id);

    const startPromise = scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (decoded) => cb.current(decoded),
        undefined,
      )
      .catch(() => {
        /* camera unavailable / permission denied — manual input still works */
      });

    return () => {
      // Wait for start() to settle, then stop only if actually scanning.
      // html5-qrcode's stop() THROWS synchronously if it isn't running.
      startPromise.finally(() => {
        try {
          const state = scanner.getState();
          if (
            state === Html5QrcodeScannerState.SCANNING ||
            state === Html5QrcodeScannerState.PAUSED
          ) {
            scanner
              .stop()
              .then(() => scanner.clear())
              .catch(() => {});
          }
        } catch {
          /* already stopped / never started — ignore */
        }
      });
    };
  }, [id]);

  return (
    <div
      id={id}
      className="w-full max-w-xs overflow-hidden rounded-lg border border-gray-200"
    />
  );
}
