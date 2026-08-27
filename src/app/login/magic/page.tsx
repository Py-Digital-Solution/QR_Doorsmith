"use client";

import { useEffect, useState, use } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function MagicLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const resolvedSearchParams = use(searchParams);
  const token = resolvedSearchParams.token;
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("No login token provided. Please check your link or request a new one.");
      return;
    }

    let isMounted = true;

    async function authenticate() {
      try {
        const result = await signIn("magic-token", {
          token,
          redirect: false,
        });

        if (!isMounted) return;

        if (result?.error) {
          setStatus("error");
          setErrorMsg("This login link has expired or has already been used. Please request a new link.");
        } else {
          setStatus("success");
          // Refresh session and let middleware redirect to role dashboard
          router.replace("/profile");
          router.refresh();
        }
      } catch (e) {
        if (!isMounted) return;
        setStatus("error");
        setErrorMsg("Failed to authenticate with this link. Please try standard login.");
      }
    }

    authenticate();

    return () => {
      isMounted = false;
    };
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-card text-center">
        {status === "verifying" && (
          <div className="space-y-4">
            <Loader2 className="size-12 animate-spin text-brand mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">Logging you in…</h1>
            <p className="text-sm text-gray-500">
              Verifying your secure login link. Please wait a moment.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle className="size-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">Login Successful!</h1>
            <p className="text-sm text-gray-500">
              Redirecting you to your dashboard…
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <AlertCircle className="size-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">Login Link Expired</h1>
            <p className="text-sm text-gray-600">{errorMsg}</p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Go to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
