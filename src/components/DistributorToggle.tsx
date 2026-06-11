"use client";

import { useState, useTransition } from "react";
import { setDistributorEnabledAction } from "@/actions/settings";

export function DistributorToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next); // optimistic
    setError(null);
    startTransition(async () => {
      const res = await setDistributorEnabledAction(next);
      if (res?.error) {
        setEnabled(!next); // revert
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5">
      <div>
        <p className="text-sm font-medium text-gray-900">Distributor role</p>
        <p className="text-sm text-gray-500">
          When off, distributor accounts cannot be created or sign in (SOW 1.2).
        </p>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        disabled={pending}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          enabled ? "bg-brand" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
