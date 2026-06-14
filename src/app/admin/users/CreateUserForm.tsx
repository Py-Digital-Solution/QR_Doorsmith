"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
} from "firebase/auth";
import { createUserAction, type ActionState } from "@/actions/users";
import { getFirebaseAuth } from "@/lib/firebase-client";
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

type PhoneStep = "idle" | "sending" | "awaiting_code" | "verifying" | "verified";

export function CreateUserForm({
  allowedRoles,
  counters,
  onSuccess,
}: {
  allowedRoles: UserRole[];
  counters?: { id: string; label: string }[];
  onSuccess?: () => void;
}) {
  const [createState, createAction, createPending] = useActionState<ActionState, FormData>(
    createUserAction,
    {},
  );

  const [role, setRole] = useState<UserRole>(allowedRoles[0]);
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("idle");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(null);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const isKhati = role === "khati";
  const phoneEntered = phone.replace(/\D/g, "").length >= 10;

  // Wipe the reCAPTCHA verifier AND its DOM container
  function clearRecaptcha() {
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear(); } catch (_) {}
      recaptchaRef.current = null;
    }
    const el = document.getElementById("recaptcha-container");
    if (el) el.innerHTML = "";
  }

  // Cleanup on unmount so the container is clean if the slide-over re-opens
  useEffect(() => () => clearRecaptcha(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset phone state when role or phone changes
  useEffect(() => {
    setPhoneStep("idle");
    setOtpCode("");
    setPhoneError(null);
    setFirebaseIdToken(null);
    confirmationRef.current = null;
    clearRecaptcha();
  }, [role, phone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (createState.ok) onSuccess?.();
  }, [createState.ok, onSuccess]);

  async function handleSendOtp() {
    setPhoneStep("sending");
    setPhoneError(null);

    // Always start from a clean slate — prevents "already rendered" error
    clearRecaptcha();

    try {
      const auth = getFirebaseAuth();
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
      // Explicitly render and wait for reCAPTCHA to be ready before sending
      await recaptchaRef.current.render();
      const e164 = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
      confirmationRef.current = await signInWithPhoneNumber(auth, e164, recaptchaRef.current);
      setPhoneStep("awaiting_code");
    } catch (err) {
      clearRecaptcha();
      setPhoneError(err instanceof Error ? err.message : "Failed to send OTP.");
      setPhoneStep("idle");
    }
  }

  async function handleVerifyOtp() {
    if (!confirmationRef.current || !otpCode) return;
    setPhoneStep("verifying");
    setPhoneError(null);
    try {
      const result = await confirmationRef.current.confirm(otpCode);
      const token = await result.user.getIdToken();
      setFirebaseIdToken(token);
      setPhoneStep("verified");
    } catch {
      setPhoneError("Incorrect OTP. Please try again.");
      setPhoneStep("awaiting_code");
    }
  }

  return (
    <div className="space-y-4">
      {/* Invisible reCAPTCHA mount point */}
      <div id="recaptcha-container" />

      {allowedRoles.length > 1 ? (
        <div>
          <Label>Role</Label>
          <Select
            name="role-display"
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
      ) : null}

      <form action={createAction} className="space-y-4">
        <input type="hidden" name="role" value={role} />
        {firebaseIdToken && (
          <input type="hidden" name="firebaseIdToken" value={firebaseIdToken} />
        )}

        <div>
          <Label>Name</Label>
          <Input name="name" required />
        </div>

        {isKhati ? (
          <>
            <div>
              <Label>Phone</Label>
              <Input name="phone" type="tel" required placeholder="+91 98765 43210" />
            </div>

            {counters && counters.length > 0 && (
              <div>
                <Label>Counter</Label>
                <Select name="counterId" required>
                  <option value="">— select counter —</option>
                  {counters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </>
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

            {/* Phone + Firebase OTP */}
            <div className="space-y-2">
              <Label>Phone number <span className="text-xs font-normal text-gray-400">(optional)</span></Label>

              {/* Phone input row */}
              <div className="flex gap-2">
                <Input
                  name="phone"
                  type="tel"
                  className="flex-1"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={phoneStep === "verified"}
                />
                {phoneEntered && phoneStep === "idle" && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleSendOtp}
                  >
                    Send OTP
                  </Button>
                )}
                {phoneStep === "sending" && (
                  <Button type="button" variant="secondary" size="sm" loading>
                    Sending…
                  </Button>
                )}
                {phoneStep === "verified" && (
                  <span className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 text-xs font-semibold text-green-700">
                    ✓ Verified
                  </span>
                )}
              </div>

              {phoneError && <Alert variant="error">{phoneError}</Alert>}

              {/* OTP entry */}
              {(phoneStep === "awaiting_code" || phoneStep === "verifying") && (
                <div className="space-y-2">
                  <Label>Enter OTP sent to {phone}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      autoFocus
                      className="flex-1 font-mono tracking-widest"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={phoneStep === "verifying"}
                      onClick={handleVerifyOtp}
                    >
                      Verify
                    </Button>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-brand underline"
                    onClick={() => { setPhoneStep("idle"); setOtpCode(""); }}
                  >
                    Resend OTP
                  </button>
                </div>
              )}

              {phoneStep === "idle" && !phoneEntered && (
                <p className="text-xs text-gray-400">
                  Enter a phone number to verify via Firebase SMS OTP.
                </p>
              )}
            </div>
          </>
        )}

        {createState.error && <Alert variant="error">{createState.error}</Alert>}

        <Button
          type="submit"
          loading={createPending}
          fullWidth
          // Block submit if phone is entered but not yet verified
          disabled={!isKhati && phoneEntered && phoneStep !== "verified"}
        >
          {createPending ? "Creating…" : "Create user"}
        </Button>

        {!isKhati && phoneEntered && phoneStep !== "verified" && (
          <p className="text-center text-xs text-amber-600">
            Verify the phone number before creating the user.
          </p>
        )}
      </form>
    </div>
  );
}
