"use client";

import { useActionState, useEffect, useState } from "react";
import { createUserAction, type ActionState } from "@/actions/users";
import type { UserRole } from "@/models/User";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  sales_rep: "Sales Rep",
  distributor: "Distributor",
  counter: "Counter",
  khati: "Khati",
};

export function CreateUserForm({
  allowedRoles,
  onSuccess,
}: {
  allowedRoles: UserRole[];
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createUserAction,
    {},
  );
  const [role, setRole] = useState<UserRole>(allowedRoles[0]);
  const isKhati = role === "khati";

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state.ok, onSuccess]);

  return (
    <form action={action} className="space-y-4">
      {allowedRoles.length > 1 ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Role</label>
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className={field}
          >
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="role" value={role} />
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
        <input name="name" required className={field} />
      </div>

      {isKhati ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
          <input name="phone" type="tel" required className={field} />
        </div>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
            <input name="email" type="email" required className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Password
            </label>
            <input name="password" type="text" required minLength={8} className={field} />
          </div>
        </>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
