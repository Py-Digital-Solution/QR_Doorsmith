"use client";

import { useState } from "react";
import { dispatchDraftAction } from "@/actions/dispatch";
import { Button } from "./ui/Button";

export function DispatchRowAction({ dispatchId }: { dispatchId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    const res = await dispatchDraftAction(dispatchId);
    if (res.error) setError(res.error);
    setPending(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" onClick={onClick} loading={pending}>
        {pending ? "Dispatching…" : "Dispatch"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
