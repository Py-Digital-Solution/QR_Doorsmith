import { requireRole } from "@/lib/session";
import { getCompanyBranding } from "@/services/branding";
import SuperAdminSettingsClient from "./SuperAdminSettingsClient";

export const metadata = { title: "SaaS Platform Settings | Super Admin" };

export default async function SuperAdminSettingsPage() {
  await requireRole(["super_admin"]);
  const branding = await getCompanyBranding();

  return (
    <SuperAdminSettingsClient
      initialBranding={{
        name: branding.name,
        logo: branding.logo,
        favicon: branding.favicon,
        phone: branding.phone,
        email: branding.email,
        brandColor: branding.brandColor,
        brandSecondary: branding.brandSecondary,
        brandDark: branding.brandDark,
        brandLight: branding.brandLight,
        fontFamily: branding.fontFamily,
      }}
    />
  );
}
