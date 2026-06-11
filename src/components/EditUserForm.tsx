"use client";

import { useActionState, useEffect } from "react";
import { updateUserAction, type ActionState } from "@/actions/users";
import { USER_STATUSES } from "@/lib/roles";
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

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state.ok, onSuccess]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={user.id} />

      <div>
        <Label>Name</Label>
        <Input name="name" defaultValue={user.name} required />
      </div>

      <div>
        <Label>Status</Label>
        <Select name="status" defaultValue={user.status}>
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
          <Input name="phone" type="tel" defaultValue={user.phone} />
        </div>
      ) : (
        <>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" defaultValue={user.email} />
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
