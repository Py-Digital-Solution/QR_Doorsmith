"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

type CameraErrorKind =
  | "permission"
  | "not_found"
  | "in_use"
  | "unsupported"
  | "timeout"
  | "unknown";

const CAMERA_START_TIMEOUT_MS = 12_000;

/**
 * QR scanner with explicit camera ownership.
 *
 * qr-scanner is still used for decoding, but getUserMedia is managed here so
 * mobile browsers get a predictable stream, camera fallback, and cleanup path.
 */
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const scanBusyRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [cameraError, setCameraError] = useState<CameraErrorKind | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let cancelled = false;
    let activeTrack: MediaStreamTrack | null = null;

    const stopStream = () => {
      if (scanFrameRef.current !== null) {
        cancelAnimationFrame(scanFrameRef.current);
        scanFrameRef.current = null;
      }
      scanBusyRef.current = false;

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      const video = videoRef.current;
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };

    const recoverAfterBackground = () => {
      if (cancelled || document.visibilityState !== "visible" || !streamRef.current) return;

      const track = streamRef.current.getVideoTracks()[0];
      const video = videoRef.current;
      if (!track || track.readyState !== "live") {
        setAttempt((value) => value + 1);
        return;
      }

      void video?.play().catch(() => setAttempt((value) => value + 1));
    };

    const handleTrackEnded = () => {
      if (!cancelled) setAttempt((value) => value + 1);
    };

    document.addEventListener("visibilitychange", recoverAfterBackground);

    const start = async () => {
      setCameraError(null);
      stopStream();

      try {
        if (!window.isSecureContext) throw namedCameraError("SecurityError");
        if (!navigator.mediaDevices?.getUserMedia) throw namedCameraError("UnsupportedError");

        const { default: QrScannerLib } = await import("qr-scanner");
        QrScannerLib.WORKER_PATH = "/qr-scanner-worker.min.js";

        if (cancelled) return;

        const stream = await getCameraStream(selectedCameraId);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        activeTrack = stream.getVideoTracks()[0] ?? null;
        activeTrack?.addEventListener("ended", handleTrackEnded);
        const video = videoRef.current;
        if (!video) throw namedCameraError("UnknownError");

        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = stream;

        await waitForVideo(video);
        await video.play();

        if (cancelled) return;

        const devices = await listVideoDevices();
        if (!cancelled) setCameraDevices(devices);

        const scan = async () => {
          if (cancelled) return;

          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !scanBusyRef.current) {
            scanBusyRef.current = true;
            try {
              const result = await QrScannerLib.scanImage(video, {
                returnDetailedScanResult: true,
              });
              const text = typeof result === "string" ? result : result.data;
              if (text) onScanRef.current(text);
            } catch (err) {
              // A missing QR in a frame is expected. Log only decoder failures,
              // never the contents of a scanned QR code.
              if (!isNoQrFoundError(err)) {
                console.info("[QrScanner] frame decode failed", { name: getErrorName(err) });
              }
            } finally {
              scanBusyRef.current = false;
            }
          }

          if (!cancelled) scanFrameRef.current = requestAnimationFrame(scan);
        };

        scanFrameRef.current = requestAnimationFrame(scan);
      } catch (err) {
        if (cancelled) return;
        stopStream();
        const kind = await classifyCameraError(err);
        console.info("[QrScanner] camera initialization failed", {
          name: getErrorName(err),
          kind,
          hasSelectedCamera: Boolean(selectedCameraId),
        });
        setCameraError(kind);
      }
    };

    void start();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", recoverAfterBackground);
      activeTrack?.removeEventListener("ended", handleTrackEnded);
      stopStream();
    };
  }, [attempt, selectedCameraId]);

  function retryCamera() {
    setCameraError(null);
    setAttempt((value) => value + 1);
  }

  return (
    <div className="w-full max-w-xs space-y-2">
      <div className="relative w-full">
        <video
          ref={videoRef}
          className="w-full rounded-lg border border-gray-200 bg-black"
          style={{ display: "block", aspectRatio: "4/3" }}
          autoPlay
          muted
          playsInline
        />

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm text-red-600">{CAMERA_ERROR_COPY[cameraError].message}</p>
            {CAMERA_ERROR_COPY[cameraError].hint && (
              <p className="text-xs text-red-500">{CAMERA_ERROR_COPY[cameraError].hint}</p>
            )}
            <button
              type="button"
              onClick={retryCamera}
              className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Retry camera
            </button>
          </div>
        )}
      </div>

      {cameraDevices.length > 1 && (
        <label className="block text-xs text-gray-500">
          Camera
          <select
            value={selectedCameraId}
            onChange={(event) => setSelectedCameraId(event.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs text-gray-700 focus:border-brand focus:outline-none"
          >
            <option value="">Rear camera (automatic)</option>
            {cameraDevices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

const CAMERA_ERROR_COPY: Record<CameraErrorKind, { message: string; hint?: string }> = {
  permission: {
    message: "Camera permission is blocked for this site.",
    hint: "Allow camera access in your browser or device settings, then tap \"Retry camera\".",
  },
  not_found: { message: "No camera found on this device." },
  in_use: {
    message: "Camera is already in use by another app.",
    hint: "Close other camera apps, return to this page, then tap \"Retry camera\".",
  },
  unsupported: {
    message: "This browser cannot access the camera.",
    hint: "Open DoorSmith in the latest Chrome, Samsung Internet, or Safari over HTTPS.",
  },
  timeout: {
    message: "The camera took too long to start.",
    hint: "Check camera permissions, then tap \"Retry camera\".",
  },
  unknown: { message: "Camera unavailable. Please try again." },
};

async function getCameraStream(selectedCameraId: string): Promise<MediaStream> {
  const preferred: MediaStreamConstraints = {
    audio: false,
    video: selectedCameraId
      ? {
          deviceId: { exact: selectedCameraId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      : {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
  };

  try {
    return await getUserMediaWithTimeout(preferred);
  } catch (err) {
    const name = getErrorName(err);
    if (["NotAllowedError", "PermissionDeniedError", "SecurityError", "NotReadableError"].includes(name)) {
      throw err;
    }
    return getUserMediaWithTimeout({ video: true, audio: false });
  }
}

function getUserMediaWithTimeout(constraints: MediaStreamConstraints): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      settled = true;
      reject(namedCameraError("TimeoutError"));
    }, CAMERA_START_TIMEOUT_MS);

    navigator.mediaDevices.getUserMedia(constraints).then(
      (stream) => {
        window.clearTimeout(timer);
        if (settled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        settled = true;
        resolve(stream);
      },
      (err: unknown) => {
        window.clearTimeout(timer);
        if (settled) return;
        settled = true;
        reject(err);
      },
    );
  });
}

async function waitForVideo(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(namedCameraError("TimeoutError"));
    }, CAMERA_START_TIMEOUT_MS);
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(namedCameraError("UnknownError"));
    };

    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function listVideoDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "videoinput");
  } catch (err) {
    console.info("[QrScanner] could not enumerate cameras", { name: getErrorName(err) });
    return [];
  }
}

function namedCameraError(name: string): DOMException {
  return new DOMException("Camera initialization failed", name);
}

function getErrorName(err: unknown): string {
  return (err as { name?: string })?.name ?? "UnknownError";
}

function isNoQrFoundError(err: unknown): boolean {
  const name = getErrorName(err);
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return name === "NoQRCodeFoundError" || message.includes("no qr code") || message.includes("no qr found");
}

async function classifyCameraError(err: unknown): Promise<CameraErrorKind> {
  const name = getErrorName(err);

  if (["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(name)) return "permission";
  if (["NotReadableError", "TrackStartError"].includes(name)) return "in_use";
  if (["NotFoundError", "DevicesNotFoundError"].includes(name)) return "not_found";
  if (["UnsupportedError", "TypeError"].includes(name)) return "unsupported";
  if (name === "TimeoutError") return "timeout";

  try {
    const status = await navigator.permissions?.query({ name: "camera" as PermissionName });
    if (status?.state === "denied") return "permission";
  } catch {
    // Camera permission querying is not supported consistently on mobile.
  }

  return "unknown";
}
