import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireRole } from "@/lib/session";
import { connectDB } from "@/db/mongoose";
import { Organization } from "@/models/Organization";
import { getCompanyBranding } from "@/services/branding";
import { OrgLinksClient } from "./OrgLinksClient";

export const metadata: Metadata = {
  title: "Portal Links | Admin",
  description: "Shareable organization portal links, direct karigar sign in, and app install pages.",
};

export default async function AdminLinksPage() {
  const user = await requireRole(["admin", "super_admin"]);
  await connectDB();

  let org = user.orgId ? await Organization.findById(user.orgId).lean() : null;
  if (!org) {
    org = await Organization.findOne({ status: "active" }).sort({ createdAt: 1 }).lean();
  }

  const branding = await getCompanyBranding(user.orgId ? String(user.orgId) : undefined);
  const orgName = org?.name || branding.name || "Organization";
  const orgSlug = org?.slug || "default";

  // Determine base app URL dynamically from headers
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  return (
    <OrgLinksClient
      orgName={orgName}
      orgSlug={orgSlug}
      baseUrl={baseUrl}
    />
  );
}
