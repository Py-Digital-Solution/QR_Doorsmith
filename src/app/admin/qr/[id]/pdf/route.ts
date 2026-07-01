import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { getBatchPrintData } from "@/services/qr";
import { getCompanyBranding } from "@/services/branding";
import { resolvePageSize } from "@/lib/page-sizes";

export const runtime = "nodejs";

const MM = 2.834645669; // mm → pt
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

  // Page dimensions come from the batch's saved print-sheet setting.
  const { widthMm, heightMm } = resolvePageSize(data.pageSize);
  const PAGE_W = widthMm * MM;
  const PAGE_H = heightMm * MM;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.5, 0.5, 0.5);
  const footerText = [branding.name, branding.website].filter(Boolean).join("  ·  ") || "DoorSmith";

  const CAPTION_GAP = 9; // space under each QR for its serial caption
  const PARENT_LINE_H = 6; // extra space for the "S:"/"M:" parent-serial line, when present
  const ROW_GAP = 4; // vertical breathing room between rows
  const SECTION_GAP = 10; // extra breathing room between product/small/master blocks

  // Each type gets its own column count (and therefore its own cell width and
  // capped QR size), so a sheet of small product codes packs tightly instead
  // of inheriting a column width sized for the master boxes.
  type CodeType = "master" | "small" | "product";

  // Products are labelled with their parent small box, and smalls with their
  // parent master box, so packers can tell which box a code belongs to just
  // by reading the printed sticker (not just by looking it up in the admin panel).
  const PARENT_PREFIX: Partial<Record<CodeType, string>> = { product: "S:", small: "M:" };

  const colsByType: Record<CodeType, number> = {
    master: Math.max(1, data.columns.master),
    small: Math.max(1, data.columns.small),
    product: Math.max(1, data.columns.product),
  };
  const cellWByType: Record<CodeType, number> = {
    master: (PAGE_W - 2 * MARGIN) / colsByType.master,
    small: (PAGE_W - 2 * MARGIN) / colsByType.small,
    product: (PAGE_W - 2 * MARGIN) / colsByType.product,
  };
  const qrSizePt: Record<CodeType, number> = {
    master: Math.min(data.qrSizes.master * MM, cellWByType.master - 8),
    small: Math.min(data.qrSizes.small * MM, cellWByType.small - 8),
    product: Math.min(data.qrSizes.product * MM, cellWByType.product - 8),
  };

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
  let y = PAGE_H - MARGIN; // top edge of the current row

  // Codes arrive pre-sorted product → small → master (see getBatchPrintData),
  // so group them into contiguous same-type runs and lay out each run with
  // its own column count.
  type Section = { type: CodeType; start: number; end: number };
  const sections: Section[] = [];
  for (let i = 0; i < data.codes.length; i++) {
    const t = data.codes[i].type as CodeType;
    const last = sections[sections.length - 1];
    if (last && last.type === t) last.end = i;
    else sections.push({ type: t, start: i, end: i });
  }

  sections.forEach((section, sectionIdx) => {
    const cols = colsByType[section.type];
    const cellW = cellWByType[section.type];
    const qrSize = qrSizePt[section.type];
    const hasParentLine =
      PARENT_PREFIX[section.type] != null &&
      data.codes.slice(section.start, section.end + 1).some((c) => c.parentSerial);
    const rowHeight = qrSize + CAPTION_GAP + (hasParentLine ? PARENT_LINE_H : 0);

    for (let i = section.start; i <= section.end; i += cols) {
      const rowCodes = data.codes.slice(i, Math.min(i + cols, section.end + 1));

      // New page if this row won't fit above the bottom margin.
      if (y - rowHeight < MARGIN) {
        page = addPageWithFooter();
        y = PAGE_H - MARGIN;
      }

      rowCodes.forEach((code, col) => {
        const cellX = MARGIN + col * cellW;

        const { d, n } = qrSvgPath(code.serialNo);
        const scale = qrSize / n;
        const qrX = cellX + (cellW - qrSize) / 2;

        // drawSvgPath positions the path's (0,0) at (x, y) and renders downward.
        page.drawSvgPath(d, { x: qrX, y, scale, color: black });

        // Caption is just the code (no type category). Cap its width to the QR's
        // own footprint (not the wider cell) so long serials shrink down instead
        // of visually overrunning past the QR square into the next column.
        const caption = code.serialNo;
        const maxTextW = Math.min(qrSize, cellW - 6);
        const baseSize = 6;
        const baseW = font.widthOfTextAtSize(caption, baseSize);
        const fontSize = baseW > maxTextW ? Math.max(3, (baseSize * maxTextW) / baseW) : baseSize;
        const textW = font.widthOfTextAtSize(caption, fontSize);
        page.drawText(caption, {
          x: qrX + (qrSize - textW) / 2,
          y: y - qrSize - 5,
          size: fontSize,
          font,
        });

        // Parent-serial line (e.g. "S: DS-SM-...-0031" under a product, or
        // "M: DS-MS-...-0002" under a small)  lets packers trace which box a
        // code belongs to straight off the printed sticker.
        if (hasParentLine && code.parentSerial) {
          const prefix = PARENT_PREFIX[code.type as CodeType] ?? "";
          const parentCaption = `${prefix} ${code.parentSerial}`;
          const parentSize = 4.5;
          const parentBaseW = font.widthOfTextAtSize(parentCaption, parentSize);
          const parentFontSize =
            parentBaseW > maxTextW ? Math.max(3, (parentSize * maxTextW) / parentBaseW) : parentSize;
          const parentTextW = font.widthOfTextAtSize(parentCaption, parentFontSize);
          page.drawText(parentCaption, {
            x: qrX + (qrSize - parentTextW) / 2,
            y: y - qrSize - 5 - PARENT_LINE_H,
            size: parentFontSize,
            font,
            color: gray,
          });
        }
      });

      y -= rowHeight + ROW_GAP;
    }

    // Extra breathing room before the next type's block (skip after the last).
    if (sectionIdx < sections.length - 1) y -= SECTION_GAP - ROW_GAP;
  });

  const bytes = await pdf.save();
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="qr-batch-${id}.pdf"`,
    },
  });
}
