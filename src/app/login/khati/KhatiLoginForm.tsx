"use client";

import { useActionState, useState } from "react";
import { sendKhatiOtp, khatiLogin, type ActionState } from "../actions";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export function KhatiLoginForm() {
  const [phone, setPhone] = useState("");
  const [otpState, sendAction, sending] = useActionState<ActionState, FormData>(
    sendKhatiOtp,
    {},
  );
  const [loginState, loginAction, verifying] = useActionState<ActionState, FormData>(
    khatiLogin,
    {},
  );

  const sent = !!otpState.ok;

  return (
    <div className="space-y-4">
      {!sent && (
        <form action={sendAction} className="space-y-4">
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
          {otpState.error && <p className="text-sm text-red-600">{otpState.error}</p>}
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
        <form action={loginAction} className="space-y-4">
          <p className="text-sm text-green-600">
            Code sent to {phone}. Enter it below.
          </p>
          <input type="hidden" name="phone" value={phone} />
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
          {loginState.error && <p className="text-sm text-red-600">{loginState.error}</p>}
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
