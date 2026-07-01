"use client";

import { Input } from "./ui/Input";
import { Label } from "./ui/Field";

/** A column-count field that auto-recommends a value (based on page size + QR
 * size) until the user manually overrides it, with a one-click way back. */
export function ColumnField({
  label,
  name,
  value,
  onChange,
  recommended,
  touched,
  onReset,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  recommended: number;
  touched: boolean;
  onReset: () => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        name={name}
        type="number"
        min={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
      />
      <p className="mt-1 text-[11px] text-gray-400">
        {touched && Number(value) !== recommended ? (
          <>
            Recommended {recommended}{" "}
            <button type="button" onClick={onReset} className="font-medium text-brand hover:underline">
              use it
            </button>
          </>
        ) : (
          "Auto-fitted to page width"
        )}
      </p>
    </div>
  );
}
