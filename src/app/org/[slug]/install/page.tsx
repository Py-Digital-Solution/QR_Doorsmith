import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InstallClient from "@/app/install/InstallClient";
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

  const name = org?.name || globalBranding.name || "Rewards Platform";
  const faviconUrl = org?.branding?.favicon || globalBranding.favicon || "/api/favicon";
  const logoUrl = org?.branding?.logo || globalBranding.logo || "/logo.png";

  return {
    title: `Install ${name} Rewards App`,
    description: `Download and install the ${name} app on your mobile device to scan QR codes, track, and redeem reward points instantly.`,
    applicationName: `${name} Rewards`,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: name,
    },
    icons: {
      icon: [{ url: faviconUrl }],
      shortcut: [faviconUrl],
      apple: [faviconUrl],
    },
    openGraph: {
      title: `Install ${name} Rewards App`,
      description: `Scan product QR codes and earn reward points with ${name}.`,
      type: "website",
      images: [
        {
          url: logoUrl,
          width: 1200,
          height: 630,
          alt: `${name} Rewards App`,
        },
      ],
    },
  };
}

export default async function OrgInstallPage({
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
  const phone = org.branding?.phone || globalBranding.phone || "";
  const orgLoginUrl = `/org/${org.slug}/login`;

  return (
    <InstallClient
      companyName={companyName}
      logo={logoUrl}
      phone={phone}
      loginUrl={orgLoginUrl}
      staffLoginUrl={orgLoginUrl}
    />
  );
}
