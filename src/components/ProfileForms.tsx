"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  updateProfileAction,
  updateNameAction,
  changePasswordAction,
  uploadPhotoAction,
  type ActionState,
} from "@/actions/profile";
import { Input } from "./ui/Input";
import { Label } from "./ui/Field";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";
import { displayPhone } from "@/lib/phone";

const card =
  "space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5";

export function ProfileInfoForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateProfileAction,
    {},
  );
  const [name, setName] = useState(defaultName || "");
  const [phone, setPhone] = useState(defaultPhone ? displayPhone(defaultPhone) : "");

  return (
    <form action={action} className={card}>
      <h2 className="text-sm font-semibold text-gray-900">Personal Information</h2>
      <div>
        <Label>Full Name</Label>
        <Input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          required
        />
      </div>
      <div>
        <Label>Mobile Number</Label>
        <div className="relative flex rounded-lg shadow-xs">
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
            +91
          </span>
          <Input
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number"
            className="rounded-l-none"
          />
        </div>
        <p className="mt-1 text-[11px] text-gray-400">Used for official communication and verification</p>
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.ok && <Alert variant="success">Profile saved ✓</Alert>}
      <Button type="submit" loading={pending}>
        {pending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}

export function NameForm({ defaultName }: { defaultName: string }) {
  return <ProfileInfoForm defaultName={defaultName} />;
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
