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
  const [done, setDone] = useState(false);
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
        setDone(true);
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

  if (done) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
        <CircleCheck className="mx-auto mb-1 size-6 text-green-600" aria-hidden />
        <p className="text-sm font-medium text-green-700">Request submitted!</p>
        <p className="mt-1 text-xs text-green-600">Your counter will review and approve it.</p>
        <button
          onClick={() => setDone(false)}
          className="mt-3 text-xs font-medium text-brand-dark underline"
        >
          Submit another
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
