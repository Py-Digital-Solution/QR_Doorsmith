"use client";

import { useState } from "react";

export function MinPointsForm({ initial }: { initial: number }) {
  const [value, setValue] = useState(String(initial));
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) {
      setError("Enter 0 or a positive whole number.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "min_redemption_points", value: n }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected error." }));
      if (data.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(data.error ?? "Failed to save.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium">Minimum redemption points</p>
      <p className="mb-3 text-sm text-gray-500">
        Khatis must have at least this many points to submit a redemption request. Set to 0 for no minimum.
      </p>
      <form onSubmit={save} className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); setSaved(false); }}
          className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
