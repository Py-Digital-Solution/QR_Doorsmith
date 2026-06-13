"use client";

import { useState, useRef, useCallback } from "react";
import { Undo2, X, Camera, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { QrScanner } from "./QrScanner";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

type ReturnState =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "loading"; serialNo: string }
  | { phase: "success"; serialNo: string; sku: string; pointsReversed: number; khatiName: string; counterName: string }
  | { phase: "error"; message: string };

export function CounterReturnPanel() {
  const [state, setState] = useState<ReturnState>({ phase: "idle" });
  const [manual, setManual] = useState("");
  const isProcessing = useRef(false);
  const lastSeen = useRef<{ serial: string; at: number } | null>(null);
  const router = useRouter();

  async function submit(serialNo: string) {
    const sn = serialNo.trim();
    if (!sn || isProcessing.current) return;
    isProcessing.current = true;
    setState({ phase: "loading", serialNo: sn });

    try {
      const res = await fetch("/api/counter/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialNo: sn }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected error." }));
      if (data.ok) {
        setState({
          phase: "success",
          serialNo: data.serialNo,
          sku: data.sku,
          pointsReversed: data.pointsReversed,
          khatiName: data.khatiName,
          counterName: data.counterName ?? "",
        });
        setManual("");
        router.refresh();
      } else {
        setState({ phase: "error", message: data.error ?? "Return failed." });
      }
    } catch {
      setState({ phase: "error", message: "Network error. Please try again." });
    }
  }

  const handleScan = useCallback(async (text: string) => {
    if (isProcessing.current) return;
    const sn = text.trim();
    if (!sn) return;
    const prev = lastSeen.current;
    if (prev && prev.serial === sn && Date.now() - prev.at < 5000) return;
    lastSeen.current = { serial: sn, at: Date.now() };
    await submit(sn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    isProcessing.current = false;
    lastSeen.current = null;
    setState({ phase: "idle" });
  }

  function startCamera() {
    isProcessing.current = false;
    lastSeen.current = null;
    setState({ phase: "scanning" });
  }

  return (
    <div className="space-y-4">
      {/* Manual serial entry */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5">
        <p className="mb-3 text-sm font-medium text-gray-700">Enter serial number manually</p>
        <form
          onSubmit={(e) => { e.preventDefault(); submit(manual); }}
          className="flex gap-2"
        >
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="PD-DS-0000001"
            className="font-mono"
            disabled={state.phase === "loading"}
          />
          <Button
            type="submit"
            disabled={!manual.trim() || state.phase === "loading"}
            loading={state.phase === "loading" && !!manual}
          >
            Process
          </Button>
        </form>
      </div>

      {/* Camera scanner */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Scan with camera</p>
          {state.phase !== "scanning" && (
            <Button variant="secondary" onClick={startCamera} className="gap-1.5">
              <Camera className="size-4" aria-hidden />
              Open camera
            </Button>
          )}
        </div>

        {state.phase === "scanning" && (
          <div className="relative w-full max-w-xs">
            <QrScanner onScan={handleScan} />
          </div>
        )}

        {state.phase === "loading" && (
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="text-sm text-gray-500">Processing return…</p>
          </div>
        )}

        {state.phase === "success" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                <Undo2 className="size-5 text-green-600" strokeWidth={2} aria-hidden />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold text-green-700">Return processed</p>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-0.5 font-mono text-xs text-gray-600 shadow-card">
                    {state.serialNo}
                  </span>
                  {state.sku && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-xs text-gray-500 shadow-card">
                      {state.sku}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-red-600">−{state.pointsReversed} pts</span>
                  {" "}reversed from{" "}
                  <span className="font-semibold text-gray-900">{state.khatiName}</span>
                </p>

                {state.counterName && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Store className="size-3.5 shrink-0 text-brand" aria-hidden />
                    Processed at{" "}
                    <span className="font-medium text-gray-700">{state.counterName}</span>
                  </div>
                )}

                <p className="text-xs text-gray-400">QR code is now active and ready for resale.</p>
              </div>
            </div>
            <Button variant="secondary" onClick={reset}>
              Process another return
            </Button>
          </div>
        )}

        {state.phase === "error" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <X className="size-5 text-red-500" strokeWidth={2.5} aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-600">Return failed</p>
                <p className="mt-0.5 text-xs text-gray-500">{state.message}</p>
              </div>
            </div>
            <Button variant="secondary" onClick={reset}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
