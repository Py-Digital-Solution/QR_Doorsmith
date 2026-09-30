"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, XCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { PoweredBy } from "@/components/PoweredBy";

export function AccessClient({ token }: { token: string }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    void signIn("khati-access", { token, redirect: false })
      .then((result) => {
        if (!active) return;
        if (result?.ok && !result.error) {
          window.location.replace("/khati");
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => { active = false; };
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 text-center">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
        <Image src="/logo.png" alt="DoorSmith" width={156} height={26} priority className="mx-auto mb-6 h-7 w-auto" />
        {error ? (
          <>
            <XCircle className="mx-auto size-12 text-red-400" />
            <h1 className="mt-3 text-lg font-semibold text-gray-900">This access link is no longer valid</h1>
            <p className="mt-2 text-sm text-gray-500">
              The link may have expired, already been used, or been revoked. You can request a new link or sign in with your phone.
            </p>
            <Link href="/login/khati" className="mt-5 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
              Sign in with phone
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto size-10 animate-spin text-brand" />
            <h1 className="mt-3 text-lg font-semibold text-gray-900">Opening your Carpenter account</h1>
            <p className="mt-2 text-sm text-gray-500">Please wait while we securely sign you in.</p>
          </>
        )}
        <PoweredBy className="mt-6" />
      </div>
    </div>
  );
}
