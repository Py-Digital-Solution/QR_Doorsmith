"use client";

import { useState, useTransition } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { SlideOver } from "./SlideOver";
import { EditUserForm } from "./EditUserForm";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { deleteUserAction } from "@/actions/users";
import type { UserDTO } from "@/services/users";

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
}: {
  user: UserDTO;
  isSelf: boolean;
}) {
  const [view, setView] = useState(false);
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteUserAction(user.id);
      if (res?.error) setError(res.error);
      else setConfirm(false);
    });
  }

  const btn =
    "focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors";

  return (
    <div className="flex justify-end gap-1">
      <button
        onClick={() => setView(true)}
        className={`${btn} text-gray-600 hover:bg-gray-100`}
      >
        <Eye className="size-3.5" aria-hidden />
        View
      </button>
      <button
        onClick={() => setEdit(true)}
        className={`${btn} text-brand-dark hover:bg-brand-light`}
      >
        <Pencil className="size-3.5" aria-hidden />
        Edit
      </button>
      {!isSelf && (
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

      {/* View */}
      <SlideOver open={view} onClose={() => setView(false)} title="User details">
        <div className="space-y-1">
          <Detail label="Name" value={user.name} />
          <Detail label="Role" value={user.role} />
          <Detail label="Email" value={user.email} />
          <Detail label="Phone" value={user.phone} />
          <Detail label="Status" value={user.status} />
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
