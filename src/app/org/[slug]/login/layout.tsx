import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { PoweredBy } from "@/components/PoweredBy";
import { connectDB } from "@/db/mongoose";
import { Organization } from "@/models/Organization";
import { getCompanyBranding } from "@/services/branding";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const org = await Organization.findOne({ slug: slug.toLowerCase() }).lean();
  const globalBranding = await getCompanyBranding();

  const name = org?.name || globalBranding.name || "GGPL";
  const faviconUrl = org?.branding?.favicon || globalBranding.favicon || "/api/favicon";

  return {
    title: `${name} | Staff Sign In`,
    description: `Sign in to ${name} staff portal`,
    icons: {
      icon: [{ url: faviconUrl }],
      shortcut: [faviconUrl],
      apple: [faviconUrl],
    },
  };
}

export default async function OrgLoginLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connectDB();
  const org = await Organization.findOne({ slug: slug.toLowerCase() }).lean();

  if (!org) {
    notFound();
  }

  const globalBranding = await getCompanyBranding();
  const companyName = org.name;
  const logoUrl = org.branding?.logo || globalBranding.logo || "";
  const supportPhone = org.branding?.phone || globalBranding.phone || "+91 89504 83393";
  const brandColor = org.branding?.brandColor || globalBranding.brandColor || "#F97316";
  const faviconUrl = org.branding?.favicon || globalBranding.favicon || logoUrl || "/favicon.ico";

  return (
    <div className="flex min-h-screen">
      <style>{`:root { --brand-color: ${brandColor} !important; }`}</style>

      {/* Left  tenant branding / details (hidden on small screens) */}
      <aside 
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-navy p-12 text-white lg:flex"
      >
        {/* subtle brand glow */}
        <div 
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl opacity-25" 
          style={{ backgroundColor: brandColor }}
        />
        <div 
          className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: brandColor }}
        />

        {logoUrl && logoUrl !== "/logo.png" && (logoUrl.startsWith("data:") || logoUrl.startsWith("http") || logoUrl.startsWith("/")) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={companyName}
            className="relative max-h-16 max-w-full w-auto self-start object-contain object-left"
          />
        ) : (
          <span 
            className="relative text-3xl font-extrabold tracking-tight text-white"
          >
            {companyName}
          </span>
        )}

        <div className="relative max-w-md space-y-6">
          <h2 className="text-3xl font-semibold leading-tight">
            {companyName} rewards, <span style={{ color: brandColor }}>made simple.</span>
          </h2>
          <p className="text-gray-300">
            A QR-based rewards platform that incentivises karigars through retail
            counters — scan, earn, and redeem with ease.
          </p>
          <ul className="space-y-3 text-sm text-gray-200">
            <li className="flex items-center gap-2.5">
              <span 
                className="flex size-5 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${brandColor}33` }}
              >
                <Check className="size-3" style={{ color: brandColor }} strokeWidth={3} aria-hidden />
              </span>
              Earn reward points on every product scan
            </li>
            <li className="flex items-center gap-2.5">
              <span 
                className="flex size-5 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${brandColor}33` }}
              >
                <Check className="size-3" style={{ color: brandColor }} strokeWidth={3} aria-hidden />
              </span>
              Redeem at any participating counter
            </li>
            <li className="flex items-center gap-2.5">
              <span 
                className="flex size-5 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${brandColor}33` }}
              >
                <Check className="size-3" style={{ color: brandColor }} strokeWidth={3} aria-hidden />
              </span>
              Track your rewards in real time
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-gray-400">
          © 2026 {companyName} · Powered by{" "}
          <span className="font-medium text-gray-300">Gati Growth Labs</span>
          {" · "}
          Support:{" "}
          <a
            href={`tel:${supportPhone.replace(/\s+/g, "")}`}
            className="font-medium text-gray-300 transition-colors hover:text-white hover:underline"
          >
            {supportPhone}
          </a>
        </p>
      </aside>

      {/* Right  form */}
      <main className="flex w-full flex-col items-center justify-center gap-8 bg-gray-50 p-6 lg:w-1/2">
        <div className="w-full max-w-sm">{children}</div>
        <PoweredBy className="lg:hidden" />
      </main>
    </div>
  );
}
