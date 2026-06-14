"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { WaLogItem } from "@/services/walog";

const TYPE_TONE: Record<string, "blue" | "green" | "gray"> = {
  otp: "blue",
  welcome: "green",
};

export function WaLogTable({
  items,
  page,
  pageCount,
  total,
  basePath,
}: {
  items: WaLogItem[];
  page: number;
  pageCount: number;
  total: number;
  basePath: string;
}) {
  const [selected, setSelected] = useState<WaLogItem | null>(null);

  return (
    <>
      {items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 shadow-card">
          No messages sent yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-card">
          <div className="divide-y divide-gray-100">
            {items.map((log) => (
              <button
                key={log.id}
                onClick={() => setSelected(log)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="mt-0.5 shrink-0">
                  {log.status === "sent" ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <XCircle className="size-4 text-red-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium text-gray-700">{log.phone}</span>
                    <Badge tone={TYPE_TONE[log.type] ?? "gray"}>{log.type}</Badge>
                    {log.status === "failed" && <Badge tone="red">failed</Badge>}
                    <span className="ml-auto text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{log.messagePreview}</p>
                  {log.error && <p className="mt-0.5 text-xs text-red-500 truncate">{log.error}</p>}
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">{total} message{total !== 1 ? "s" : ""}</p>
            <div className="flex items-center gap-1">
              <a
                href={`${basePath}&waPage=${page - 1}`}
                aria-disabled={page <= 1}
                className={`flex size-7 items-center justify-center rounded border text-gray-600 transition-colors ${
                  page <= 1 ? "pointer-events-none opacity-40" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <ChevronLeft className="size-4" />
              </a>
              <span className="min-w-[4rem] text-center text-xs text-gray-600">
                {page} / {pageCount}
              </span>
              <a
                href={`${basePath}&waPage=${page + 1}`}
                aria-disabled={page >= pageCount}
                className={`flex size-7 items-center justify-center rounded border text-gray-600 transition-colors ${
                  page >= pageCount ? "pointer-events-none opacity-40" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <ChevronRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Message details</h2>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Status */}
              <div className="flex items-center gap-2">
                {selected.status === "sent" ? (
                  <CheckCircle2 className="size-5 text-green-500" />
                ) : (
                  <XCircle className="size-5 text-red-500" />
                )}
                <span className={`text-sm font-semibold ${selected.status === "sent" ? "text-green-700" : "text-red-700"}`}>
                  {selected.status === "sent" ? "Delivered" : "Failed"}
                </span>
                <Badge tone={TYPE_TONE[selected.type] ?? "gray"}>{selected.type}</Badge>
              </div>

              {/* Meta */}
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-mono font-medium text-gray-800">{selected.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-gray-800">{selected.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sent at</span>
                  <span className="text-gray-800">{new Date(selected.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Error */}
              {selected.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="mb-1 text-xs font-semibold text-red-700">Error</p>
                  <p className="text-xs text-red-600">{selected.error}</p>
                </div>
              )}

              {/* Full message */}
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-700">Message</p>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                    {selected.message}
                  </pre>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-5 py-4">
              <Button variant="secondary" fullWidth onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
