"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/SlideOver";
import type { AuditLogDTO } from "@/services/audit";

const ACTION_TONE: Record<string, "green" | "red" | "yellow" | "blue" | "gray"> = {
  kyc_approve: "green",
  kyc_reject: "red",
  kyc_submit: "blue",
  user_create: "green",
  user_update: "blue",
  user_delete: "red",
  qr_batch_create: "blue",
  dispatch_create: "blue",
  return_create: "yellow",
  return_approve: "green",
  return_reject: "red",
  redemption_request: "yellow",
  redemption_settle: "green",
  redemption_reject: "red",
  scan_qr: "gray",
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-2.5 text-sm">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className="ml-4 break-all text-right font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}

export function AuditLogTable({ logs }: { logs: AuditLogDTO[] }) {
  const [selected, setSelected] = useState<AuditLogDTO | null>(null);

  if (logs.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-400">No audit log entries found.</p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-card">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Actor</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{log.actorName}</p>
                  <p className="text-xs text-gray-400">{log.actorRole}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={ACTION_TONE[log.action] ?? "gray"}>
                    {log.action.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {log.entityType || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSelected(log)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <Eye className="size-3.5" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlideOver open={!!selected} onClose={() => setSelected(null)} title="Audit Event">
        {selected && (
          <div className="space-y-0.5">
            <Detail label="Time" value={new Date(selected.createdAt).toLocaleString()} />
            <Detail label="Actor" value={`${selected.actorName} (${selected.actorRole})`} />
            <Detail label="Action" value={selected.action.replace(/_/g, " ")} />
            <Detail label="Entity type" value={selected.entityType} />
            <Detail label="Entity ID" value={selected.entityId} />
            {Object.entries(selected.meta).map(([k, v]) => (
              <Detail key={k} label={k} value={String(v ?? "")} />
            ))}
          </div>
        )}
      </SlideOver>
    </>
  );
}
