"use client";

import { useState } from "react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

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
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5">
      <p className="text-sm font-medium text-gray-900">Minimum redemption points</p>
      <p className="mb-3 text-sm text-gray-500">
        Khatis must have at least this many points to submit a redemption request. Set to 0 for no minimum.
      </p>
      <form onSubmit={save} className="flex items-center gap-3">
        <Input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); setSaved(false); }}
          className="w-32"
          disabled={pending}
        />
        <Button type="submit" loading={pending}>
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
