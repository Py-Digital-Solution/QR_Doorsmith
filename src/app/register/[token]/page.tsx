import Image from "next/image";
import { getKhatiByToken } from "@/services/kyc";
import { RegisterForm } from "./RegisterForm";
import { PoweredBy } from "@/components/PoweredBy";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default async function RegisterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const khati = await getKhatiByToken(token);

  if (!khati) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <XCircle className="size-12 text-red-400" />
          <h1 className="text-lg font-semibold text-gray-900">Link not found</h1>
          <p className="text-sm text-gray-500">This registration link is invalid or has already been used.</p>
        </div>
      </Shell>
    );
  }

  // Counters: self-service, no approval chain  just gate on whether they've
  // already completed it via this same link.
  if (khati.role === "counter") {
    if (khati.completed) {
      return (
        <Shell>
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="size-12 text-green-500" />
            <h1 className="text-lg font-semibold text-gray-900">Registration complete!</h1>
            <p className="text-sm text-gray-500">Your account is active. You can now log in to DoorSmith.</p>
          </div>
        </Shell>
      );
    }
    return (
      <Shell>
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-navy">Complete your registration</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome, <strong>{khati.name}</strong>! Fill in the details below to activate your counter account.</p>
        </div>
        <RegisterForm token={token} role="counter" />
      </Shell>
    );
  }

  if (khati.kycStatus === "approved") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-12 text-green-500" />
          <h1 className="text-lg font-semibold text-gray-900">Registration approved!</h1>
          <p className="text-sm text-gray-500">Your account is active. You can now log in to DoorSmith.</p>
        </div>
      </Shell>
    );
  }

  if (khati.kycStatus === "rejected") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <XCircle className="size-12 text-red-400" />
          <h1 className="text-lg font-semibold text-gray-900">Registration not approved</h1>
          <p className="text-sm text-gray-500">Please contact your counter for assistance.</p>
        </div>
      </Shell>
    );
  }

  if (khati.kycStatus !== "not_submitted") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <Clock className="size-12 text-amber-400" />
          <h1 className="text-lg font-semibold text-gray-900">Registration under review</h1>
          <p className="text-sm text-gray-500">
            Your details have been submitted and are being reviewed. You will receive a WhatsApp message once approved.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-navy">Complete your registration</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome, <strong>{khati.name}</strong>! Fill in the details below to activate your account.</p>
      </div>
      <RegisterForm token={token} role="khati" />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex justify-center">
          {/* Logo / brand mark */}
          <Image src="/logo.png" alt="DoorSmith" width={156} height={26} priority className="h-7 w-auto" />
        </div>
        {children}
        <PoweredBy className="mt-6" />
      </div>
    </div>
  );
}
