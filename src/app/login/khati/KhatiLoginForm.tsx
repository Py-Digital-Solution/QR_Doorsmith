"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export function KhatiLoginForm() {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOtpError(null);
    if (!phone.trim()) {
      setOtpError("Enter your phone number.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOtpError(data?.error ?? "Could not send code.");
      } else {
        setSent(true);
      }
    } catch {
      setOtpError("Could not send code. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError(null);
    setVerifying(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("khati-otp", {
      phone: phone.trim(),
      code: String(form.get("code") ?? "").trim(),
      redirect: false,
    });
    if (!res || res.error) {
      setLoginError("Invalid or expired code.");
      setVerifying(false);
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="space-y-4">
      {!sent && (
        <form onSubmit={sendOtp} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Phone number</label>
            <input
              name="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={field}
              autoComplete="tel"
            />
          </div>
          {otpError && <p className="text-sm text-red-600">{otpError}</p>}
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send code"}
          </button>
        </form>
      )}

      {sent && (
        <form onSubmit={verify} className="space-y-4">
          <p className="text-sm text-green-600">
            Code sent to {phone}. Enter it below.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">6-digit code</label>
            <input
              name="code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              className={field}
            />
          </div>
          {loginError && <p className="text-sm text-red-600">{loginError}</p>}
          <button
            type="submit"
            disabled={verifying}
            className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {verifying ? "Verifying…" : "Verify & sign in"}
          </button>
        </form>
      )}
    </div>
  );
}
