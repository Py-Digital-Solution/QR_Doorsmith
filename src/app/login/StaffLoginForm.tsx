"use client";

import { useActionState } from "react";
import { staffLogin, type ActionState } from "./actions";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export function StaffLoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    staffLogin,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input name="email" type="email" required className={field} autoComplete="email" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Password</label>
        <input
          name="password"
          type="password"
          required
          className={field}
          autoComplete="current-password"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
