import "server-only";
import type { PDFDocument } from "pdf-lib";

type EmbeddedImage = Awaited<ReturnType<PDFDocument["embedPng"]>>;

/**
 * Embed the company logo into a pdf-lib document.
 * Accepts both base64 data URLs (stored in Settings) and plain HTTPS URLs.
 * Returns null if the logo is empty, unsupported, or fails to load.
 */
export async function embedLogo(
  pdf: PDFDocument,
  logoUrl: string,
): Promise<EmbeddedImage | null> {
  if (!logoUrl) return null;

  try {
    let buf: ArrayBuffer;
    let mimeType: string;

    if (logoUrl.startsWith("data:")) {
      // data:<mime>;base64,<data>
      const commaIdx = logoUrl.indexOf(",");
      if (commaIdx === -1) return null;
      const header = logoUrl.slice(0, commaIdx); // "data:image/png;base64"
      const b64 = logoUrl.slice(commaIdx + 1);
      mimeType = header.replace("data:", "").replace(";base64", "");
      buf = Buffer.from(b64, "base64").buffer as ArrayBuffer;
    } else {
      // External URL  fetch with a 5-second timeout so PDFs don't hang
      const res = await fetch(logoUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      buf = await res.arrayBuffer();
      mimeType = res.headers.get("content-type") ?? "image/png";
    }

    if (mimeType.includes("png")) return await pdf.embedPng(buf);
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return await pdf.embedJpg(buf);
    return null; // SVG / WebP not supported by pdf-lib
  } catch {
    return null;
  }
}
