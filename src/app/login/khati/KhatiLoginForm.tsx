"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export function KhatiLoginForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerId = "recaptcha-container";

  // Set up invisible reCAPTCHA once on mount.
  useEffect(() => {
    const auth = getFirebaseAuth();
    const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: "invisible",
    });
    recaptchaRef.current = verifier;
    return () => {
      verifier.clear();
      recaptchaRef.current = null;
    };
  }, []);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = phone.trim();
    if (!trimmed) { setError("Enter your phone number."); return; }

    setSending(true);
    try {
      const auth = getFirebaseAuth();
      // Ensure phone has + prefix for Firebase (e.g. +919876543210).
      const normalized = trimmed.startsWith("+") ? trimmed : `+91${trimmed}`;
      const result = await signInWithPhoneNumber(auth, normalized, recaptchaRef.current!);
      confirmationRef.current = result;
      setStep("otp");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send code.";
      // Surface a friendly message for common Firebase errors.
      if (msg.includes("invalid-phone-number")) {
        setError("Invalid phone number. Include country code, e.g. +919876543210");
      } else if (msg.includes("too-many-requests")) {
        setError("Too many attempts. Please wait and try again.");
      } else {
        setError(msg);
      }
      // Reset reCAPTCHA so user can retry.
      recaptchaRef.current?.clear();
      const auth = getFirebaseAuth();
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: "invisible",
      });
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
      if (msg.includes("invalid-verification-code")) {
        setError("Wrong code. Check and try again.");
      } else if (msg.includes("code-expired")) {
        setError("Code expired. Go back and request a new one.");
      } else {
        setError(msg);
      }
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Invisible reCAPTCHA anchor — Firebase needs a real DOM element. */}
      <div id={recaptchaContainerId} />

      {step === "phone" && (
        <form onSubmit={sendOtp} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Phone number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className={field}
              autoComplete="tel"
            />
            <p className="mt-1 text-xs text-gray-400">
              Include country code, e.g. +91 for India
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send OTP"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verifyOtp} className="space-y-4">
          <p className="text-sm text-green-600">
            OTP sent to {phone}. Enter the 6-digit code.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">6-digit code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={field}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={verifying}
            className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {verifying ? "Verifying…" : "Verify & sign in"}
          </button>
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
