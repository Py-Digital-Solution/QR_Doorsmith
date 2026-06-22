"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Wifi, WifiOff, Loader2, Smartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type Status = "disconnected" | "connecting" | "connected";

type State = {
  status: Status;
  phone: string | null;
  unconfigured?: boolean;
  unreachable?: boolean;
};

export function WhatsAppPanel() {
  const [state, setState] = useState<State>({ status: "disconnected", phone: null });
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      const data: State = await res.json();
      setState(data);
      return data.status;
    } catch {
      return "disconnected" as Status;
    }
  }, []);

  const fetchQr = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/qr", { cache: "no-store" });
      if (res.ok) {
        const { qr: img } = await res.json();
        setQr(img ?? null);
      } else {
        setQr(null);
      }
    } catch {
      setQr(null);
    }
  }, []);

  // Poll while connecting; stop when connected or disconnected
  useEffect(() => {
    fetchStatus();

    pollRef.current = setInterval(async () => {
      const s = await fetchStatus();
      if (s === "connecting") fetchQr();
      if (s !== "connecting") setQr(null);
    }, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus, fetchQr]);

  async function handleConnect() {
    setActing(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST", cache: "no-store" });
      if (!res.ok) throw new Error("Could not start connection.");
      await fetchStatus();
      // kick off immediate QR fetch
      setTimeout(fetchQr, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      setActing(false);
    }
  }

  async function handleDisconnect() {
    setActing(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST", cache: "no-store" });
      if (!res.ok) throw new Error("Could not disconnect.");
      setQr(null);
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed.");
    } finally {
      setActing(false);
    }
  }

  // ── Unconfigured ─────────────────────────────────────────────────────────
  if (state.unconfigured) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <WifiOff className="mx-auto mb-2 size-8 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">WhatsApp service not configured</p>
        <p className="mt-1 text-xs text-gray-500">
          Add <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">WA_SERVICE_URL</code> and{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">WA_SERVICE_SECRET</code> to your environment, then start the{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">whatsapp-service</code> on your Oracle VM.
        </p>
      </div>
    );
  }

  // ── Connected ─────────────────────────────────────────────────────────────
  if (state.status === "connected") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-green-100">
            <Smartphone className="size-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">WhatsApp connected</p>
            {state.phone && (
              <p className="text-xs text-green-600">{state.phone}</p>
            )}
          </div>
        </div>
        <Button
          variant="danger"
          size="sm"
          loading={acting}
          onClick={handleDisconnect}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  // ── Connecting  show QR ──────────────────────────────────────────────────
  if (state.status === "connecting") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-amber-700">
          <Loader2 className="size-4 animate-spin text-amber-500" />
          <span>Waiting for QR scan…</span>
          <button
            onClick={fetchQr}
            className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className="size-3" /> Refresh QR
          </button>
        </div>

        {qr ? (
          <div className="flex justify-center">
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-card">
              <Image
                src={qr}
                alt="WhatsApp QR code  scan with your phone"
                width={220}
                height={220}
                unoptimized
              />
              <p className="mt-2 text-center text-xs text-gray-500">
                Open WhatsApp → Linked Devices → Link a Device
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
            <Loader2 className="size-6 animate-spin text-gray-400" />
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <Button variant="secondary" size="sm" loading={acting} onClick={handleDisconnect}>
          Cancel
        </Button>
      </div>
    );
  }

  // ── Disconnected ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {state.unreachable && (
        <Alert variant="error">
          Cannot reach the WhatsApp service. Make sure the{" "}
          <code className="font-mono text-xs">whatsapp-service</code> is running on your Oracle VM.
        </Alert>
      )}

      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-gray-100">
            <WifiOff className="size-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">WhatsApp not connected</p>
            <p className="text-xs text-gray-500">Scan a QR code to link your WhatsApp</p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          loading={acting}
          onClick={handleConnect}
        >
          <Wifi className="size-4" />
          Connect
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
