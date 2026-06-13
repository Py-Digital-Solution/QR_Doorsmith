"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

export function RedeemForm({
  currentPoints,
  minPoints,
}: {
  currentPoints: number;
  minPoints: number;
}) {
  const [points, setPoints] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [otp, setOtp] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(points);
    if (!n || n < 1) { setError("Enter a valid amount."); return; }
    if (minPoints > 0 && n < minPoints) { setError(`Minimum is ${minPoints} points.`); return; }
    if (n > currentPoints) { setError("Not enough points."); return; }

    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/khati/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: n }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected error." }));
      if (data.ok) {
        setOtp(data.otp ?? null);
        setPoints("");
        router.refresh();
      } else {
        setError(data.error ?? "Request failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (otp) {
    return (
      <div className="rounded-lg border border-brand/30 bg-brand-light p-5 text-center">
        <CircleCheck className="mx-auto mb-2 size-7 text-brand" aria-hidden />
        <p className="font-semibold text-gray-900">Redemption request sent!</p>
        <p className="mt-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
          Your OTP — show this to your counter
        </p>
        <div className="mt-2 rounded-xl border-2 border-brand/40 bg-white py-3 px-6 inline-block">
          <span className="font-mono text-4xl font-bold tracking-[0.25em] text-brand">
            {otp}
          </span>
        </div>
        <p className="mt-3 text-xs text-gray-400">Valid for 30 minutes</p>
        <button
          onClick={() => setOtp(null)}
          className="mt-4 text-xs font-medium text-brand-dark underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="number"
          min={minPoints > 0 ? minPoints : 1}
          max={currentPoints}
          value={points}
          onChange={(e) => { setPoints(e.target.value); setError(null); }}
          placeholder={`Points to redeem${minPoints > 0 ? ` (min ${minPoints})` : ""}`}
          disabled={pending || currentPoints === 0}
        />
        <Button
          type="submit"
          loading={pending}
          disabled={currentPoints === 0}
          className="whitespace-nowrap"
        >
          {pending ? "Submitting…" : "Request"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {currentPoints === 0 && (
        <p className="text-xs text-gray-400">Scan product QR codes to earn points first.</p>
      )}
    </form>
  );
}
