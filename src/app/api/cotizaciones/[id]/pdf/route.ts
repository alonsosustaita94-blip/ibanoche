import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { bpsToPercent, formatMoney } from "@/lib/money";
import { fullName } from "@/lib/utils";

const BLUE = rgb(0x12 / 255, 0x54 / 255, 0x9a / 255);
const TURQ = rgb(0x32 / 255, 0xb8 / 255, 0xbe / 255);
const CORAL = rgb(0xe7 / 255, 0x47 / 255, 0x58 / 255);
const INK = rgb(0x13 / 255, 0x29 / 255, 0x4b / 255);
const GRAY = rgb(0x59 / 255, 0x6a / 255, 0x82 / 255);
const LIGHT = rgb(0xf4 / 255, 0xf7 / 255, 0xfa / 255);

/** Las fuentes estándar usan WinAnsi: se sustituyen caracteres no representables. */
const safe = (s: string) => s.replace(/[−–]/g, "-").replace(/[^\x20-\x7E -ÿ—•]/g, "");

function text(page: PDFPage, s: string, x: number, y: number, font: PDFFont, size: number, color = INK) {
  page.drawText(safe(s), { x, y, size, font, color });
}

function right(page: PDFPage, s: string, xRight: number, y: number, font: PDFFont, size: number, color = INK) {
  const t = safe(s);
  page.drawText(t, { x: xRight - font.widthOfTextAtSize(t, size), y, size, font, color });
}

function fit(s: string, font: PDFFont, size: number, max: number) {
  let t = safe(s);
  while (t.length > 3 && font.widthOfTextAtSize(t, size) > max) t = t.slice(0, -2);
  return t === safe(s) ? t : `${t.trimEnd()}…`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!user.permissions.includes("quotes.view")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  const { id } = await params;
  const quote = await db.quote.findFirst({
    where: { id, branchId: { in: user.branchIds } },
    include: { items: true, patient: true, branch: true, responsible: true },
  });
  if (!quote) return NextResponse.json({ error: "No encontrada." }, { status: 404 });

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Cotización ${quote.folio}`);
  pdf.setAuthor("IBANOCHE CRM");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  const M = 48;
  const W = 612 - M * 2;

  // Encabezado
  page.drawRectangle({ x: 0, y: 712, width: 612, height: 80, color: BLUE });
  page.drawRectangle({ x: 0, y: 708, width: 612, height: 4, color: TURQ });
  text(page, "IBANOCHE", M, 752, bold, 22, rgb(1, 1, 1));
  text(page, "LABORATORIO DE ANÁLISIS CLÍNICOS", M, 736, regular, 8, rgb(0.85, 0.95, 0.96));
  right(page, "COTIZACIÓN", 612 - M, 754, bold, 16, rgb(1, 1, 1));
  right(page, quote.folio, 612 - M, 737, regular, 10, rgb(0.9, 0.95, 1));

  let y = 680;
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE !== "false" || quote.isDemo;
  if (demo) {
    page.drawRectangle({ x: M, y: y - 6, width: W, height: 20, color: rgb(0.99, 0.96, 0.89) });
    text(page, "Documento de demostración: datos y precios ficticios, sin validez comercial.", M + 8, y, bold, 8.5, rgb(0.79, 0.54, 0.07));
    y -= 30;
  }

  const patientName = quote.patient ? fullName(quote.patient) : quote.prospectName ?? "Prospecto";
  const info: [string, string][] = [
    ["Paciente", patientName],
    ["Teléfono", quote.patient?.phone ?? quote.prospectPhone ?? "—"],
    ["Fecha", formatDate(quote.issuedAt)],
    ["Vigencia", `Hasta el ${formatDate(quote.validUntil)}`],
    ["Sucursal", quote.branch.name],
    ["Atendió", quote.responsible?.name ?? "Emilia / sistema"],
  ];
  info.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (W / 2);
    const yy = y - row * 30;
    text(page, k.toUpperCase(), x, yy, bold, 7, GRAY);
    text(page, fit(v, regular, 10.5, W / 2 - 12), x, yy - 13, regular, 10.5);
  });
  y -= 3 * 30 + 16;

  // Tabla
  const cols = { study: M + 8, code: M + 245, price: M + 345, qty: M + 395, total: M + W - 8 };
  const header = () => {
    page.drawRectangle({ x: M, y: y - 8, width: W, height: 24, color: LIGHT });
    text(page, "ESTUDIO", cols.study, y, bold, 8, GRAY);
    text(page, "CÓDIGO", cols.code, y, bold, 8, GRAY);
    right(page, "PRECIO", cols.price + 30, y, bold, 8, GRAY);
    right(page, "CANT.", cols.qty + 30, y, bold, 8, GRAY);
    right(page, "IMPORTE", cols.total, y, bold, 8, GRAY);
    y -= 28;
  };
  header();
  for (const it of quote.items) {
    if (y < 150) {
      page = pdf.addPage([612, 792]);
      y = 740;
      header();
    }
    text(page, fit(it.studyName, regular, 10, 230), cols.study, y, regular, 10);
    text(page, it.studyCode, cols.code, y, regular, 8.5, GRAY);
    right(page, formatMoney(it.unitPriceCents), cols.price + 30, y, regular, 10);
    right(page, String(it.quantity), cols.qty + 30, y, regular, 10);
    right(page, formatMoney(it.lineTotalCents), cols.total, y, bold, 10);
    page.drawLine({ start: { x: M, y: y - 9 }, end: { x: M + W, y: y - 9 }, thickness: 0.5, color: rgb(0.9, 0.92, 0.95) });
    y -= 24;
  }

  // Totales
  y -= 6;
  const tx = M + W - 200;
  const totals: [string, string, boolean][] = [
    ["Subtotal", formatMoney(quote.subtotalCents), false],
    [`Descuento (${bpsToPercent(quote.discountBps)})`, `-${formatMoney(quote.discountCents)}`, false],
  ];
  for (const [k, v] of totals) {
    text(page, k, tx, y, regular, 10, GRAY);
    right(page, v, M + W - 8, y, regular, 10, k.startsWith("Desc") && quote.discountCents ? CORAL : INK);
    y -= 18;
  }
  y -= 10;
  page.drawRectangle({ x: tx - 8, y: y - 10, width: 208, height: 28, color: BLUE });
  text(page, "TOTAL", tx, y, bold, 11, rgb(1, 1, 1));
  right(page, formatMoney(quote.totalCents), M + W - 8, y, bold, 13, rgb(1, 1, 1));
  y -= 46;

  if (quote.notes) {
    text(page, "NOTAS", M, y, bold, 7, GRAY);
    text(page, fit(quote.notes.replace(/\s+/g, " "), regular, 9.5, W), M, y - 13, regular, 9.5);
    y -= 36;
  }

  // Pie
  const foot = [
    "Precios sujetos a la vigencia indicada. Cantidades en pesos mexicanos (MXN).",
    "Las indicaciones de preparación las confirma el personal del laboratorio antes de la toma de muestra.",
    "Este documento es una cotización administrativa: no contiene ni sustituye información clínica.",
  ];
  foot.forEach((l, i) => text(page, l, M, 70 - i * 12, regular, 7.5, GRAY));
  page.drawRectangle({ x: 0, y: 0, width: 612, height: 6, color: TURQ });
  page.drawRectangle({ x: 0, y: 0, width: 90, height: 6, color: CORAL });

  const bytes = await pdf.save();
  await audit({ userId: user.id, action: "quote.pdf", entity: "Quote", entityId: quote.id, branchId: quote.branchId, summary: quote.folio });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quote.folio}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
