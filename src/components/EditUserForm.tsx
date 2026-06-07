"use client";

import { useActionState, useEffect } from "react";
import { updateUserAction, type ActionState } from "@/actions/users";
import { USER_STATUSES } from "@/lib/roles";
import type { UserDTO } from "@/services/users";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export function EditUserForm({
  user,
  onSuccess,
}: {
  user: UserDTO;
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateUserAction,
    {},
  );
  const isKhati = user.role === "khati";

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state.ok, onSuccess]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={user.id} />

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
        <input name="name" defaultValue={user.name} required className={field} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
        <select name="status" defaultValue={user.status} className={field}>
          {USER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isKhati ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
          <input name="phone" type="tel" defaultValue={user.phone} className={field} />
        </div>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
            <input name="email" type="email" defaultValue={user.email} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              New password{" "}
              <span className="font-normal text-gray-400">(leave blank to keep)</span>
            </label>
            <input name="password" type="text" minLength={8} className={field} />
          </div>
        </>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
