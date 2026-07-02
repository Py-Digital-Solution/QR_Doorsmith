import Image from "next/image";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getCounterKycState } from "@/services/kyc";
import { PoweredBy } from "@/components/PoweredBy";
import { MessageCircle } from "lucide-react";

/**
 * Counters now complete KYC via the public registration link sent to them on
 * WhatsApp when their account is created (same flow as a karigar) instead of
 * filling a form here after logging in. This page is just a holding screen
 * for a counter who logs in before finishing that step.
 */
export default async function CounterKycPage() {
  const user = await requireRole(["counter"]);

  const state = await getCounterKycState(user.id);
  if (state.completed) redirect("/counter/dashboard");

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg sm:p-8">
        <div className="mb-6 flex justify-center">
          <Image src="/logo.png" alt="DoorSmith" width={156} height={26} priority className="h-7 w-auto" />
        </div>

        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-brand-light">
          <MessageCircle className="size-7 text-brand" />
        </div>

        <h1 className="text-xl font-bold text-navy">Finish your registration on WhatsApp</h1>
        <p className="mt-2 text-sm text-gray-500">
          Welcome{state.name ? <>, <strong>{state.name}</strong></> : ""}! We sent a registration
          link to your WhatsApp number. Open it and add your photo + address to
          finish setting up your account before continuing.
        </p>

        <PoweredBy className="mt-6" />
      </div>
    </div>
  );
}
