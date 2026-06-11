"use client";

import { useActionState, useEffect, useState } from "react";
import { createUserAction, type ActionState } from "@/actions/users";
import type { UserRole } from "@/models/User";
import { Input, Select } from "@/components/ui/Input";
import { Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

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
          <Label>Role</Label>
          <Select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <input type="hidden" name="role" value={role} />
      )}

      <div>
        <Label>Name</Label>
        <Input name="name" required />
      </div>

      {isKhati ? (
        <div>
          <Label>Phone</Label>
          <Input name="phone" type="tel" required />
        </div>
      ) : (
        <>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>Password</Label>
            <Input name="password" type="text" required minLength={8} />
          </div>
        </>
      )}

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" loading={pending} fullWidth>
        {pending ? "Creating…" : "Create user"}
      </Button>
    </form>
  );
}
