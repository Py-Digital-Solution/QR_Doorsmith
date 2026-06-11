"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RedemptionActions({ id }: { id: string }) {
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function act(action: "approve" | "reject") {
    setPending(action);
    setError(null);
    try {
      const res = await fetch(`/api/counter/redemptions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({ error: "Unexpected error." }));
      if (data.ok) {
        setDone(action === "approve" ? "approved" : "rejected");
        router.refresh();
      } else {
        setError(data.error ?? "Action failed.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setPending(null);
    }
  }

  if (done) {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${done === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
      >
        {done}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => act("approve")}
          disabled={!!pending}
          className="focus-ring rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white shadow-card transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {pending === "approve" ? "…" : "Approve"}
        </button>
        <button
          onClick={() => act("reject")}
          disabled={!!pending}
          className="focus-ring rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {pending === "reject" ? "…" : "Reject"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
