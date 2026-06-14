"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { approveKycAction, rejectKycAction } from "@/actions/kyc";
import { Button } from "@/components/ui/Button";

export function KycActions({ khatiId, khatiName }: { khatiId: string; khatiName: string }) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    const result = await approveKycAction(khatiId);
    setLoading(null);
    if (result.ok) setDone("approved");
    else setError(result.error ?? "Failed");
  }

  async function handleReject() {
    setLoading("reject");
    setError(null);
    const result = await rejectKycAction(khatiId, reason);
    setLoading(null);
    if (result.ok) { setDone("rejected"); setShowReject(false); }
    else setError(result.error ?? "Failed");
  }

  if (done === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
        <CheckCircle2 className="size-3.5" /> Approved
      </span>
    );
  }
  if (done === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        <XCircle className="size-3.5" /> Rejected
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          loading={loading === "approve"}
          disabled={!!loading}
          onClick={handleApprove}
        >
          <CheckCircle2 className="size-3.5" /> Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={!!loading}
          onClick={() => setShowReject(true)}
        >
          <XCircle className="size-3.5" /> Reject
        </Button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Reject reason modal */}
      {showReject && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowReject(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Reject {khatiName}?</h2>
              <button onClick={() => setShowReject(false)} className="text-gray-400 hover:text-gray-600">
                <X className="size-4" />
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="Reason for rejection (sent to khati via WhatsApp)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowReject(false)}>Cancel</Button>
              <Button
                variant="danger"
                size="sm"
                loading={loading === "reject"}
                onClick={handleReject}
              >
                Confirm reject
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
