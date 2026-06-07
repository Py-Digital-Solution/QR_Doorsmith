"use client";

import { useState } from "react";
import Link from "next/link";
import { createDispatchAction, type ActionState } from "@/actions/dispatch";
import { QrScanner } from "./QrScanner";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export function DispatchClient({
  counters,
}: {
  counters: { id: string; label: string }[];
}) {
  const [serials, setSerials] = useState<string[]>([]);
  const [counterId, setCounterId] = useState(counters[0]?.id ?? "");
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const [state, setState] = useState<ActionState>({});
  const [pending, setPending] = useState(false);

  function add(s: string) {
    const v = s.trim();
    if (!v) return;
    setSerials((prev) => (prev.includes(v) ? prev : [...prev, v]));
  }
  function remove(s: string) {
    setSerials((prev) => prev.filter((x) => x !== s));
  }
  function addManual() {
    add(manual);
    setManual("");
  }

  async function submit() {
    setPending(true);
    setState({});
    const res = await createDispatchAction({ counterId, masterSerials: serials });
    setState(res);
    if (res.ok) setSerials([]);
    setPending(false);
  }

  if (counters.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Create a counter first (Users → Create user → Counter), then dispatch stock to it.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold">New dispatch</h2>

      {/* Counter */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Destination counter
        </label>
        <select
          value={counterId}
          onChange={(e) => setCounterId(e.target.value)}
          className={field}
        >
          {counters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Scan / add masters */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Master box QR
        </label>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addManual();
              }
            }}
            placeholder="Scan with a scanner or type the serial (DS-…)"
            className={field}
          />
          <button
            type="button"
            onClick={addManual}
            className="rounded-md border border-gray-300 px-3 text-sm hover:bg-gray-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setScanning((s) => !s)}
            className="whitespace-nowrap rounded-md border border-gray-300 px-3 text-sm hover:bg-gray-50"
          >
            {scanning ? "Stop" : "Camera"}
          </button>
        </div>
        {scanning && (
          <div className="mt-3">
            <QrScanner onScan={(t) => add(t)} />
          </div>
        )}
      </div>

      {/* Scanned list */}
      {serials.length > 0 && (
        <div className="rounded-md border border-gray-200">
          {serials.map((s) => (
            <div
              key={s}
              className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-sm last:border-0"
            >
              <span className="font-mono">{s}</span>
              <button
                type="button"
                onClick={() => remove(s)}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="text-sm text-green-600">
          Dispatched ✓ Bill {state.billNo} · {state.total} codes ·{" "}
          <Link
            href={`/admin/dispatch/${state.dispatchId}/bill`}
            target="_blank"
            className="font-medium underline"
          >
            Print bill
          </Link>
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || serials.length === 0}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Dispatching…" : `Dispatch ${serials.length} box(es)`}
      </button>
    </div>
  );
}
