"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateQrCodeAction, deleteQrCodeAction } from "@/actions/qr";
import type { BatchCodeDTO } from "@/services/qr";

export function QrCodeActions({
  code,
  batchId,
}: {
  code: BatchCodeDTO;
  batchId: string;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (code.locked) {
    return <span className="text-xs text-gray-400">Locked</span>;
  }

  function toggleDisabled() {
    setError(null);
    const next = code.status === "disabled" ? "inactive" : "disabled";
    startTransition(async () => {
      const res = await updateQrCodeAction(code.id, { status: next }, batchId);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteQrCodeAction(code.id, batchId);
      if (res?.error) setError(res.error);
      else {
        setConfirm(false);
        router.refresh();
      }
    });
  }

  const btn = "rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50";

  return (
    <div className="flex items-center justify-end gap-1">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        onClick={toggleDisabled}
        disabled={pending}
        className={`${btn} text-brand-dark hover:bg-brand-light`}
      >
        {code.status === "disabled" ? "Enable" : "Disable"}
      </button>
      {confirm ? (
        <>
          <button
            onClick={onDelete}
            disabled={pending}
            className={`${btn} bg-red-600 text-white hover:bg-red-700`}
          >
            {pending ? "…" : "Confirm"}
          </button>
          <button
            onClick={() => setConfirm(false)}
            className={`${btn} text-gray-600 hover:bg-gray-100`}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className={`${btn} text-red-600 hover:bg-red-50`}
        >
          Delete
        </button>
      )}
    </div>
  );
}
