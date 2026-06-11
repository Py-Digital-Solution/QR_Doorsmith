"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, X } from "lucide-react";
import { createDispatchAction, type ActionState } from "@/actions/dispatch";
import { QrScanner } from "./QrScanner";
import { Input, Select } from "./ui/Input";
import { Label } from "./ui/Field";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";

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
    <div className="max-w-2xl space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5">
      <h2 className="text-sm font-semibold text-gray-900">New dispatch</h2>

      {/* Counter */}
      <div>
        <Label>Destination counter</Label>
        <Select value={counterId} onChange={(e) => setCounterId(e.target.value)}>
          {counters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Searchable picker — no type dropdown, prefix identifies type */}
      <div>
        <Label>Add QR codes</Label>
        <div className="flex gap-2">
          <div ref={boxRef} className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="MS- master · SM- small · PD- product"
            />

            {open && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-overlay">
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
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-brand-light"
                  >
                    <span className="font-mono">{hit.serialNo}</span>
                    <span className="text-xs text-gray-500">{hit.sku || "—"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setScanning((s) => !s)}
            className="whitespace-nowrap"
          >
            <Camera className="size-4" aria-hidden />
            {scanning ? "Stop" : "Camera"}
          </Button>
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
                className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-red-600 transition-colors hover:bg-red-50"
              >
                <X className="size-3" aria-hidden />
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.ok && (
        <Alert variant="success">
          Dispatched ✓ Bill {state.billNo} · {state.total} codes ·{" "}
          <Link
            href={`/admin/dispatch/${state.dispatchId}/bill`}
            target="_blank"
            className="font-medium underline"
          >
            Print bill
          </Link>
        </Alert>
      )}

      <Button
        type="button"
        onClick={submit}
        loading={pending}
        disabled={serials.length === 0}
      >
        {pending ? "Dispatching…" : `Dispatch ${serials.length} item(s)`}
      </Button>
    </div>
  );
}
