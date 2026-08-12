import Link from "next/link";
import Image from "next/image";
import { StaffLoginForm } from "./StaffLoginForm";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { getCompanyBranding } from "@/services/branding";

export default async function LoginPage() {
  const branding = await getCompanyBranding();
  const companyName = branding.name || "GGPL";
  const logoUrl = branding.logo || "";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-overlay">
      {logoUrl && logoUrl !== "/logo.png" && (logoUrl.startsWith("data:") || logoUrl.startsWith("http") || logoUrl.startsWith("/")) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={companyName}
          className="mb-4 max-h-12 max-w-full w-auto lg:hidden object-contain object-left"
        />
      ) : (
        <span className="mb-4 block text-xl font-bold tracking-tight text-gray-900 lg:hidden">
          {companyName}
        </span>
      )}

      <PwaInstallBanner appName={companyName} logoUrl={logoUrl} />

      <h1 className="text-lg font-semibold tracking-tight text-gray-900">Welcome back</h1>
      <p className="mb-6 text-sm text-gray-500">Staff sign in</p>

      <StaffLoginForm />

      <p className="mt-6 text-center text-sm text-gray-500">
        Karigar or Counter?{" "}
        <Link href="/login/khati" className="font-medium text-brand underline">
          Sign in with your phone
        </Link>
      </p>
    </div>
  );
}
