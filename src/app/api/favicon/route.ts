import { NextResponse } from "next/server";
import { getCompanyBranding } from "@/services/branding";

export async function GET(request: Request) {
  try {
    const branding = await getCompanyBranding();
    const faviconUrl = branding.favicon || branding.logo;

    if (faviconUrl && faviconUrl.startsWith("data:")) {
      const matches = faviconUrl.match(/^data:(.+?);base64,(.+)$/);
      if (matches && matches[1] && matches[2]) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }
    }

    if (faviconUrl && (faviconUrl.startsWith("http://") || faviconUrl.startsWith("https://"))) {
      return NextResponse.redirect(faviconUrl);
    }

    if (faviconUrl && faviconUrl.startsWith("/")) {
      const url = new URL(request.url);
      return NextResponse.redirect(new URL(faviconUrl, url.origin));
    }
  } catch {
    // Fallback if fails
  }

  const DEFAULT_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#f6821f"/>
  <text x="32" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="bold" fill="white">GG</text>
</svg>`;

  return new NextResponse(DEFAULT_FAVICON_SVG, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
