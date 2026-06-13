"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createUserAction,
  requestOtpAction,
  type ActionState,
} from "@/actions/users";
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
  const [createState, createAction, createPending] = useActionState<
    ActionState,
    FormData
  >(createUserAction, {});

  const [otpState, otpAction, otpPending] = useActionState<ActionState, FormData>(
    requestOtpAction,
    {},
  );

  const [role, setRole] = useState<UserRole>(allowedRoles[0]);
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const isKhati = role === "khati";
  const needsOtp = !isKhati && phone.trim().length >= 10;

  const otpFormRef = useRef<HTMLFormElement>(null);

  // Reset OTP state when phone changes
  useEffect(() => {
    setPhoneVerified(false);
  }, [phone]);

  // After OTP sent successfully, mark phone as pending verification
  const otpSent = otpState.otpSent === true;

  useEffect(() => {
    if (createState.ok) onSuccess?.();
  }, [createState.ok, onSuccess]);

  return (
    <div className="space-y-4">
      {/* Role */}
      {allowedRoles.length > 1 ? (
        <div>
          <Label>Role</Label>
          <Select
            name="role-display"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole);
              setPhone("");
              setPhoneVerified(false);
            }}
          >
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {/* OTP request form — sends phone to requestOtpAction */}
      {!isKhati && (
        <form ref={otpFormRef} action={otpAction} className="hidden">
          <input type="hidden" name="phone" value={phone} />
        </form>
      )}

      {/* Main create form */}
      <form action={createAction} className="space-y-4">
        <input type="hidden" name="role" value={role} />

        <div>
          <Label>Name</Label>
          <Input name="name" required />
        </div>

        {isKhati ? (
          /* Khati: phone only, no OTP needed */
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

            {/* Phone + OTP section */}
            <div className="space-y-2">
              <Label>Phone number</Label>
              <div className="flex gap-2">
                <Input
                  name="phone"
                  type="tel"
                  className="flex-1"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {needsOtp && !otpSent && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={otpPending}
                    onClick={() => otpFormRef.current?.requestSubmit()}
                  >
                    Send OTP
                  </Button>
                )}
                {otpSent && (
                  <span className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 text-xs font-medium text-green-700">
                    ✓ Sent
                  </span>
                )}
              </div>

              {otpState.error && (
                <Alert variant="error">{otpState.error}</Alert>
              )}

              {otpSent && (
                <div>
                  <Label>Enter OTP</Label>
                  <Input
                    name="otpCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit code"
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    OTP sent to {phone}.{" "}
                    <button
                      type="button"
                      className="text-brand underline"
                      onClick={() => otpFormRef.current?.requestSubmit()}
                    >
                      Resend
                    </button>
                  </p>
                </div>
              )}

              {!needsOtp && (
                <p className="text-xs text-gray-400">
                  Optional — enter a phone number to verify via OTP.
                </p>
              )}
            </div>
          </>
        )}

        {createState.error && (
          <Alert variant="error">{createState.error}</Alert>
        )}

        <Button type="submit" loading={createPending} fullWidth>
          {createPending ? "Creating…" : "Create user"}
        </Button>
      </form>
    </div>
  );
}
