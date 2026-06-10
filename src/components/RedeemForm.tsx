"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        <p className="text-sm font-medium text-green-700">Request submitted!</p>
        <p className="mt-1 text-xs text-green-600">Your counter will review and approve it.</p>
        <button
          onClick={() => setDone(false)}
          className="mt-3 text-xs text-brand-dark underline"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="number"
          min={minPoints > 0 ? minPoints : 1}
          max={currentPoints}
          value={points}
          onChange={(e) => { setPoints(e.target.value); setError(null); }}
          placeholder={`Points to redeem${minPoints > 0 ? ` (min ${minPoints})` : ""}`}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          disabled={pending || currentPoints === 0}
        />
        <button
          type="submit"
          disabled={pending || currentPoints === 0}
          className="whitespace-nowrap rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Request"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {currentPoints === 0 && (
        <p className="text-xs text-gray-400">Scan product QR codes to earn points first.</p>
      )}
    </form>
  );
}
