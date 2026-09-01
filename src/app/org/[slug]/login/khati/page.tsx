import { notFound } from "next/navigation";
import { OrgLoginTabs } from "../OrgLoginTabs";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { connectDB } from "@/db/mongoose";
import { Organization } from "@/models/Organization";
import { getCompanyBranding } from "@/services/branding";

export default async function OrgKhatiLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const safeSlug = slug.replace(/[^a-z0-9-]/g, "").slice(0, 64);
  await connectDB();
  const org = await Organization.findOne({ slug: safeSlug.toLowerCase() }).lean();

  if (!org) {
    notFound();
  }

  const globalBranding = await getCompanyBranding();
  const companyName = org.name;
  const logoUrl = org.branding?.logo || globalBranding.logo || "";

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

      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Welcome to {companyName}
        </h1>
        <p className="text-xs text-gray-500 mt-1">Karigar & Counter Rewards Portal</p>
      </div>

      <OrgLoginTabs initialTab="khati" />
    </div>
  );
}
