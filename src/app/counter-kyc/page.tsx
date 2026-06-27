import Image from "next/image";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { getCounterKycState } from "@/services/kyc";
import { CounterKycForm } from "./CounterKycForm";
import { PoweredBy } from "@/components/PoweredBy";

export default async function CounterKycPage() {
  const user = await requireRole(["counter"]);

  // Already done → straight to the dashboard (also prevents revisiting the form).
  const state = await getCounterKycState(user.id);
  if (state.completed) redirect("/counter/dashboard");

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex justify-center">
          <Image src="/logo.png" alt="DoorSmith" width={156} height={26} priority className="h-7 w-auto" />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-navy">Complete your KYC</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome{state.name ? <>, <strong>{state.name}</strong></> : ""}! Add a photo of your
            counter and your address to finish setting up your account.
          </p>
        </div>

        <CounterKycForm />
        <PoweredBy className="mt-6" />
      </div>
    </div>
  );
}
