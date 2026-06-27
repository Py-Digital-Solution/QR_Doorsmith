import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import * as XLSX from "xlsx";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { listUsers } from "@/services/users";
import { listProducts } from "@/services/products";
import { listBatches, listBatchCodes } from "@/services/qr";
import { listDispatches, listCounterCodes, listCounterDispatches } from "@/services/dispatch";
import { listCounterReturns } from "@/services/returns";
import { listCounterRedemptions, listKhatiRedemptions } from "@/services/redemption";
import { listKhatiScans } from "@/services/khati";
import { getCompanyBranding, type CompanyBranding } from "@/services/branding";
import { embedLogo } from "@/lib/pdf-logo";
import { formatISTDate, formatISTFull } from "@/lib/datetime";

const ALL = { page: 1, pageSize: 10000 };

async function buildTablePdf(
  title: string,
  headers: string[],
  rows: string[][],
  branding: CompanyBranding,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // A4 landscape
  const W = 841.89, H = 595.28;
  const margin = 36;
  const colCount = Math.max(headers.length, 1);
  const cw = (W - margin * 2) / colCount;
  const brand = rgb(0.965, 0.51, 0.122);
  const navy = rgb(0.059, 0.141, 0.267);
  const rowBg = rgb(0.973, 0.976, 0.98);
  const white = rgb(1, 1, 1);
  const dark = rgb(0.16, 0.18, 0.22);
  const gray = rgb(0.5, 0.5, 0.5);

  const state = { page: doc.addPage([W, H]), y: H - margin };

  function ensure(h: number) {
    if (state.y - h < margin) {
      state.page = doc.addPage([W, H]);
      state.y = H - margin;
    }
  }

  const logoImg = await embedLogo(doc, branding.logo);

  // ── Company header block ─────────────────────────────────────────
  ensure(52);
  const headerH = 48;
  const companyName = branding.name || "DoorSmith";

  let textX = margin;
  if (logoImg) {
    const logoH = 32;
    const logoW = Math.round(logoImg.width * (logoH / logoImg.height));
    state.page.drawImage(logoImg, {
      x: margin,
      y: state.y - headerH + (headerH - logoH) / 2,
      width: logoW,
      height: logoH,
    });
    textX = margin + logoW + 10;
  }

  state.page.drawText(companyName, { x: textX, y: state.y - 14, size: 13, font: bold, color: navy });
  if (branding.tagline) {
    state.page.drawText(branding.tagline, { x: textX, y: state.y - 25, size: 8, font: regular, color: gray });
  }
  const contactLine = [branding.phone, branding.email, branding.website].filter(Boolean).join("  ·  ");
  if (contactLine) {
    state.page.drawText(contactLine, { x: textX, y: state.y - 35, size: 7, font: regular, color: gray });
  }

  // Title + date (right side)
  const dateStr = `Exported: ${formatISTFull()}`;
  const titleW = bold.widthOfTextAtSize(title, 11);
  const dateW = regular.widthOfTextAtSize(dateStr, 7);
  state.page.drawText(title, { x: W - margin - titleW, y: state.y - 14, size: 11, font: bold, color: navy });
  state.page.drawText(dateStr, { x: W - margin - dateW, y: state.y - 27, size: 7, font: regular, color: gray });

  state.y -= headerH + 6;

  // Thin brand rule
  state.page.drawLine({
    start: { x: margin, y: state.y },
    end: { x: W - margin, y: state.y },
    thickness: 1,
    color: brand,
  });
  state.y -= 10;

  // Header row
  ensure(24);
  state.page.drawRectangle({ x: margin, y: state.y - 24, width: W - margin * 2, height: 24, color: brand });
  headers.forEach((h, i) => {
    state.page.drawText(clip(h, 22), {
      x: margin + i * cw + 4, y: state.y - 24 + 8, size: 8.5, font: bold, color: white, maxWidth: cw - 8,
    });
  });
  state.y -= 24;

  // Data rows
  rows.forEach((row, ri) => {
    ensure(20);
    if (ri % 2 === 0) {
      state.page.drawRectangle({ x: margin, y: state.y - 20, width: W - margin * 2, height: 20, color: rowBg });
    }
    row.slice(0, colCount).forEach((cell, ci) => {
      state.page.drawText(clip(String(cell ?? ""), 28), {
        x: margin + ci * cw + 4, y: state.y - 20 + 5, size: 8, font: regular, color: dark, maxWidth: cw - 8,
      });
    });
    state.y -= 20;
  });

  return doc.save();
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function toXlsx(
  title: string,
  headers: string[],
  rows: string[][],
  branding: CompanyBranding,
): Buffer {
  const companyName = branding.name || "DoorSmith";
  const contactLine = [branding.phone, branding.email, branding.website].filter(Boolean).join("  |  ");

  // Company header rows before the data
  const headerRows: string[][] = [[companyName]];
  if (branding.tagline) headerRows.push([branding.tagline]);
  if (contactLine) headerRows.push([contactLine]);
  if (branding.address) headerRows.push([branding.address]);
  headerRows.push([`Report: ${title}`, `Exported: ${formatISTFull()}`]);
  headerRows.push([]); // blank separator before data
  headerRows.push(headers);
  headerRows.push(...rows);

  const ws = XLSX.utils.aoa_to_sheet(headerRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Export");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

async function respond(
  format: string,
  title: string,
  headers: string[],
  rows: string[][],
  branding: CompanyBranding,
) {
  const filename = slugify(title);
  if (format === "pdf") {
    const bytes = await buildTablePdf(title, headers, rows, branding);
    return new Response(bytes.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  }
  const buf = toXlsx(title, headers, rows, branding);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new Response(ab, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "";
  const format = sp.get("format") === "pdf" ? "pdf" : "xlsx";
  const q = sp.get("q") ?? undefined;
  const uid = session.user.id;
  const role = session.user.role;

  const branding = await getCompanyBranding();

  try {
    switch (type) {
      case "users": {
        const filterRole = sp.get("role") as import("@/lib/roles").UserRole | null;
        const createdBy = sp.get("createdBy") ?? undefined;
        const result = await listUsers({ role: filterRole ?? undefined, createdBy, search: q }, ALL);
        return respond(format, "Users", ["Name", "Email", "Phone", "Role", "Status"],
          result.items.map((u) => [u.name, u.email, u.phone, u.role, u.status]), branding);
      }

      case "products": {
        const result = await listProducts(ALL, q);
        return respond(format, "Products", ["SKU", "Name", "MRP", "Sales Price", "Reward Pts", "Status"],
          result.items.map((p) => [p.sku, p.name, String(p.mrp), String(p.salesPrice), String(p.rewardPoints), p.status]), branding);
      }

      case "qr-batches": {
        const result = await listBatches(ALL, q);
        return respond(format, "QR Batches", ["Product SKU", "Total", "Masters", "Serial Start", "Serial End", "Status"],
          result.items.map((b) => [b.productSku, String(b.total), String(b.masterCount), String(b.serialStart), String(b.serialEnd), b.status]), branding);
      }

      case "qr-codes": {
        const batchId = sp.get("batchId") ?? "";
        if (!batchId) return NextResponse.json({ error: "Missing batchId" }, { status: 400 });
        const filter = (sp.get("status") as Parameters<typeof listBatchCodes>[2]) ?? "all";
        const result = await listBatchCodes(batchId, ALL, filter, q);
        return respond(format, "QR Codes", ["Serial No", "Type", "SKU", "Status", "Counter"],
          result.items.map((c) => [c.serialNo, c.type, c.sku, c.status, c.counterLabel ?? "—"]), branding);
      }

      case "dispatches": {
        const result = await listDispatches(ALL, q);
        return respond(format, "Dispatches", ["Bill No", "Counter", "Units", "Total Codes", "Date"],
          result.items.map((d) => [d.billNo, d.counterLabel, String(d.unitCount), String(d.totalCodes), formatISTDate(d.createdAt)]), branding);
      }

      case "counter-khatis": {
        const createdBy = role === "admin" ? undefined : uid;
        const result = await listUsers({ role: "khati", createdBy, search: q }, ALL);
        return respond(format, "Khatis", ["Name", "Phone", "Status"],
          result.items.map((u) => [u.name, u.phone, u.status]), branding);
      }

      case "sales-counters": {
        const createdBy = role === "admin" ? undefined : uid;
        const result = await listUsers({ role: "counter", createdBy, search: q }, ALL);
        return respond(format, "Counters", ["Name", "Email", "Status"],
          result.items.map((u) => [u.name, u.email, u.status]), branding);
      }

      case "counter-inventory": {
        const qrType = sp.get("type") as import("@/lib/qr").QrType | null;
        const result = await listCounterCodes(uid, ALL, { type: qrType ?? undefined }, q);
        return respond(format, "Counter Inventory", ["Serial No", "Type", "SKU", "Status"],
          result.items.map((c) => [c.serialNo, c.type, c.sku, c.status]), branding);
      }

      case "counter-dispatches": {
        const result = await listCounterDispatches(uid, ALL, q);
        return respond(format, "Dispatch History", ["Bill No", "Units", "Total Codes", "Date"],
          result.items.map((d) => [d.billNo, String(d.unitCount), String(d.totalCodes), formatISTDate(d.createdAt)]), branding);
      }

      case "counter-returns": {
        const result = await listCounterReturns(uid, ALL, q);
        return respond(format, "Return History", ["Serial No", "SKU", "Khati", "Counter", "Pts Reversed", "Date"],
          result.items.map((r) => [r.serialNo, r.sku, r.khatiName, r.counterName, String(r.pointsReversed), formatISTDate(r.createdAt)]), branding);
      }

      case "counter-redemptions": {
        const status = sp.get("status") ?? undefined;
        const result = await listCounterRedemptions(uid, ALL, { status, search: q });
        return respond(format, "Redemption Requests", ["Khati", "Phone", "Points", "Status", "Date"],
          result.items.map((r) => [r.khatiName, r.khatiPhone, String(r.points), r.status, formatISTDate(r.createdAt)]), branding);
      }

      case "khati-history": {
        const result = await listKhatiScans(uid, ALL, q);
        return respond(format, "Transaction History", ["Serial No", "SKU", "Points", "Type", "Date"],
          result.items.map((s) => [s.serialNo, s.sku, String(s.points), s.isReturn ? "Return" : "Scan", formatISTDate(s.scannedAt)]), branding);
      }

      case "khati-redemptions": {
        const result = await listKhatiRedemptions(uid, ALL);
        return respond(format, "My Redemptions", ["Points", "Status", "Date"],
          result.items.map((r) => [String(r.points), r.status, formatISTDate(r.createdAt)]), branding);
      }

      default:
        return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
    }
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
