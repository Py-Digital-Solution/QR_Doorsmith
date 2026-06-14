import "server-only";
import { getSetting } from "@/services/settings";

export type CompanyBranding = {
  name: string;
  logo: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  website: string;
};

export async function getCompanyBranding(): Promise<CompanyBranding> {
  const [name, logo, tagline, phone, email, address, website] =
    await Promise.all([
      getSetting<string>("company_name", ""),
      getSetting<string>("company_logo", ""),
      getSetting<string>("company_tagline", ""),
      getSetting<string>("company_phone", ""),
      getSetting<string>("company_email", ""),
      getSetting<string>("company_address", ""),
      getSetting<string>("company_website", ""),
    ]);
  return { name, logo, tagline, phone, email, address, website };
}
