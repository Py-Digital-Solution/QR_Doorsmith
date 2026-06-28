"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { settleCounterAction } from "@/actions/settlement";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

export function SettleCounterButton({
  counterId,
  counterName,
  outstandingPoints,
}: {
  counterId: string;
  counterName: string;
  outstandingPoints: number;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const disabled = outstandingPoints <= 0;

  function settle() {
    setError(null);
    startTransition(async () => {
      const res = await settleCounterAction(counterId, note);
      if (res?.error) {
        setError(res.error);
      } else {
        setOpen(false);
        setNote("");
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant={disabled ? "secondary" : "primary"}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {disabled ? "Nothing due" : "Settle up"}
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-brand/30 bg-brand-light/40 p-3">
      <p className="text-xs text-gray-600">
        Settle <span className="font-semibold text-brand-dark">{outstandingPoints} pts</span> with{" "}
        <span className="font-medium">{counterName}</span>? This marks all their outstanding
        redemptions as reimbursed.
      </p>
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional) — e.g. paid via UPI"
        className="text-xs"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={pending} onClick={settle}>
          {pending ? "Settling…" : "Confirm settle"}
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
