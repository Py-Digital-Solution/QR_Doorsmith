"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/SlideOver";
import { KycActions } from "@/components/KycActions";
import type { PendingKhatiDTO } from "@/services/kyc";

const STATUS_LABEL: Record<string, string> = {
  pending_counter: "Awaiting counter",
  pending_sales_rep: "Awaiting sales rep",
  pending_admin: "Awaiting admin",
  approved: "Approved",
  rejected: "Rejected",
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-2.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="max-w-[55%] text-right font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}

export function KycCard({ khati, showStatus, readOnly }: { khati: PendingKhatiDTO; showStatus?: boolean; readOnly?: boolean }) {
  const [viewOpen, setViewOpen] = useState(false);

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5">
        <div className="flex items-start gap-4">
          <Avatar name={khati.name} photoUrl={khati.photoUrl} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-gray-900">{khati.name}</p>
              {showStatus && (
                <Badge tone="yellow">{STATUS_LABEL[khati.kycStatus] ?? khati.kycStatus}</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">{khati.phone}</p>
            {khati.dob && (
              <p className="mt-1 text-xs text-gray-500">
                DOB:{" "}
                {new Date(khati.dob).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            {khati.address && (
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{khati.address}</p>
            )}
            {khati.submittedAt && (
              <p className="mt-1 text-xs text-gray-400">
                Submitted {new Date(khati.submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </p>
            )}
          </div>
          <button
            onClick={() => setViewOpen(true)}
            className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            <Eye className="size-3.5" aria-hidden />
            View
          </button>
        </div>
        {!readOnly && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <KycActions khatiId={khati.id} khatiName={khati.name} />
          </div>
        )}
      </div>

      <SlideOver open={viewOpen} onClose={() => setViewOpen(false)} title="Karigar Details">
        <div className="flex flex-col gap-5">
          {khati.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={khati.photoUrl}
              alt={khati.name}
              className="h-32 w-32 rounded-full object-cover shadow-card mx-auto"
            />
          ) : (
            <div className="mx-auto">
              <Avatar name={khati.name} size={80} />
            </div>
          )}
          <div className="space-y-0.5">
            <Detail label="Name" value={khati.name} />
            <Detail label="Phone" value={khati.phone} />
            <Detail
              label="Date of Birth"
              value={
                khati.dob
                  ? new Date(khati.dob).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"
              }
            />
            <Detail label="Address" value={khati.address ?? "—"} />
            <Detail label="KYC Status" value={STATUS_LABEL[khati.kycStatus] ?? khati.kycStatus} />
            {khati.submittedAt && (
              <Detail
                label="Submitted At"
                value={new Date(khati.submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              />
            )}
          </div>
        </div>
      </SlideOver>
    </>
  );
}
