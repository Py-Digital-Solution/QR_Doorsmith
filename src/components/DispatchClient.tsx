"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createDispatchAction, type ActionState } from "@/actions/dispatch";
import { QrScanner } from "./QrScanner";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

type CodeHit = { id: string; serialNo: string; type: string; sku: string };

export function DispatchClient({
  counters,
}: {
  counters: { id: string; label: string }[];
}) {
  const [serials, setSerials] = useState<string[]>([]);
  const [counterId, setCounterId] = useState(counters[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CodeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [state, setState] = useState<ActionState>({});
  const [pending, setPending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  function add(s: string) {
    const v = s.trim();
    if (!v) return;
    setSerials((prev) => (prev.includes(v) ? prev : [...prev, v]));
  }
  function remove(s: string) {
    setSerials((prev) => prev.filter((x) => x !== s));
  }

  // Live search — type is inferred server-side from the serial prefix.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/qr/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = await res.json().catch(() => ({ items: [] }));
        if (active) setResults(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(hit: CodeHit) {
    add(hit.serialNo);
    setQuery("");
    setOpen(false);
  }

  async function submit() {
    setPending(true);
    setState({});
    const res = await createDispatchAction({ counterId, serials });
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

  const available = results.filter((r) => !serials.includes(r.serialNo));

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

      {/* Searchable picker — no type dropdown, prefix identifies type */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Add QR codes
        </label>
        <div className="flex gap-2">
          <div ref={boxRef} className="relative flex-1">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="MS- master · SM- small · PD- product"
              className={field}
            />

            {open && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                {searching && (
                  <p className="px-3 py-2 text-xs text-gray-400">Searching…</p>
                )}
                {!searching && available.length === 0 && (
                  <p className="px-3 py-2 text-xs text-gray-400">
                    No undispatched codes found.
                  </p>
                )}
                {available.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    onClick={() => pick(hit)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-brand-light"
                  >
                    <span className="font-mono">{hit.serialNo}</span>
                    <span className="text-xs text-gray-500">{hit.sku || "—"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setScanning((s) => !s)}
            className="whitespace-nowrap rounded-md border border-gray-300 px-3 text-sm hover:bg-gray-50"
          >
            {scanning ? "Stop" : "Camera"}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          MS- master box · SM- small box · PD- product. Contents dispatched along with it.
        </p>
        {scanning && (
          <div className="mt-3">
            <QrScanner onScan={(t) => add(t)} />
          </div>
        )}
      </div>

      {/* Selected list */}
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
        {pending ? "Dispatching…" : `Dispatch ${serials.length} item(s)`}
      </button>
    </div>
  );
}
