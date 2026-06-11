"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function StaffLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);

    // Client-side sign-in posts to the stable /api/auth/callback REST endpoint
    // (NOT a Server Action). Server Actions are unreliable behind Netlify's
    // runtime; this REST path is verified working in production.
    const res = await signIn("staff", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });

    if (!res || res.error) {
      setError("Invalid email or password.");
      setPending(false);
      return;
    }
    // Full navigation so the new session cookie is read server-side and the
    // user lands on their role home.
    window.location.href = "/";
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <Input name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
        <Input name="password" type="password" required autoComplete="current-password" />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Button type="submit" loading={pending} fullWidth>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
