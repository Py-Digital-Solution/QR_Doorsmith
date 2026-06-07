"use client";

import { useState, useTransition } from "react";
import { SlideOver } from "./SlideOver";
import { EditUserForm } from "./EditUserForm";
import { deleteUserAction } from "@/actions/users";
import type { UserDTO } from "@/services/users";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-2 text-sm">
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
    "rounded px-2 py-1 text-xs font-medium transition-colors";

  return (
    <div className="flex justify-end gap-1">
      <button
        onClick={() => setView(true)}
        className={`${btn} text-gray-600 hover:bg-gray-100`}
      >
        View
      </button>
      <button
        onClick={() => setEdit(true)}
        className={`${btn} text-brand-dark hover:bg-brand-light`}
      >
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
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold">Delete user</h3>
            <p className="mt-2 text-sm text-gray-600">
              Delete <span className="font-medium">{user.name || user.email || user.phone}</span>?
              This cannot be undone.
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirm(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                disabled={pending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
