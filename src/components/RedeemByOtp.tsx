"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Check } from "lucide-react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";

type Preview = { id: string; khatiName: string; khatiPhone: string; points: number };

/**
 * Walk-in redemption: a counter enters the OTP the karigar shows on their phone,
 * previews the request, and confirms — works for any karigar, even one
 * registered at a different counter.
 */
export function RedeemByOtp() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    setOtp("");
    setPreview(null);
    setError(null);
    setDone(false);
  }

  async function lookup() {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP from the karigar."); return; }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/counter/redemptions/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected error." }));
      if (data.ok) setPreview(data.redemption as Preview);
      else setError(data.error ?? "Lookup failed.");
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/counter/redemptions/${preview.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", otp }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected error." }));
      if (data.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(data.error ?? "Could not complete redemption.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand/20 bg-brand-light/40 p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Gift className="size-4 text-brand-dark" aria-hidden />
        <h2 className="text-sm font-semibold text-gray-900">Redeem by OTP</h2>
        <span className="text-xs text-gray-500">— any karigar, any counter</span>
      </div>

      {done ? (
        <div className="flex items-center justify-between gap-3">
          <Alert variant="success" className="flex-1">
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" aria-hidden />
              Redeemed {preview?.points} pts for {preview?.khatiName || "the karigar"}.
            </span>
          </Alert>
          <Button variant="secondary" size="sm" onClick={reset}>New</Button>
        </div>
      ) : !preview ? (
        <div className="flex flex-wrap items-start gap-2">
          <Input
            value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
            placeholder="6-digit OTP"
            maxLength={6}
            inputMode="numeric"
            pattern="\d{6}"
            className="w-40 font-mono tracking-widest"
            onKeyDown={(e) => { if (e.key === "Enter") lookup(); }}
            autoComplete="one-time-code"
          />
          <Button size="sm" onClick={lookup} loading={pending} disabled={otp.length !== 6}>
            {pending ? "Checking…" : "Find"}
          </Button>
          {error && <Alert variant="error" className="w-full">{error}</Alert>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div>
              <p className="font-medium text-gray-900">{preview.khatiName || "Karigar"}</p>
              {preview.khatiPhone && <p className="text-xs text-gray-400">{preview.khatiPhone}</p>}
            </div>
            <p className="text-xl font-bold text-brand">{preview.points} pts</p>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex gap-2">
            <Button size="sm" onClick={confirm} loading={pending}>
              {pending ? "Redeeming…" : `Confirm — redeem ${preview.points} pts`}
            </Button>
            <Button variant="secondary" size="sm" onClick={reset} disabled={pending}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
