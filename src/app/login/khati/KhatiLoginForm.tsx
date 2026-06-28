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

const FIREBASE_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
// DEV/DEMO MODE: force the magic-code (1111) login in every environment,
// including production deploys, so the app opens without real Firebase OTP.
// Set NEXT_PUBLIC_OTP_DEV_MODE="false" in the environment to turn this OFF.
const OTP_DEV_MODE = process.env.NEXT_PUBLIC_OTP_DEV_MODE !== "false";

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
    const normalized = phone.trim().startsWith("+") ? phone.trim() : `+91${phone.trim().replace(/\D/g, "")}`;
    const res = await signIn("khati-otp", {
      phone: normalized,
      code: code.trim(),
      redirect: false,
    });
    if (!res || res.error) {
      setError("Login failed. Check the phone number is registered as a karigar.");
      setPending(false);
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
        Dev mode  OTP is always <strong>1111</strong>
      </div>

      {step === "phone" ? (
        <form onSubmit={(e) => { e.preventDefault(); setStep("otp"); }} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone number</label>
            <div className="flex">
              <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 select-none">+91</span>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="98765 43210"
                autoComplete="tel"
                className="rounded-l-none"
              />
            </div>
          </div>
          <Button type="submit" fullWidth>
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-gray-500">Signing in as +91{phone}</p>
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

// ─── OTP form (production) ───────────────────────────────────────────────────
// Primary channel: WhatsApp (our self-hosted Baileys service). Firebase phone
// auth (SMS) is only used as a fallback when WhatsApp delivery fails.

function OtpLoginForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Which channel actually delivered the code, so verification uses the right path.
  const [channel, setChannel] = useState<"whatsapp" | "sms" | null>(null);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerId = "recaptcha-container";

  // Don't initialise Firebase reCAPTCHA up front. It's only created when the SMS
  // fallback is actually needed (see sendOtp), so a working WhatsApp login never
  // touches Firebase/App Check. This effect just cleans it up on unmount.
  useEffect(() => {
    return () => { recaptchaRef.current?.clear(); recaptchaRef.current = null; };
  }, []);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = phone.trim();
    if (!trimmed) { setError("Enter your phone number."); return; }
    setSending(true);
    setChannel(null);
    confirmationRef.current = null;

    const normalized = `+91${trimmed}`;

    // 1. Primary: WhatsApp OTP via our own service. The server only reports
    //    ok:true when WhatsApp actually delivered (or a code is already in
    //    flight); otherwise it asks us to fall back to SMS.
    let waOk = false;
    try {
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      waOk = res.ok && data?.ok === true;
    } catch {
      waOk = false;
    }

    if (waOk) {
      setChannel("whatsapp");
      setStep("otp");
      setSending(false);
      return;
    }

    // 2. Fallback: Firebase SMS — initialised lazily here, only because WhatsApp
    //    couldn't deliver. A working WhatsApp login never reaches this code.
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(getFirebaseAuth(), recaptchaContainerId, { size: "invisible" });
      }
      const confirmation = await signInWithPhoneNumber(
        getFirebaseAuth(),
        normalized,
        recaptchaRef.current,
      );
      confirmationRef.current = confirmation;
      setChannel("sms");
      setStep("otp");
    } catch {
      confirmationRef.current = null;
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      setError("WhatsApp is unavailable and SMS could not be sent. Please try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) { setError("Enter the code."); return; }
    setVerifying(true);

    try {
      // Primary: WhatsApp code (server-generated, verified against the DB).
      if (channel === "whatsapp") {
        const res = await signIn("khati-otp", {
          phone: `+91${phone}`,
          code: code.trim(),
          redirect: false,
        });
        if (res && !res.error) { window.location.href = "/"; return; }
        setError("Wrong or expired code. Check your WhatsApp and try again.");
        return;
      }

      // Fallback: Firebase SMS code.
      if (channel === "sms" && confirmationRef.current) {
        try {
          const result = await confirmationRef.current.confirm(code.trim());
          const idToken = await result.user.getIdToken();
          const res = await signIn("khati-otp", { idToken, redirect: false });
          if (res && !res.error) { window.location.href = "/"; return; }
        } catch {
          // wrong / expired SMS code  fall through to the generic error
        }
        setError("Wrong or expired code. Check your SMS and try again.");
        return;
      }

      setError("Wrong or expired code. Please try again.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed.";
      setError(msg);
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
            <div className="flex">
              <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 select-none">+91</span>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="98765 43210"
                autoComplete="tel"
                className="rounded-l-none"
              />
            </div>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" loading={sending} fullWidth>
            {sending ? "Sending…" : "Send OTP"}
          </Button>
        </form>
      )}
      {step === "otp" && (
        <form onSubmit={verifyOtp} className="space-y-4">
          <Alert variant="success">
            OTP sent to +91{phone} via {channel === "whatsapp" ? "WhatsApp" : "SMS"}. Enter the 6-digit code.
          </Alert>
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
  // Debug mode forces the 1111 dev form so the khati app can be opened without
  // real OTP; otherwise use Firebase when configured.
  return OTP_DEV_MODE || !FIREBASE_CONFIGURED ? <DevLoginForm /> : <OtpLoginForm />;
}
