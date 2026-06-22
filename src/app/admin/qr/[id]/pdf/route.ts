import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { getBatchPrintData } from "@/services/qr";
import { getCompanyBranding } from "@/services/branding";

export const runtime = "nodejs";

const MM = 2.834645669; // mm → pt
const PAGE_W = 210 * MM; // A4
const PAGE_H = 297 * MM;
const MARGIN = 10 * MM;

/**
 * Build an SVG path (in module units, 0..n) for a QR code  drawn as a single
 * vector path per code. Far faster than encoding/embedding a PNG per code.
 */
function qrSvgPath(text: string): { d: string; n: number } {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const data = qr.modules.data;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (data[r * n + c]) d += `M${c} ${r}h1v1h-1z`;
    }
  }
  return { d, n };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const [data, branding] = await Promise.all([
    getBatchPrintData(id),
    getCompanyBranding(),
  ]);
  if (!data) return new Response("Batch not found", { status: 404 });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.5, 0.5, 0.5);
  const footerText = [branding.name, branding.website].filter(Boolean).join("  ·  ") || "DoorSmith";

  const cols = Math.max(1, data.columns);
  const cellW = (PAGE_W - 2 * MARGIN) / cols;
  const labelH = data.labelHeightMm * MM;
  const cellH = labelH + 10; // room for the serial caption
  const rows = Math.max(1, Math.floor((PAGE_H - 2 * MARGIN) / cellH));
  const perPage = cols * rows;
  const qrSize = Math.min(cellW, labelH) - 8;

  function addPageWithFooter(): ReturnType<typeof pdf.addPage> {
    const p = pdf.addPage([PAGE_W, PAGE_H]);
    const fw = font.widthOfTextAtSize(footerText, 6);
    p.drawText(footerText, {
      x: (PAGE_W - fw) / 2,
      y: MARGIN / 2,
      size: 6,
      font,
      color: gray,
    });
    return p;
  }

  let page = addPageWithFooter();

  for (let i = 0; i < data.codes.length; i++) {
    if (i > 0 && i % perPage === 0) page = addPageWithFooter();

    const idx = i % perPage;
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const cellX = MARGIN + col * cellW;
    const cellTopY = PAGE_H - MARGIN - row * cellH;

    const { d, n } = qrSvgPath(data.codes[i].serialNo);
    const scale = qrSize / n;
    const qrX = cellX + (cellW - qrSize) / 2;

    // drawSvgPath positions the path's (0,0) at (x, y) and renders downward.
    page.drawSvgPath(d, { x: qrX, y: cellTopY, scale, color: black });

    const caption = `${data.codes[i].type.toUpperCase()} · ${data.codes[i].serialNo}`;
    const fontSize = 6;
    const textW = font.widthOfTextAtSize(caption, fontSize);
    page.drawText(caption, {
      x: cellX + (cellW - textW) / 2,
      y: cellTopY - qrSize - 8,
      size: fontSize,
      font,
    });
  }

  const bytes = await pdf.save();
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="qr-batch-${id}.pdf"`,
    },
  });
}
