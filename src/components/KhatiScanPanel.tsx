"use client";

import { useState, useCallback } from "react";
import { QrScanner } from "./QrScanner";

type ScanState =
  | { phase: "scanning" }
  | { phase: "loading"; serialNo: string }
  | { phase: "success"; serialNo: string; sku: string; pointsEarned: number; newBalance: number }
  | { phase: "error"; message: string };

export function KhatiScanPanel() {
  const [state, setState] = useState<ScanState>({ phase: "scanning" });

  const handleScan = useCallback(async (text: string) => {
    if (state.phase === "loading") return;
    const serialNo = text.trim();
    if (!serialNo) return;

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
        });
      } else {
        setState({ phase: "error", message: data.error ?? "Scan failed." });
      }
    } catch {
      setState({ phase: "error", message: "Network error. Please try again." });
    }
  }, [state.phase]);

  function reset() {
    setState({ phase: "scanning" });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera — always mounted so it stays warm; overlay covers it on result */}
      <div className="relative w-full max-w-xs">
        <QrScanner onScan={handleScan} />

        {state.phase !== "scanning" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/95 p-4 text-center">
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
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-green-700">Points Earned!</p>
                <p className="mt-1 text-3xl font-bold text-brand">+{state.pointsEarned}</p>
                {state.sku && <p className="mt-1 text-xs text-gray-500">{state.sku}</p>}
                <p className="mt-2 text-xs text-gray-400">
                  Balance: <span className="font-semibold text-gray-700">{state.newBalance}</span>
                </p>
                <button
                  onClick={reset}
                  className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
                >
                  Scan next
                </button>
              </>
            )}

            {state.phase === "error" && (
              <>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-red-600">Scan failed</p>
                <p className="mt-1 text-xs text-gray-500">{state.message}</p>
                <button
                  onClick={reset}
                  className="mt-4 rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Try again
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {state.phase === "scanning" && (
        <p className="text-center text-xs text-gray-400">
          Point the camera at a product QR code
        </p>
      )}
    </div>
  );
}
