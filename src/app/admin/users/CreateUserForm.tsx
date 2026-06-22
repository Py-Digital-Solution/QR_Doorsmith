"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
} from "firebase/auth";
import { createUserAction, verifyPhoneOtpAction, type ActionState } from "@/actions/users";
import { getFirebaseAuth } from "@/lib/firebase-client";
import type { UserRole } from "@/models/User";
import { Input, Select } from "@/components/ui/Input";
import { Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const FIREBASE_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

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
  const [khatiPhone, setKhatiPhone] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("idle");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(null);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [waVerifiedPhone, setWaVerifiedPhone] = useState<string | null>(null);

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
    setWhatsappSent(false);
    setWaVerifiedPhone(null);
    confirmationRef.current = null;
    clearRecaptcha();
  }, [role, phone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (createState.ok) onSuccess?.();
  }, [createState.ok, onSuccess]);

  async function handleSendOtp() {
    setPhoneStep("sending");
    setPhoneError(null);
    setWhatsappSent(false);

    clearRecaptcha();

    const e164 = `+91${phone}`;

    // Fire Firebase SMS and WhatsApp OTP in parallel  proceed if at least one succeeds.
    const auth = getFirebaseAuth();
    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    await recaptchaRef.current.render();

    const [firebaseResult, waResult] = await Promise.allSettled([
      signInWithPhoneNumber(auth, e164, recaptchaRef.current),
      fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164 }),
      }),
    ]);

    if (firebaseResult.status === "fulfilled") {
      confirmationRef.current = firebaseResult.value;
    } else {
      confirmationRef.current = null;
      clearRecaptcha();
    }

    const waOk = waResult.status === "fulfilled" && waResult.value.ok;
    setWhatsappSent(waOk);

    if (firebaseResult.status === "rejected" && !waOk) {
      setPhoneError("Could not send OTP via SMS or WhatsApp. Please try again.");
      setPhoneStep("idle");
      return;
    }

    setPhoneStep("awaiting_code");
  }

  async function handleVerifyOtp() {
    if (!otpCode) return;
    setPhoneStep("verifying");
    setPhoneError(null);

    // 1. Try Firebase SMS code first.
    if (confirmationRef.current) {
      try {
        const result = await confirmationRef.current.confirm(otpCode);
        const token = await result.user.getIdToken();
        setFirebaseIdToken(token);
        setPhoneStep("verified");
        return;
      } catch {
        // Firebase code wrong or expired  fall through to WhatsApp code.
      }
    }

    // 2. Try WhatsApp OTP code (server-verified).
    if (whatsappSent) {
      const res = await verifyPhoneOtpAction(`+91${phone}`, otpCode);
      if (res.ok) {
        setWaVerifiedPhone(`+91${phone}`);
        setPhoneStep("verified");
        return;
      }
    }

    setPhoneError("Incorrect or expired OTP. Please try again.");
    setPhoneStep("awaiting_code");
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
        {waVerifiedPhone && !firebaseIdToken && (
          <input type="hidden" name="waVerifiedPhone" value={waVerifiedPhone} />
        )}

        <div>
          <Label>Name</Label>
          <Input name="name" required />
        </div>

        {isKhati ? (
          <>
            <div>
              <Label>Phone</Label>
              <input type="hidden" name="phone" value={khatiPhone.length > 0 ? `+91${khatiPhone}` : ""} />
              <div className="flex">
                <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 select-none">+91</span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  value={khatiPhone}
                  onChange={(e) => setKhatiPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="98765 43210"
                  autoComplete="tel"
                  className="rounded-l-none"
                />
              </div>
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
              <input type="hidden" name="phone" value={phone.length > 0 ? `+91${phone}` : ""} />
              <div className="flex gap-2">
                <div className="flex flex-1">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 select-none">+91</span>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    className="flex-1 rounded-l-none"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    disabled={phoneStep === "verified"}
                  />
                </div>
                {FIREBASE_CONFIGURED && phoneEntered && phoneStep === "idle" && (
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

              {/* OTP entry — only shown when Firebase is configured */}
              {FIREBASE_CONFIGURED && (phoneStep === "awaiting_code" || phoneStep === "verifying") && (
                <div className="space-y-2">
                  <Label>Enter OTP sent to +91{phone}</Label>
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
                    onClick={() => { setPhoneStep("idle"); setOtpCode(""); setWhatsappSent(false); setWaVerifiedPhone(null); }}
                  >
                    Resend OTP
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {createState.error && <Alert variant="error">{createState.error}</Alert>}

        <Button
          type="submit"
          loading={createPending}
          fullWidth
          // Block submit if Firebase is configured, phone entered, but not yet verified
          disabled={FIREBASE_CONFIGURED && !isKhati && phoneEntered && phoneStep !== "verified"}
        >
          {createPending ? "Creating…" : "Create user"}
        </Button>

        {FIREBASE_CONFIGURED && !isKhati && phoneEntered && phoneStep !== "verified" && (
          <p className="text-center text-xs text-amber-600">
            Verify the phone number before creating the user.
          </p>
        )}
      </form>
    </div>
  );
}
