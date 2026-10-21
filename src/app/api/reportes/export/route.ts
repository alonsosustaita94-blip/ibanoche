import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { resolveBranchFilter } from "@/lib/auth/guard";
import { TIMEZONE } from "@/lib/dates";
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPE,
  CLIENT_TYPE,
  OPPORTUNITY_STAGE,
  ORDER_STATUS,
  PAYMENT_KIND,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  QUOTE_STATUS,
} from "@/lib/labels";
import { fullName } from "@/lib/utils";
import {
  appointmentsWhere,
  opportunitiesWhere,
  ordersWhere,
  parseDateRange,
  paymentsWhere,
  quotesWhere,
  salesReport,
  type ReportFilters,
} from "@/server/services/reports";

const REPORTS = ["ventas", "estudios", "cotizaciones", "citas", "oportunidades", "pagos"] as const;
type Report = (typeof REPORTS)[number];
const MAX_ROWS = 20000;

const dt = new Intl.DateTimeFormat("sv-SE", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fmtDate = (d: Date | null | undefined) => (d ? dt.format(d) : "");
const pesos = (cents: number) => (cents / 100).toFixed(2);

/** Escapa una celda CSV; neutraliza fórmulas (=, +, -, @) para hojas de cálculo. */
function cell(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: unknown[][]) {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

async function build(report: Report, f: ReportFilters): Promise<{ header: string[]; rows: unknown[][] }> {
  switch (report) {
    case "ventas": {
      const orders = await db.order.findMany({
        where: ordersWhere(f),
        include: { patient: true, branch: true, responsible: true, _count: { select: { items: true } } },
        orderBy: { createdAt: "asc" },
        take: MAX_ROWS,
      });
      return {
        header: ["Folio", "Fecha", "Paciente", "Sucursal", "Estudios", "Subtotal", "Descuento", "Total", "Pagado", "Estado de pago", "Estado", "Responsable"],
        rows: orders.map((o) => [
          o.folio,
          fmtDate(o.createdAt),
          fullName(o.patient),
          o.branch.name,
          o._count.items,
          pesos(o.subtotalCents),
          pesos(o.discountCents),
          pesos(o.totalCents),
          pesos(o.paidCents),
          PAYMENT_STATUS[o.paymentStatus]?.label,
          ORDER_STATUS[o.status]?.label,
          o.responsible?.name ?? "",
        ]),
      };
    }
    case "estudios": {
      const s = await salesReport(f);
      return { header: ["Código", "Estudio", "Categoría", "Cantidad", "Importe"], rows: s.byStudy.map((x) => [x.code, x.name, x.category, x.quantity, pesos(x.cents)]) };
    }
    case "pagos": {
      const payments = await db.payment.findMany({
        where: paymentsWhere(f),
        include: { order: { include: { patient: true } }, branch: true, receivedBy: true },
        orderBy: { createdAt: "asc" },
        take: MAX_ROWS,
      });
      return {
        header: ["Recibo", "Fecha", "Orden", "Paciente", "Sucursal", "Método", "Tipo", "Importe", "Referencia", "Recibió"],
        rows: payments.map((p) => [
          p.folio,
          fmtDate(p.createdAt),
          p.order.folio,
          fullName(p.order.patient),
          p.branch.name,
          PAYMENT_METHOD[p.method],
          PAYMENT_KIND[p.kind],
          pesos(p.kind === "REFUND" ? -p.amountCents : p.amountCents),
          p.reference ?? "",
          p.receivedBy?.name ?? "",
        ]),
      };
    }
    case "cotizaciones": {
      const quotes = await db.quote.findMany({ where: quotesWhere(f), include: { patient: true, branch: true, responsible: true }, orderBy: { issuedAt: "asc" }, take: MAX_ROWS });
      return {
        header: ["Folio", "Fecha", "Vigencia", "Paciente o prospecto", "Sucursal", "Subtotal", "Descuento", "Total", "Estado", "Responsable"],
        rows: quotes.map((q) => [
          q.folio,
          fmtDate(q.issuedAt),
          fmtDate(q.validUntil),
          q.patient ? fullName(q.patient) : (q.prospectName ?? ""),
          q.branch.name,
          pesos(q.subtotalCents),
          pesos(q.discountCents),
          pesos(q.totalCents),
          QUOTE_STATUS[q.status]?.label,
          q.responsible?.name ?? "",
        ]),
      };
    }
    case "citas": {
      const appts = await db.appointment.findMany({ where: appointmentsWhere(f), include: { patient: true, branch: true, responsible: true }, orderBy: { startsAt: "asc" }, take: MAX_ROWS });
      return {
        header: ["Folio", "Fecha y hora", "Paciente", "Sucursal", "Tipo", "Estado", "Responsable"],
        rows: appts.map((a) => [a.folio, fmtDate(a.startsAt), fullName(a.patient), a.branch.name, APPOINTMENT_TYPE[a.type], APPOINTMENT_STATUS[a.status]?.label, a.responsible?.name ?? ""]),
      };
    }
    case "oportunidades": {
      const opps = await db.opportunity.findMany({
        where: { ...opportunitiesWhere(f), OR: [{ stage: { notIn: ["WON", "LOST"] } }, { closedAt: { gte: f.from, lt: f.to } }] },
        include: { owner: true, branch: true },
        orderBy: { createdAt: "asc" },
        take: MAX_ROWS,
      });
      return {
        header: ["Título", "Prospecto", "Tipo de cliente", "Etapa", "Valor estimado", "Responsable", "Sucursal", "Próximo seguimiento", "Cierre"],
        rows: opps.map((o) => [o.title, o.prospectName, CLIENT_TYPE[o.clientType], OPPORTUNITY_STAGE[o.stage]?.label, pesos(o.estimatedCents), o.owner?.name ?? "", o.branch.name, fmtDate(o.nextFollowUpAt), fmtDate(o.closedAt)]),
      };
    }
  }
}

/** Exportación CSV de reportes administrativos. Requiere el permiso reports.export. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para exportar." }, { status: 401 });
  if (!user.permissions.includes("reports.export")) return NextResponse.json({ error: "Tu rol no permite exportar reportes." }, { status: 403 });

  const p = req.nextUrl.searchParams;
  const report = p.get("report") as Report;
  if (!REPORTS.includes(report)) return NextResponse.json({ error: "Reporte no disponible." }, { status: 400 });

  const range = parseDateRange(p.get("from") ?? undefined, p.get("to") ?? undefined);
  const branchIds = resolveBranchFilter(user, p.get("branch") ?? undefined);
  const userParam = p.get("user") ?? undefined;
  const categoryParam = p.get("category") ?? undefined;
  const filters: ReportFilters = {
    from: range.from,
    to: range.to,
    branchIds,
    userId: userParam && /^[a-z0-9]{10,40}$/i.test(userParam) ? userParam : undefined,
    categoryId: categoryParam && /^[a-z0-9]{10,40}$/i.test(categoryParam) ? categoryParam : undefined,
  };

  const { header, rows } = await build(report, filters);
  await audit({
    userId: user.id,
    action: "report.export",
    entity: "Report",
    entityId: report,
    summary: `${report} ${range.fromKey} a ${range.toKey} (${rows.length} filas)`,
    after: { report, from: range.fromKey, to: range.toKey, branchIds, userId: filters.userId, categoryId: filters.categoryId, rows: rows.length },
  });

  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ibanoche-${report}-${range.fromKey}_${range.toKey}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
