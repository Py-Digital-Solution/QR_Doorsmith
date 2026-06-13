"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "./ui/Input";

export function RedemptionActions({ id }: { id: string }) {
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function act(action: "approve" | "reject") {
    if (action === "approve" && otp.trim().length !== 6) {
      setError("Enter the 6-digit OTP from the khati.");
      return;
    }
    setPending(action);
    setError(null);
    try {
      const body = action === "approve" ? { action, otp: otp.trim() } : { action };
      const res = await fetch(`/api/counter/redemptions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    <div className="space-y-2">
      <Input
        value={otp}
        onChange={(e) => {
          setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
          setError(null);
        }}
        placeholder="OTP from khati"
        maxLength={6}
        inputMode="numeric"
        pattern="\d{6}"
        className="w-36 font-mono tracking-widest text-center"
      />
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
