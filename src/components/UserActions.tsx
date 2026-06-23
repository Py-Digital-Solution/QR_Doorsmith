"use client";

import { useState, useTransition } from "react";
import { Eye, Pencil, Trash2, Send } from "lucide-react";
import { SlideOver } from "./SlideOver";
import { EditUserForm } from "./EditUserForm";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { Badge, statusTone } from "./ui/Badge";
import { Avatar } from "./Avatar";
import { deleteUserAction, resendRegistrationLinkAction } from "@/actions/users";
import type { UserDTO } from "@/services/users";

const KYC_LABEL: Record<string, { label: string; tone: "green" | "yellow" | "red" | "gray" }> = {
  not_submitted:   { label: "Not submitted",          tone: "gray"   },
  pending_counter: { label: "Pending counter",         tone: "yellow" },
  pending_sales_rep: { label: "Pending sales rep",     tone: "yellow" },
  pending_admin:   { label: "Pending admin approval",  tone: "yellow" },
  approved:        { label: "Approved",                tone: "green"  },
  rejected:        { label: "Rejected",                tone: "red"    },
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-2.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}

export function UserActions({
  user,
  isSelf,
  hideDelete = false,
  hideEdit = false,
}: {
  user: UserDTO;
  isSelf: boolean;
  hideDelete?: boolean;
  hideEdit?: boolean;
}) {
  const [view, setView] = useState(false);
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteUserAction(user.id);
      if (res?.error) setError(res.error);
      else setConfirm(false);
    });
  }

  function onResend() {
    setResendState("sending");
    startTransition(async () => {
      const res = await resendRegistrationLinkAction(user.id);
      setResendState(res.ok ? "sent" : "error");
      if (res.error) setError(res.error);
    });
  }

  const isKhatiPending = user.role === "khati" && user.kycStatus !== "approved";

  const btn =
    "focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors";

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {isKhatiPending && (
        <button
          onClick={onResend}
          disabled={resendState === "sending" || resendState === "sent"}
          title={resendState === "sent" ? "Link sent!" : "Resend registration link via WhatsApp"}
          className={`${btn} ${
            resendState === "sent"
              ? "text-green-600 hover:bg-green-50"
              : "text-blue-600 hover:bg-blue-50"
          }`}
        >
          <Send className="size-3.5" aria-hidden />
          {resendState === "sending" ? "Sending…" : resendState === "sent" ? "Sent!" : "Resend Link"}
        </button>
      )}
      <button
        onClick={() => setView(true)}
        className={`${btn} text-gray-600 hover:bg-gray-100`}
      >
        <Eye className="size-3.5" aria-hidden />
        View
      </button>
      {!hideEdit && (
        <button
          onClick={() => setEdit(true)}
          className={`${btn} text-brand-dark hover:bg-brand-light`}
        >
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </button>
      )}
      {!isSelf && !hideDelete && (
        <button
          onClick={() => {
            setError(null);
            setConfirm(true);
          }}
          className={`${btn} text-red-600 hover:bg-red-50`}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Delete
        </button>
      )}

      {resendState === "error" && error && (
        <p className="w-full text-right text-xs text-red-500">{error}</p>
      )}

      {/* View */}
      <SlideOver open={view} onClose={() => setView(false)} title="User details">
        <div className="flex flex-col gap-5">
          <div className="flex justify-center">
            <Avatar name={user.name} photoUrl={user.photoUrl} size={80} />
          </div>
          <div className="space-y-0.5">
            <Detail label="Name" value={user.name} />
            {user.displayId && <Detail label="ID" value={user.displayId} />}
            <Detail label="Role" value={user.role} />
            <Detail label="Email" value={user.email} />
            <Detail label="Phone" value={user.phone || "—"} />
            <div className="flex justify-between border-b border-gray-100 py-2.5 text-sm">
              <span className="text-gray-500">Status</span>
              <Badge tone={statusTone(user.status)}>{user.status}</Badge>
            </div>
            {user.role === "khati" && user.kycStatus && (() => {
              const kyc = KYC_LABEL[user.kycStatus] ?? { label: user.kycStatus, tone: "gray" as const };
              return (
                <div className="flex justify-between border-b border-gray-100 py-2.5 text-sm">
                  <span className="text-gray-500">KYC Approval</span>
                  <Badge tone={kyc.tone}>{kyc.label}</Badge>
                </div>
              );
            })()}
          </div>
        </div>
      </SlideOver>

      {/* Edit */}
      <SlideOver open={edit} onClose={() => setEdit(false)} title="Edit user">
        <EditUserForm user={user} onSuccess={() => setEdit(false)} />
      </SlideOver>

      {/* Delete confirm */}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete user"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirm(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete} loading={pending}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Delete{" "}
          <span className="font-medium">
            {user.name || user.email || user.phone}
          </span>
          ? This cannot be undone.
        </p>
        {error && (
          <Alert variant="error" className="mt-3">
            {error}
          </Alert>
        )}
      </Modal>
    </div>
  );
}
