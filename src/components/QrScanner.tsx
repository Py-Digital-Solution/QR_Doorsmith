"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type QrScannerType from "qr-scanner";

type CameraErrorKind = "permission" | "not_found" | "in_use" | "unknown";

/**
 * Camera QR scanner backed by qr-scanner (Nimiq).
 * Uses native BarcodeDetector on Android Chrome (fastest path),
 * falls back to WASM on iOS/Firefox  both faster than html5-qrcode.
 */
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScannerType | null>(null);
  const onScanRef = useRef(onScan);
  const [cameraError, setCameraError] = useState<CameraErrorKind | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!videoRef.current) return;
    let destroyed = false;
    setCameraError(null);

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
        setCameraError(await classifyCameraError(err));
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
  }, [attempt]);

  if (cameraError) {
    return (
      <div className="flex min-h-[280px] w-full max-w-xs flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">{CAMERA_ERROR_COPY[cameraError].message}</p>
        {CAMERA_ERROR_COPY[cameraError].hint && (
          <p className="text-xs text-red-500">{CAMERA_ERROR_COPY[cameraError].hint}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Try again
          </button>
          {cameraError === "permission" && isAndroidChrome() && (
            <a
              href="intent://com.android.chrome#Intent;scheme=package;package=com.android.chrome;action=android.settings.APPLICATION_DETAILS_SETTINGS;end"
              className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              Open Chrome settings
            </a>
          )}
        </div>
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

const CAMERA_ERROR_COPY: Record<CameraErrorKind, { message: string; hint?: string }> = {
  permission: {
    message: "Camera permission is blocked for this site.",
    hint: "Tap the lock/site-info icon next to the address bar → Permissions → Camera → Allow, then tap \"Try again\".",
  },
  not_found: {
    message: "No camera found on this device.",
  },
  in_use: {
    message: "Camera is already in use by another app.",
    hint: "Close any other app using the camera, then tap \"Try again\".",
  },
  unknown: {
    message: "Camera unavailable. Please try again.",
  },
};

/**
 * Best-effort deep link to Chrome's Android app-info screen (where the OS-level
 * camera permission toggle lives), for when a user needs to un-block it outside
 * the browser's own per-site settings. Only offered on Android Chrome  it does
 * nothing (harmlessly) anywhere else, so this is safe to attempt speculatively.
 */
function isAndroidChrome(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Android/.test(ua) && /Chrome\//.test(ua) && !/Edg|OPR|SamsungBrowser/.test(ua);
}

/**
 * Some browsers report a blocked camera as "device not found" instead of
 * "permission denied" (they hide device enumeration entirely until access is
 * granted), which is exactly what produced the misleading "No camera found"
 * message even when the real problem was a permission block. Cross-check the
 * Permissions API (where supported) before trusting that message.
 */
async function classifyCameraError(err: unknown): Promise<CameraErrorKind> {
  const name = (err as { name?: string })?.name ?? "";
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();

  if (name === "NotAllowedError" || name === "PermissionDeniedError" || message.includes("permission")) {
    return "permission";
  }
  if (name === "NotReadableError" || message.includes("in use") || message.includes("could not start")) {
    return "in_use";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || message.includes("not found") || message.includes("no camera")) {
    // Ambiguous in some browsers: permission-blocked sites can also report "not
    // found" here. Ask the Permissions API directly to disambiguate.
    try {
      const status = await navigator.permissions?.query({ name: "camera" as PermissionName });
      if (status?.state === "denied") return "permission";
    } catch {
      // Permissions API not supported for "camera" in this browser  fall through.
    }
    return "not_found";
  }
  return "unknown";
}
