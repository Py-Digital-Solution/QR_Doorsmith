"use server";

import { safeError } from "@/lib/safe-error";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { setSetting } from "@/services/settings";
import { connectDB } from "@/db/mongoose";
import { Organization } from "@/models/Organization";

export type BrandingState = { error?: string; ok?: boolean };

export async function saveBrandingAction(
  _prev: BrandingState,
  formData: FormData,
): Promise<BrandingState> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Unauthorized" };

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const companyName = get("company_name");
  const companyLogo = get("company_logo");
  const companyFavicon = get("company_favicon");
  const companyBrandColor = get("company_brand_color");
  const companyBrandSecondary = get("company_brand_secondary");
  const companyBrandDark = get("company_brand_dark");
  const companyBrandLight = get("company_brand_light");
  const companyFontFamily = get("company_font_family");
  const companyPhone = get("company_phone");
  const companyEmail = get("company_email");
  const companyAddress = get("company_address");
  const companyWebsite = get("company_website");
  const companyTagline = get("company_tagline");
  const companyInstagramUrl = get("company_instagram_url");
  const companyFacebookUrl = get("company_facebook_url");
  const companyYoutubeUrl = get("company_youtube_url");

  try {
    if (session.user.orgId) {
      await connectDB();
      await Organization.findByIdAndUpdate(session.user.orgId, {
        $set: {
          ...(companyName ? { name: companyName } : {}),
          branding: {
            logo: companyLogo,
            favicon: companyFavicon,
            brandColor: companyBrandColor || "#f6821f",
            brandSecondary: companyBrandSecondary || "#0d1f38",
            brandDark: companyBrandDark || "#d96d10",
            brandLight: companyBrandLight || "#FFF3E8",
            fontFamily: companyFontFamily || "geist",
            phone: companyPhone,
            email: companyEmail,
            address: companyAddress,
            tagline: companyTagline,
            website: companyWebsite,
            instagramUrl: companyInstagramUrl,
            facebookUrl: companyFacebookUrl,
            youtubeUrl: companyYoutubeUrl,
          },
        },
      });
    } else {
      await Promise.all([
        setSetting("company_name", companyName, "Company display name"),
        setSetting("company_tagline", companyTagline, "Company tagline / slogan"),
        setSetting("company_phone", companyPhone, "Company contact phone"),
        setSetting("company_email", companyEmail, "Company email address"),
        setSetting("company_address", companyAddress, "Company address"),
        setSetting("company_website", companyWebsite, "Company website URL"),
        setSetting("company_instagram_url", companyInstagramUrl, "Company Instagram page URL"),
        setSetting("company_facebook_url", companyFacebookUrl, "Company Facebook page URL"),
        setSetting("company_youtube_url", companyYoutubeUrl, "Company YouTube channel URL"),
        setSetting("company_logo", companyLogo, "Company logo (base64 data URL)"),
        setSetting("company_favicon", companyFavicon, "Company favicon (base64 data URL)"),
        setSetting("company_brand_color", companyBrandColor, "Company primary brand color"),
        setSetting("company_brand_secondary", companyBrandSecondary, "Company secondary brand color"),
        setSetting("company_brand_dark", companyBrandDark, "Company hover accent color"),
        setSetting("company_brand_light", companyBrandLight, "Company background tint color"),
        setSetting("company_font_family", companyFontFamily, "Company font family"),
      ]);
    }

    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { error: safeError(e, "Failed to save branding.") };
  }
}
