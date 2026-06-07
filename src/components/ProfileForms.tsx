"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  updateNameAction,
  changePasswordAction,
  uploadPhotoAction,
  type ActionState,
} from "@/actions/profile";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";
const labelCls = "mb-1 block text-xs font-medium text-gray-600";
const btn =
  "rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50";

export function NameForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateNameAction,
    {},
  );
  return (
    <form action={action} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold">Name</h2>
      <input name="name" defaultValue={defaultName} required className={field} />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Saved ✓</p>}
      <button type="submit" disabled={pending} className={btn}>
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}

export function PhotoForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    uploadPhotoAction,
    {},
  );
  return (
    <form action={action} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold">Profile photo</h2>
      <input
        name="photo"
        type="file"
        accept="image/*"
        required
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-dark"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Uploaded ✓</p>}
      <button type="submit" disabled={pending} className={btn}>
        {pending ? "Uploading…" : "Upload photo"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    changePasswordAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      <h2 className="text-sm font-semibold">Change password</h2>
      <div>
        <label className={labelCls}>Current password</label>
        <input name="current" type="password" required className={field} autoComplete="current-password" />
      </div>
      <div>
        <label className={labelCls}>New password</label>
        <input name="next" type="password" required minLength={8} className={field} autoComplete="new-password" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Password changed ✓</p>}
      <button type="submit" disabled={pending} className={btn}>
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
