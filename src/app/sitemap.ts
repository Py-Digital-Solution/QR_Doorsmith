import { connectDB } from "@/db/mongoose";
import { Organization } from "@/models/Organization";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://doorsmith.in";

  try {
    await connectDB();
    const orgs = await Organization.find({ status: "active" }).select("slug updatedAt").lean();

    const orgUrls: MetadataRoute.Sitemap = orgs.map((org) => ({
      url: `${baseUrl}/org/${org.slug}/login`,
      lastModified: (org.updatedAt as Date) ?? new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

    return [
      {
        url: `${baseUrl}/login`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      },
      ...orgUrls,
    ];
  } catch {
    // If DB is down during sitemap generation, return minimal sitemap
    return [
      {
        url: `${baseUrl}/login`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      },
    ];
  }
}
