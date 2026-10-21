import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { TIMEZONE } from "@/lib/dates";

/**
 * Indicadores calculados desde la base de datos. Toda consulta recibe las
 * sucursales permitidas para respetar la separación de datos.
 */

export type Range = { from: Date; to: Date };

export function previousRange({ from, to }: Range): Range {
  const span = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - span), to: from };
}

const PAID_STATUSES = ["PAID", "IN_PROGRESS", "COMPLETED"] as const;

export async function revenueCents(branchIds: string[], r: Range) {
  const agg = await db.payment.aggregate({
    _sum: { amountCents: true },
    where: { branchId: { in: branchIds }, status: "REGISTERED", kind: { not: "REFUND" }, createdAt: { gte: r.from, lt: r.to } },
  });
  const refunds = await db.payment.aggregate({
    _sum: { amountCents: true },
    where: { branchId: { in: branchIds }, status: "REGISTERED", kind: "REFUND", createdAt: { gte: r.from, lt: r.to } },
  });
  return (agg._sum.amountCents ?? 0) - (refunds._sum.amountCents ?? 0);
}

export async function kpis(branchIds: string[], r: Range) {
  const where = { branchId: { in: branchIds } };
  const [revenue, orders, attended, newPatients, pendingQuotes, openOpps, emiliaConvs] = await Promise.all([
    revenueCents(branchIds, r),
    db.order.count({ where: { ...where, createdAt: { gte: r.from, lt: r.to }, status: { not: "CANCELLED" } } }),
    db.order
      .groupBy({ by: ["patientId"], where: { ...where, createdAt: { gte: r.from, lt: r.to }, status: { in: [...PAID_STATUSES] } } })
      .then((g) => g.length),
    db.patient.count({ where: { ...where, createdAt: { gte: r.from, lt: r.to } } }),
    db.quote.count({ where: { ...where, status: { in: ["DRAFT", "SENT", "FOLLOW_UP"] } } }),
    db.opportunity.count({ where: { ...where, stage: { notIn: ["WON", "LOST"] } } }),
    db.conversation.count({ where: { OR: [{ branchId: { in: branchIds } }, { branchId: null }], lastMessageAt: { gte: r.from, lt: r.to } } }),
  ]);
  return { revenue, orders, attended, newPatients, pendingQuotes, openOpps, emiliaConvs };
}

export async function appointmentsInRange(branchIds: string[], r: Range) {
  return db.appointment.count({ where: { branchId: { in: branchIds }, startsAt: { gte: r.from, lt: r.to }, status: { notIn: ["CANCELLED"] } } });
}

/** Ingresos por mes (zona horaria local), últimos `months` meses. */
export async function monthlyRevenue(branchIds: string[], months = 6) {
  if (branchIds.length === 0) return [];
  const rows = await db.$queryRaw<{ month: string; cents: bigint }[]>`
    SELECT to_char(date_trunc('month', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${TIMEZONE}), 'YYYY-MM') AS month,
           SUM(CASE WHEN kind = 'REFUND' THEN -"amountCents" ELSE "amountCents" END) AS cents
    FROM "Payment"
    WHERE "branchId" IN (${Prisma.join(branchIds)})
      AND status = 'REGISTERED'
      AND "createdAt" >= (date_trunc('month', now() AT TIME ZONE ${TIMEZONE}) - make_interval(months => ${months - 1}::int)) AT TIME ZONE ${TIMEZONE}
    GROUP BY 1 ORDER BY 1`;
  const map = new Map(rows.map((r) => [r.month, Number(r.cents)]));
  const out: { month: string; label: string; cents: number }[] = [];
  const nowLocal = new Date(new Date().toLocaleString("en-US", { timeZone: TIMEZONE }));
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(nowLocal.getFullYear(), nowLocal.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ month: key, label: d.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""), cents: map.get(key) ?? 0 });
  }
  return out;
}

export async function patientsByType(branchIds: string[]) {
  const g = await db.patient.groupBy({ by: ["type"], _count: true, where: { branchId: { in: branchIds }, status: "ACTIVE" } });
  return g.map((x) => ({ key: x.type, value: x._count }));
}

export async function ordersByStatus(branchIds: string[], r: Range) {
  const g = await db.order.groupBy({ by: ["status"], _count: true, where: { branchId: { in: branchIds }, createdAt: { gte: r.from, lt: r.to } } });
  return g.map((x) => ({ key: x.status, value: x._count }));
}

export async function salesByBranch(branchIds: string[], r: Range) {
  const g = await db.payment.groupBy({
    by: ["branchId"],
    _sum: { amountCents: true },
    where: { branchId: { in: branchIds }, status: "REGISTERED", kind: { not: "REFUND" }, createdAt: { gte: r.from, lt: r.to } },
  });
  const branches = await db.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } });
  return branches
    .map((b) => ({ name: b.name.replace("Sucursal ", ""), cents: g.find((x) => x.branchId === b.id)?._sum.amountCents ?? 0 }))
    .sort((a, b) => b.cents - a.cents);
}

export async function topStudies(branchIds: string[], r: Range, take = 6) {
  const g = await db.orderItem.groupBy({
    by: ["studyId", "studyName"],
    _sum: { quantity: true, lineTotalCents: true },
    where: { order: { branchId: { in: branchIds }, createdAt: { gte: r.from, lt: r.to }, status: { not: "CANCELLED" } } },
    orderBy: { _sum: { quantity: "desc" } },
    take,
  });
  return g.map((x) => ({ name: x.studyName, quantity: x._sum.quantity ?? 0, cents: x._sum.lineTotalCents ?? 0 }));
}
