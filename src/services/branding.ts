import "server-only";
import { getSetting } from "@/services/settings";
import { auth } from "@/auth";
import { connectDB } from "@/db/mongoose";
import { Organization } from "@/models/Organization";

export type CompanyBranding = {
  name: string;
  logo: string;
  favicon: string;
  brandColor: string;
  brandSecondary: string;
  brandDark: string;
  brandLight: string;
  fontFamily: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
};

export async function getCompanyBranding(explicitOrgId?: string): Promise<CompanyBranding> {
  const session = await auth().catch(() => null);

  const [
    name,
    logo,
    favicon,
    brandColorSetting,
    brandSecondarySetting,
    brandDarkSetting,
    brandLightSetting,
    fontFamilySetting,
    tagline,
    phone,
    email,
    address,
    website,
    instagramUrl,
    facebookUrl,
    youtubeUrl,
  ] = await Promise.all([
    getSetting<string>("company_name", ""),
    getSetting<string>("company_logo", ""),
    getSetting<string>("company_favicon", ""),
    getSetting<string>("company_brand_color", "#F97316"),
    getSetting<string>("company_brand_secondary", "#0F2444"),
    getSetting<string>("company_brand_dark", "#D96D10"),
    getSetting<string>("company_brand_light", "#FFF3E8"),
    getSetting<string>("company_font_family", "geist"),
    getSetting<string>("company_tagline", ""),
    getSetting<string>("company_phone", ""),
    getSetting<string>("company_email", ""),
    getSetting<string>("company_address", ""),
    getSetting<string>("company_website", ""),
    getSetting<string>("company_instagram_url", ""),
    getSetting<string>("company_facebook_url", ""),
    getSetting<string>("company_youtube_url", ""),
  ]);

  let result: CompanyBranding = {
    name: name || "GatiQ Rewards Platform",
    logo,
    favicon,
    brandColor: brandColorSetting || "#F97316",
    brandSecondary: brandSecondarySetting || "#0F2444",
    brandDark: brandDarkSetting || "#D96D10",
    brandLight: brandLightSetting || "#FFF3E8",
    fontFamily: fontFamilySetting || "geist",
    tagline,
    phone,
    email,
    address,
    website,
    instagramUrl: instagramUrl || "",
    facebookUrl: facebookUrl || "",
    youtubeUrl: youtubeUrl || "",
  };

  const targetOrgId = explicitOrgId || session?.user?.orgId;

  // If user belongs to an organization or explicitOrgId is provided, override default branding with tenant org branding
  if (targetOrgId) {
    try {
      await connectDB();
      const org = await Organization.findById(targetOrgId).lean();
      if (org) {
        result = {
          name: org.name || result.name,
          logo: org.branding?.logo || "",
          favicon: org.branding?.favicon || "",
          brandColor: org.branding?.brandColor || result.brandColor,
          brandSecondary: org.branding?.brandSecondary || result.brandSecondary,
          brandDark: org.branding?.brandDark || result.brandDark,
          brandLight: org.branding?.brandLight || result.brandLight,
          fontFamily: org.branding?.fontFamily || result.fontFamily,
          tagline: org.branding?.tagline || "",
          phone: org.branding?.phone || "",
          email: org.branding?.email || "",
          address: org.branding?.address || "",
          website: org.branding?.website || "",
          instagramUrl: org.branding?.instagramUrl || "",
          facebookUrl: org.branding?.facebookUrl || "",
          youtubeUrl: org.branding?.youtubeUrl || "",
        };
      }
    } catch {
      // Ignore DB errors during fallback
    }
  }

  return result;
}
