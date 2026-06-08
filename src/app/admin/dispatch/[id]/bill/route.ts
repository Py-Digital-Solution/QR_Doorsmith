import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/auth";
import { getDispatchBill } from "@/services/dispatch";

export const runtime = "nodejs";

const W = 595.28; // A4 pt
const H = 841.89;
const M = 40;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const bill = await getDispatchBill(id);
  if (!bill) return new Response("Dispatch not found", { status: 404 });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);

  let page = pdf.addPage([W, H]);
  let y = H - M;

  const text = (
    s: string,
    x: number,
    yy: number,
    size = 10,
    f = font,
    color = black,
  ) => page.drawText(s, { x, y: yy, size, font: f, color });

  // Header
  text("DoorSmith", M, y, 20, bold);
  text("Dispatch Bill / Delivery Note", M, y - 18, 11, font, gray);
  text(bill.billNo, W - M - bold.widthOfTextAtSize(bill.billNo, 16), y, 16, bold);
  y -= 50;

  text(`Date: ${bill.createdAt.slice(0, 10)}`, M, y, 10);
  y -= 16;
  text(`To (Counter): ${bill.counterName}`, M, y, 10);
  y -= 14;
  if (bill.counterContact) {
    text(bill.counterContact, M, y, 10, font, gray);
    y -= 14;
  }
  y -= 10;

  // Table header
  text("#", M, y, 9, bold, gray);
  text("SERIAL", M + 30, y, 9, bold, gray);
  text("TYPE", M + 200, y, 9, bold, gray);
  text("SKU", M + 290, y, 9, bold, gray);
  y -= 6;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: gray });
  y -= 16;

  bill.units.forEach((u, i) => {
    if (y < M + 60) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
    text(String(i + 1), M, y, 10);
    text(u.serialNo, M + 30, y, 10);
    text(u.type.toUpperCase(), M + 200, y, 10);
    text(u.sku || "—", M + 290, y, 10);
    y -= 16;
  });

  y -= 10;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: gray });
  y -= 18;
  text(`Scanned units: ${bill.unitCount}`, M, y, 10, bold);
  text(`Total codes: ${bill.totalCodes}`, M + 200, y, 10, bold);

  const bytes = await pdf.save();
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${bill.billNo}.pdf"`,
    },
  });
}
