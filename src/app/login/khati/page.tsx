import Link from "next/link";
import Image from "next/image";
import { KhatiLoginForm } from "./KhatiLoginForm";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { getCompanyBranding } from "@/services/branding";

export default async function KhatiLoginPage() {
  const branding = await getCompanyBranding();
  const companyName = branding.name || "DoorSmith";
  const logoUrl = branding.logo || "/logo.png";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-overlay">
      {logoUrl.startsWith("data:") || logoUrl.startsWith("http") || logoUrl.startsWith("/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={companyName}
          className="mb-4 h-6 w-auto lg:hidden object-contain"
        />
      ) : (
        <span className="mb-4 block text-xl font-bold tracking-tight text-brand lg:hidden">
          {companyName}
        </span>
      )}

      <PwaInstallBanner appName={companyName} />

      <h1 className="text-lg font-semibold tracking-tight text-gray-900">Welcome back</h1>
      <p className="mb-6 text-sm text-gray-500">Sign in with your phone</p>

      <KhatiLoginForm />

      <p className="mt-6 text-center text-sm text-gray-500">
        Admin / Sales rep?{" "}
        <Link href="/login" className="font-medium text-brand underline">
          Sign in with email
        </Link>
      </p>
    </div>
  );
}
