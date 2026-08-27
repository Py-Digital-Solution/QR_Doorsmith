"use client";

import { useState, useTransition } from "react";
import { setFeatureToggleAction } from "@/actions/settings";

type ToggleProps = {
  settingKey: string;
  title: string;
  description: string;
  initial: boolean;
};

export function FeatureToggleItem({ settingKey, title, description, initial }: ToggleProps) {
  const [enabled, setEnabled] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const res = await setFeatureToggleAction(settingKey, next);
      if (res?.error) {
        setEnabled(!next);
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5">
      <div className="pr-4">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        disabled={pending}
        style={{ backgroundColor: enabled ? "var(--brand-color, #F97316)" : undefined }}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          enabled ? "" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function FeatureTogglesList({
  features,
}: {
  features: {
    distributor_enabled: boolean;
    dispatch_enabled: boolean;
    returns_enabled: boolean;
    redemptions_enabled: boolean;
    counter_rewards_enabled: boolean;
  };
}) {
  return (
    <div className="space-y-3">
      <FeatureToggleItem
        settingKey="dispatch_enabled"
        title="Dispatch Module"
        description="Enable product and box dispatch tracking to counters. Toggle off to hide dispatch features completely."
        initial={features.dispatch_enabled}
      />
      <FeatureToggleItem
        settingKey="returns_enabled"
        title="Returns & Point Reversals"
        description="Allow counters to process product returns and reverse awarded points."
        initial={features.returns_enabled}
      />
      <FeatureToggleItem
        settingKey="counter_rewards_enabled"
        title="Counter Rewards"
        description="Enable reward points for counters in addition to karigars."
        initial={features.counter_rewards_enabled}
      />
      <FeatureToggleItem
        settingKey="redemptions_enabled"
        title="Redemptions"
        description="Allow karigars and counters to request reward redemptions and settle points."
        initial={features.redemptions_enabled}
      />
      <FeatureToggleItem
        settingKey="distributor_enabled"
        title="Distributor Role"
        description="Allow distributor accounts to manage regional counters and view reports."
        initial={features.distributor_enabled}
      />
    </div>
  );
}
