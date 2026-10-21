import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { TIMEZONE, addDays, localDateKey, zonedDateTime } from "@/lib/dates";

/**
 * Indicadores del centro de reportes, calculados desde datos persistidos.
 * Todos los filtros respetan las sucursales permitidas del usuario.
 */

export type ReportFilters = {
  from: Date;
  to: Date; // exclusivo
  branchIds: string[];
  userId?: string; // responsable
  categoryId?: string; // tipo de servicio (categoría de estudio)
};

/** Interpreta from/to (YYYY-MM-DD, hora local) con este mes como valor por omisión. */
export function parseDateRange(fromStr?: string, toStr?: string) {
  const today = localDateKey(new Date());
  const valid = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  let from = valid(fromStr) ?? `${today.slice(0, 8)}01`;
  let to = valid(toStr) ?? today;
  if (from > to) [from, to] = [to, from];
  // Máximo dos años para proteger el rendimiento.
  if (from < addDays(to, -731)) from = addDays(to, -731);
  return { fromKey: from, toKey: to, from: zonedDateTime(from, "00:00"), to: zonedDateTime(addDays(to, 1), "00:00") };
}

const orderItemCategory = (categoryId?: string): Prisma.OrderWhereInput =>
  categoryId ? { items: { some: { study: { categoryId } } } } : {};

export function ordersWhere(f: ReportFilters): Prisma.OrderWhereInput {
  return {
    branchId: { in: f.branchIds },
    createdAt: { gte: f.from, lt: f.to },
    ...(f.userId ? { responsibleId: f.userId } : {}),
    ...orderItemCategory(f.categoryId),
  };
}

export function paymentsWhere(f: ReportFilters): Prisma.PaymentWhereInput {
  return {
    branchId: { in: f.branchIds },
    status: "REGISTERED",
    createdAt: { gte: f.from, lt: f.to },
    ...(f.userId || f.categoryId ? { order: { ...(f.userId ? { responsibleId: f.userId } : {}), ...orderItemCategory(f.categoryId) } } : {}),
  };
}

export function quotesWhere(f: ReportFilters): Prisma.QuoteWhereInput {
  return {
    branchId: { in: f.branchIds },
    issuedAt: { gte: f.from, lt: f.to },
    ...(f.userId ? { responsibleId: f.userId } : {}),
    ...(f.categoryId ? { items: { some: { study: { categoryId: f.categoryId } } } } : {}),
  };
}

export function appointmentsWhere(f: ReportFilters): Prisma.AppointmentWhereInput {
  return {
    branchId: { in: f.branchIds },
    startsAt: { gte: f.from, lt: f.to },
    ...(f.userId ? { responsibleId: f.userId } : {}),
    ...(f.categoryId ? { studies: { some: { study: { categoryId: f.categoryId } } } } : {}),
  };
}

export function opportunitiesWhere(f: ReportFilters): Prisma.OpportunityWhereInput {
  return { branchId: { in: f.branchIds }, ...(f.userId ? { ownerId: f.userId } : {}) };
}

async function sumPayments(where: Prisma.PaymentWhereInput) {
  const [inflow, refunds] = await Promise.all([
    db.payment.aggregate({ _sum: { amountCents: true }, where: { ...where, kind: { not: "REFUND" } } }),
    db.payment.aggregate({ _sum: { amountCents: true }, where: { ...where, kind: "REFUND" } }),
  ]);
  return (inflow._sum.amountCents ?? 0) - (refunds._sum.amountCents ?? 0);
}

export async function salesReport(f: ReportFilters) {
  const oWhere = ordersWhere(f);
  const [revenue, ordersCount, paidOrders, discounts, byBranchRaw, branches, byMethod] = await Promise.all([
    sumPayments(paymentsWhere(f)),
    db.order.count({ where: { ...oWhere, status: { not: "CANCELLED" } } }),
    db.order.aggregate({ _count: true, _sum: { totalCents: true }, where: { ...oWhere, paymentStatus: "PAID", status: { not: "CANCELLED" } } }),
    db.order.aggregate({ _count: true, _sum: { discountCents: true }, where: { ...oWhere, status: { not: "CANCELLED" }, discountCents: { gt: 0 } } }),
    db.payment.groupBy({ by: ["branchId"], _sum: { amountCents: true }, where: { ...paymentsWhere(f), kind: { not: "REFUND" } } }),
    db.branch.findMany({ where: { id: { in: f.branchIds } }, select: { id: true, name: true } }),
    db.payment.groupBy({ by: ["method"], _sum: { amountCents: true }, where: { ...paymentsWhere(f), kind: { not: "REFUND" } } }),
  ]);

  const items = await db.orderItem.findMany({
    where: { order: { ...oWhere, status: { not: "CANCELLED" } }, ...(f.categoryId ? { study: { categoryId: f.categoryId } } : {}) },
    select: { studyId: true, studyCode: true, studyName: true, quantity: true, lineTotalCents: true, study: { select: { category: { select: { name: true } } } } },
  });
  const byStudy = new Map<string, { code: string; name: string; category: string; quantity: number; cents: number }>();
  const byCategory = new Map<string, number>();
  for (const it of items) {
    const s = byStudy.get(it.studyId) ?? { code: it.studyCode, name: it.studyName, category: it.study.category.name, quantity: 0, cents: 0 };
    s.quantity += it.quantity;
    s.cents += it.lineTotalCents;
    byStudy.set(it.studyId, s);
    byCategory.set(it.study.category.name, (byCategory.get(it.study.category.name) ?? 0) + it.lineTotalCents);
  }

  return {
    revenue,
    ordersCount,
    paidOrdersCount: paidOrders._count,
    averageTicket: paidOrders._count ? Math.round((paidOrders._sum.totalCents ?? 0) / paidOrders._count) : 0,
    discountCents: discounts._sum.discountCents ?? 0,
    discountCount: discounts._count,
    byBranch: branches
      .map((b) => ({ name: b.name.replace("Sucursal ", ""), cents: byBranchRaw.find((x) => x.branchId === b.id)?._sum.amountCents ?? 0 }))
      .sort((a, b) => b.cents - a.cents),
    byMethod: byMethod.map((m) => ({ method: m.method, cents: m._sum.amountCents ?? 0 })),
    byStudy: [...byStudy.values()].sort((a, b) => b.cents - a.cents),
    byCategory: [...byCategory.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents),
  };
}

/** Ingresos por día (hora local), con días sin movimiento en cero. */
export async function dailyRevenue(f: ReportFilters, fromKey: string, toKey: string) {
  if (!f.branchIds.length) return [];
  const userCond = f.userId ? Prisma.sql`AND o."responsibleId" = ${f.userId}` : Prisma.empty;
  const catCond = f.categoryId
    ? Prisma.sql`AND EXISTS (SELECT 1 FROM "OrderItem" oi JOIN "Study" s ON s.id = oi."studyId" WHERE oi."orderId" = o.id AND s."categoryId" = ${f.categoryId})`
    : Prisma.empty;
  const rows = await db.$queryRaw<{ day: string; cents: bigint }[]>`
    SELECT to_char(p."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TIMEZONE}, 'YYYY-MM-DD') AS day,
           SUM(CASE WHEN p.kind = 'REFUND' THEN -p."amountCents" ELSE p."amountCents" END) AS cents
    FROM "Payment" p JOIN "Order" o ON o.id = p."orderId"
    WHERE p."branchId" IN (${Prisma.join(f.branchIds)}) AND p.status = 'REGISTERED'
      AND p."createdAt" >= ${f.from} AND p."createdAt" < ${f.to} ${userCond} ${catCond}
    GROUP BY 1 ORDER BY 1`;
  const map = new Map(rows.map((r) => [r.day, Number(r.cents)]));
  const out: { label: string; day: string; value: number }[] = [];
  for (let d = fromKey; d <= toKey; d = addDays(d, 1)) {
    out.push({ day: d, label: `${d.slice(8, 10)}/${d.slice(5, 7)}`, value: map.get(d) ?? 0 });
    if (out.length > 800) break;
  }
  return out;
}

export async function patientsAppointmentsReport(f: ReportFilters) {
  const aWhere = appointmentsWhere(f);
  const [newPatients, byType, bySource, apptByStatus, homeCount] = await Promise.all([
    db.patient.count({ where: { branchId: { in: f.branchIds }, createdAt: { gte: f.from, lt: f.to } } }),
    db.patient.groupBy({ by: ["type"], _count: true, where: { branchId: { in: f.branchIds }, createdAt: { gte: f.from, lt: f.to } } }),
    db.patient.groupBy({ by: ["source"], _count: true, where: { branchId: { in: f.branchIds }, createdAt: { gte: f.from, lt: f.to } } }),
    db.appointment.groupBy({ by: ["status"], _count: true, where: aWhere }),
    db.appointment.count({ where: { ...aWhere, type: "HOME" } }),
  ]);
  const count = (s: string) => apptByStatus.find((x) => x.status === s)?._count ?? 0;
  const completed = count("COMPLETED");
  const noShow = count("NO_SHOW");
  const total = apptByStatus.reduce((a, b) => a + b._count, 0);
  return {
    newPatients,
    byType: byType.map((x) => ({ key: x.type, value: x._count })),
    bySource: bySource.map((x) => ({ key: x.source, value: x._count })).sort((a, b) => b.value - a.value),
    appointmentsTotal: total,
    confirmed: count("CONFIRMED") + count("IN_PROGRESS") + completed,
    completed,
    noShow,
    cancelled: count("CANCELLED"),
    attendanceRate: completed + noShow ? completed / (completed + noShow) : null,
    homeCount,
    byStatus: apptByStatus.map((x) => ({ key: x.status, value: x._count })),
  };
}

export async function commercialReport(f: ReportFilters) {
  const qWhere = quotesWhere(f);
  const oppBase = opportunitiesWhere(f);
  const [quotesByStatus, quotesTotal, won, lost, openOpps, byStage] = await Promise.all([
    db.quote.groupBy({ by: ["status"], _count: true, _sum: { totalCents: true }, where: qWhere }),
    db.quote.aggregate({ _count: true, _sum: { totalCents: true }, where: qWhere }),
    db.opportunity.aggregate({ _count: true, _sum: { estimatedCents: true }, where: { ...oppBase, stage: "WON", closedAt: { gte: f.from, lt: f.to } } }),
    db.opportunity.aggregate({ _count: true, _sum: { estimatedCents: true }, where: { ...oppBase, stage: "LOST", closedAt: { gte: f.from, lt: f.to } } }),
    db.opportunity.aggregate({ _count: true, _sum: { estimatedCents: true }, where: { ...oppBase, stage: { notIn: ["WON", "LOST"] } } }),
    db.opportunity.groupBy({ by: ["stage"], _count: true, _sum: { estimatedCents: true }, where: { ...oppBase, stage: { notIn: ["WON", "LOST"] } } }),
  ]);
  const qc = (s: string) => quotesByStatus.find((x) => x.status === s)?._count ?? 0;
  const accepted = qc("ACCEPTED");
  const closed = accepted + qc("REJECTED") + qc("EXPIRED");
  return {
    quotesCount: quotesTotal._count,
    quotesValue: quotesTotal._sum.totalCents ?? 0,
    quotesByStatus: quotesByStatus.map((x) => ({ key: x.status, value: x._count, cents: x._sum.totalCents ?? 0 })),
    accepted,
    conversionRate: closed ? accepted / closed : null,
    wonCount: won._count,
    wonValue: won._sum.estimatedCents ?? 0,
    lostCount: lost._count,
    winRate: won._count + lost._count ? won._count / (won._count + lost._count) : null,
    openCount: openOpps._count,
    openValue: openOpps._sum.estimatedCents ?? 0,
    byStage: byStage.map((x) => ({ key: x.stage, value: x._count, cents: x._sum.estimatedCents ?? 0 })),
  };
}

export async function emiliaReport(f: ReportFilters) {
  const convWhere: Prisma.ConversationWhereInput = {
    OR: [{ branchId: { in: f.branchIds } }, { branchId: null }],
    lastMessageAt: { gte: f.from, lt: f.to },
  };
  const [byStatus, apiActions, quotes, appointments, leads] = await Promise.all([
    db.conversation.groupBy({ by: ["status"], _count: true, where: convWhere }),
    db.auditLog.groupBy({ by: ["action"], _count: true, where: { actorType: "EMILIA", createdAt: { gte: f.from, lt: f.to } } }),
    db.quote.count({ where: { branchId: { in: f.branchIds }, source: "EMILIA", issuedAt: { gte: f.from, lt: f.to } } }),
    db.appointment.count({ where: { branchId: { in: f.branchIds }, source: "EMILIA", createdAt: { gte: f.from, lt: f.to } } }),
    db.opportunity.count({ where: { branchId: { in: f.branchIds }, source: "EMILIA", createdAt: { gte: f.from, lt: f.to } } }),
  ]);
  const total = byStatus.reduce((a, b) => a + b._count, 0);
  return {
    conversations: total,
    transferred: byStatus.find((x) => x.status === "TRANSFERRED")?._count ?? 0,
    byStatus: byStatus.map((x) => ({ key: x.status, value: x._count })),
    apiActions: apiActions.map((x) => ({ action: x.action.replace("emilia.", ""), count: x._count })).sort((a, b) => b.count - a.count),
    quotes,
    appointments,
    leads,
  };
}
