"use client";

import { useActionState, useEffect, useState } from "react";
import { updateUserAction, type ActionState } from "@/actions/users";
import { displayPhone } from "@/lib/phone";
import { USER_STATUSES, type UserStatus } from "@/lib/roles";
import type { UserDTO } from "@/services/users";
import { Input, Select } from "./ui/Input";
import { Label } from "./ui/Field";
import { Button } from "./ui/Button";
import { Alert } from "./ui/Alert";

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

  const [name, setName] = useState(user.name);
  const [status, setStatus] = useState<UserStatus>(user.status as UserStatus);
  const [phone, setPhone] = useState(displayPhone(user.phone ?? ""));
  const [email, setEmail] = useState(user.email ?? "");

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state.ok, onSuccess]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={user.id} />

      <div>
        <Label>Name</Label>
        <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div>
        <Label>Status</Label>
        <Select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus)}
        >
          {USER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {isKhati ? (
        <div>
          <Label>Phone</Label>
          <input type="hidden" name="phone" value={phone.length > 0 ? `+91${phone}` : ""} />
          <div className="flex">
            <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 select-none">+91</span>
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="98765 43210"
              autoComplete="tel"
              className="rounded-l-none"
            />
          </div>
        </div>
      ) : (
        <>
          <div>
            <Label>Email</Label>
            <Input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>
              New password{" "}
              <span className="font-normal text-gray-400">(leave blank to keep)</span>
            </Label>
            <Input name="password" type="text" minLength={8} />
          </div>
        </>
      )}

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" loading={pending} fullWidth>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
