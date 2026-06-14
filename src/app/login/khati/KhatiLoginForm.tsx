"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const FIREBASE_CONFIGURED =
  Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) &&
  process.env.NODE_ENV === "production";

// ─── Dev-mode form (no Firebase) ────────────────────────────────────────────

function DevLoginForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("1111");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn("khati-otp", {
      phone: phone.trim(),
      code: code.trim(),
      redirect: false,
    });
    if (!res || res.error) {
      setError("Login failed. Check the phone number is registered as a khati.");
      setPending(false);
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
        Dev mode — OTP is always <strong>1111</strong>
      </div>

      {step === "phone" ? (
        <form onSubmit={(e) => { e.preventDefault(); setStep("otp"); }} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone number</label>
            <Input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <Button type="submit" fullWidth>
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-gray-500">Signing in as {phone}</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">OTP code</label>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" loading={pending} fullWidth>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={() => { setStep("phone"); setError(null); }}
            className="w-full text-sm text-gray-500 hover:underline"
          >
            ← Change number
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Firebase form (production) ──────────────────────────────────────────────

function FirebaseLoginForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerId = "recaptcha-container";

  useEffect(() => {
    const auth = getFirebaseAuth();
    const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: "invisible" });
    recaptchaRef.current = verifier;
    return () => { verifier.clear(); recaptchaRef.current = null; };
  }, []);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = phone.trim();
    if (!trimmed) { setError("Enter your phone number."); return; }
    setSending(true);
    try {
      const auth = getFirebaseAuth();
      const normalized = trimmed.startsWith("+") ? trimmed : `+91${trimmed}`;
      const result = await signInWithPhoneNumber(auth, normalized, recaptchaRef.current!);
      confirmationRef.current = result;
      setStep("otp");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send code.";
      if (msg.includes("invalid-phone-number")) {
        setError("Invalid phone number. Include country code e.g. +919876543210");
      } else if (msg.includes("too-many-requests")) {
        setError("Too many attempts. Please wait and try again.");
      } else {
        setError(msg);
      }
      recaptchaRef.current?.clear();
      const auth = getFirebaseAuth();
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainerId, { size: "invisible" });
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) { setError("Enter the code."); return; }
    if (!confirmationRef.current) { setError("Session expired. Refresh and try again."); return; }
    setVerifying(true);
    try {
      const result = await confirmationRef.current.confirm(code.trim());
      const idToken = await result.user.getIdToken();
      const res = await signIn("khati-otp", { idToken, redirect: false });
      if (!res || res.error) {
        setError("Login failed. Make sure your number is registered as a khati.");
        return;
      }
      window.location.href = "/";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed.";
      if (msg.includes("invalid-verification-code")) setError("Wrong code. Check and try again.");
      else if (msg.includes("code-expired")) setError("Code expired. Request a new one.");
      else setError(msg);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-4">
      <div id={recaptchaContainerId} />
      {step === "phone" && (
        <form onSubmit={sendOtp} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone number</label>
            <Input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              autoComplete="tel"
            />
            <p className="mt-1 text-xs text-gray-400">Include country code e.g. +91 for India</p>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" loading={sending} fullWidth>
            {sending ? "Sending…" : "Send OTP"}
          </Button>
        </form>
      )}
      {step === "otp" && (
        <form onSubmit={verifyOtp} className="space-y-4">
          <Alert variant="success">OTP sent to {phone}. Enter the 6-digit code.</Alert>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">6-digit code</label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" loading={verifying} fullWidth>
            {verifying ? "Verifying…" : "Verify & sign in"}
          </Button>
          <button
            type="button"
            onClick={() => { setStep("phone"); setCode(""); setError(null); }}
            className="w-full text-sm text-gray-500 hover:underline"
          >
            ← Change number
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Auto-select based on env ────────────────────────────────────────────────

export function KhatiLoginForm() {
  return FIREBASE_CONFIGURED ? <FirebaseLoginForm /> : <DevLoginForm />;
}
