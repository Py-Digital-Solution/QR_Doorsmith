"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateQrCodeAction, deleteQrCodeAction } from "@/actions/qr";
import type { BatchCodeDTO } from "@/services/qr";
import type { QrStatus } from "@/lib/qr";

const btn =
  "focus-ring rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50";

/** Buttons that set a specific target status. */
const STATUS_ACTIONS: Partial<
  Record<QrStatus, { label: string; next: QrStatus; cls: string }[]>
> = {
  inactive: [
    { label: "Activate",  next: "active",   cls: "text-green-700 hover:bg-green-50" },
    { label: "Disable",   next: "disabled",  cls: "text-gray-600 hover:bg-gray-100" },
  ],
  active: [
    { label: "Deactivate", next: "inactive", cls: "text-brand-dark hover:bg-brand-light" },
    { label: "Disable",    next: "disabled", cls: "text-gray-600 hover:bg-gray-100" },
  ],
  disabled: [
    { label: "Enable",    next: "inactive",  cls: "text-brand-dark hover:bg-brand-light" },
    { label: "Activate",  next: "active",    cls: "text-green-700 hover:bg-green-50" },
  ],
  scanned: [
    { label: "Reset",     next: "inactive",  cls: "text-brand-dark hover:bg-brand-light" },
    { label: "Disable",   next: "disabled",  cls: "text-gray-600 hover:bg-gray-100" },
  ],
  returned: [
    { label: "Reactivate", next: "reactivated", cls: "text-green-700 hover:bg-green-50" },
    { label: "Disable",    next: "disabled",    cls: "text-gray-600 hover:bg-gray-100" },
  ],
  reactivated: [
    { label: "Deactivate", next: "inactive", cls: "text-brand-dark hover:bg-brand-light" },
    { label: "Disable",    next: "disabled", cls: "text-gray-600 hover:bg-gray-100" },
  ],
};

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

  function setStatus(next: QrStatus) {
    setError(null);
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
      else { setConfirm(false); router.refresh(); }
    });
  }

  const actions = STATUS_ACTIONS[code.status as QrStatus] ?? [];

  return (
    <div className="flex items-center justify-end gap-1">
      {error && <span className="mr-1 text-xs text-red-600">{error}</span>}

      {actions.map((a) => (
        <button
          key={a.next}
          onClick={() => setStatus(a.next)}
          disabled={pending}
          className={`${btn} ${a.cls}`}
        >
          {a.label}
        </button>
      ))}

      {/* Delete — only for codes that haven't left the warehouse */}
      {!code.locked && (
        confirm ? (
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
        )
      )}
    </div>
  );
}
