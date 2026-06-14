"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  updateNameAction,
  changePasswordAction,
  uploadPhotoAction,
  type ActionState,
} from "@/actions/profile";
import { Input } from "./ui/Input";
import { Label } from "./ui/Field";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";

const card =
  "space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5";

export function NameForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateNameAction,
    {},
  );
  const [name, setName] = useState(defaultName);
  return (
    <form action={action} className={card}>
      <h2 className="text-sm font-semibold text-gray-900">Name</h2>
      <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.ok && <Alert variant="success">Saved ✓</Alert>}
      <Button type="submit" loading={pending}>
        {pending ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}

export function PhotoForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    uploadPhotoAction,
    {},
  );
  return (
    <form action={action} className={card}>
      <h2 className="text-sm font-semibold text-gray-900">Profile photo</h2>
      <input
        name="photo"
        type="file"
        accept="image/*"
        required
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-dark hover:file:bg-brand/15"
      />
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.ok && <Alert variant="success">Uploaded ✓</Alert>}
      <Button type="submit" loading={pending}>
        {pending ? "Uploading…" : "Upload photo"}
      </Button>
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
    <form ref={formRef} action={action} className={card}>
      <h2 className="text-sm font-semibold text-gray-900">Change password</h2>
      <div>
        <Label>Current password</Label>
        <Input name="current" type="password" required autoComplete="current-password" />
      </div>
      <div>
        <Label>New password</Label>
        <Input name="next" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.ok && <Alert variant="success">Password changed ✓</Alert>}
      <Button type="submit" loading={pending}>
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
