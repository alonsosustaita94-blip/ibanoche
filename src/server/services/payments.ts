import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BusinessError } from "@/lib/action";
import { nextFolio } from "@/lib/folio";
import { paymentStatusFor } from "./order-rules";

export type PaymentPart = { method: "CASH" | "CARD" | "TRANSFER"; amountCents: number; reference?: string | null };

/**
 * Registra un cobro (simple o mixto) de forma atómica e idempotente:
 * - La misma `idempotencyKey` nunca crea dos cobros (doble clic, reintento).
 * - Bloquea la orden (FOR UPDATE) para evitar sobrepagos concurrentes.
 * - Requiere una caja abierta en la sucursal.
 * No hay pasarela de pago: se registra lo cobrado en terminal o efectivo.
 */
export async function registerPayment(input: { orderId: string; parts: PaymentPart[]; idempotencyKey: string; userId: string; allowedBranchIds: string[] }) {
  const parts = input.parts.filter((p) => p.amountCents > 0);
  if (!parts.length) throw new BusinessError("Escribe el importe a cobrar.");
  if (new Set(parts.map((p) => p.method)).size !== parts.length) throw new BusinessError("Usa cada método de pago una sola vez.");
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(input.idempotencyKey)) throw new BusinessError("Solicitud de cobro no válida. Recarga la página.");

  const existing = await db.payment.findMany({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing.length) return { groupId: existing[0].groupId, payments: existing, duplicate: true };

  try {
    return await db.$transaction(
      async (tx) => {
        const [order] = await tx.$queryRaw<{ id: string; branchId: string; totalCents: number; paidCents: number; status: string }[]>`
          SELECT id, "branchId", "totalCents", "paidCents", status::text FROM "Order" WHERE id = ${input.orderId} FOR UPDATE`;
        if (!order) throw new BusinessError("La orden ya no existe.");
        if (!input.allowedBranchIds.includes(order.branchId)) throw new BusinessError("No tienes acceso a la sucursal de esta orden.");
        if (["CANCELLED", "DRAFT"].includes(order.status)) throw new BusinessError(order.status === "DRAFT" ? "Confirma la orden antes de cobrarla." : "La orden está cancelada.");

        const balance = order.totalCents - order.paidCents;
        const amount = parts.reduce((a, p) => a + p.amountCents, 0);
        if (balance <= 0) throw new BusinessError("La orden ya está pagada.");
        if (amount > balance) throw new BusinessError(`El importe supera el saldo pendiente de la orden.`);

        const session = await tx.cashRegisterSession.findFirst({ where: { branchId: order.branchId, status: "OPEN" } });
        if (!session) throw new BusinessError("Abre la caja de la sucursal antes de registrar cobros.");

        const groupId = `grp_${input.idempotencyKey.slice(0, 40)}`;
        const kind = amount < balance ? "ADVANCE" : "PAYMENT";
        const payments = [];
        for (const part of parts) {
          payments.push(
            await tx.payment.create({
              data: {
                folio: await nextFolio(tx, "REC"),
                groupId,
                orderId: order.id,
                branchId: order.branchId,
                cashSessionId: session.id,
                method: part.method,
                kind,
                amountCents: part.amountCents,
                reference: part.reference ?? null,
                idempotencyKey: input.idempotencyKey,
                receivedById: input.userId,
              },
            }),
          );
        }
        const paidCents = order.paidCents + amount;
        const paymentStatus = paymentStatusFor(order.totalCents, paidCents);
        const nextStatus = paymentStatus === "PAID" && order.status === "CONFIRMED" ? "PAID" : undefined;
        await tx.order.update({ where: { id: order.id }, data: { paidCents, paymentStatus, ...(nextStatus ? { status: nextStatus } : {}) } });
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            type: kind === "ADVANCE" ? "advance" : "payment",
            fromStatus: nextStatus ? (order.status as Prisma.OrderEventCreateInput["fromStatus"]) : undefined,
            toStatus: nextStatus,
            note: `Cobro registrado (${payments.map((p) => p.folio).join(", ")})`,
            userId: input.userId,
          },
        });
        return { groupId, payments, duplicate: false, orderBranchId: order.branchId };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  } catch (err) {
    // Carrera con el mismo idempotencyKey: devolver lo ya registrado.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await db.payment.findMany({ where: { idempotencyKey: input.idempotencyKey } });
      if (again.length) return { groupId: again[0].groupId, payments: again, duplicate: true };
    }
    throw err;
  }
}

/** Anula un cobro (sin borrarlo) y recalcula el saldo de la orden. */
export async function voidPayment(paymentId: string, userId: string, reason: string) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { cashSession: true } });
    if (!payment) throw new BusinessError("El cobro no existe.");
    if (payment.status === "VOIDED") throw new BusinessError("El cobro ya estaba anulado.");
    if (payment.cashSession?.status === "CLOSED") throw new BusinessError("No se puede anular un cobro de una caja ya cerrada.");
    const [order] = await tx.$queryRaw<{ id: string; totalCents: number; paidCents: number; status: string }[]>`
      SELECT id, "totalCents", "paidCents", status::text FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE`;
    if (order.status === "COMPLETED") throw new BusinessError("La orden ya está finalizada; registra una devolución autorizada.");
    await tx.payment.update({ where: { id: paymentId }, data: { status: "VOIDED" } });
    const paidCents = Math.max(0, order.paidCents - payment.amountCents);
    const paymentStatus = paymentStatusFor(order.totalCents, paidCents);
    await tx.order.update({
      where: { id: order.id },
      data: { paidCents, paymentStatus, ...(order.status === "PAID" && paymentStatus !== "PAID" ? { status: "CONFIRMED" } : {}) },
    });
    await tx.orderEvent.create({ data: { orderId: order.id, type: "payment_voided", note: `${payment.folio} anulado: ${reason}`, userId } });
    return payment;
  });
}

export async function openCashSession(branchId: string, openingCents: number, userId: string) {
  if (!Number.isInteger(openingCents) || openingCents < 0) throw new BusinessError("Escribe un fondo inicial válido.");
  try {
    return await db.cashRegisterSession.create({ data: { branchId, openingCents, openedById: userId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new BusinessError("Ya hay una caja abierta en esta sucursal.");
    throw err;
  }
}

/** Resumen de una caja: totales por método y efectivo esperado. */
export async function cashSessionSummary(sessionId: string) {
  const session = await db.cashRegisterSession.findUniqueOrThrow({ where: { id: sessionId } });
  const rows = await db.payment.groupBy({
    by: ["method", "kind"],
    _sum: { amountCents: true },
    _count: true,
    where: { cashSessionId: sessionId, status: "REGISTERED" },
  });
  const byMethod = { CASH: 0, CARD: 0, TRANSFER: 0 } as Record<"CASH" | "CARD" | "TRANSFER", number>;
  let count = 0;
  for (const r of rows) {
    const sign = r.kind === "REFUND" ? -1 : 1;
    byMethod[r.method] += sign * (r._sum.amountCents ?? 0);
    count += r._count;
  }
  return { session, byMethod, count, expectedCashCents: session.openingCents + byMethod.CASH, totalCents: byMethod.CASH + byMethod.CARD + byMethod.TRANSFER };
}

/** Corte de caja: registra el efectivo contado y la diferencia. */
export async function closeCashSession(sessionId: string, countedCashCents: number, userId: string, notes?: string) {
  if (!Number.isInteger(countedCashCents) || countedCashCents < 0) throw new BusinessError("Escribe el efectivo contado.");
  const summary = await cashSessionSummary(sessionId);
  if (summary.session.status === "CLOSED") throw new BusinessError("La caja ya está cerrada.");
  const closed = await db.cashRegisterSession.update({
    where: { id: sessionId, status: "OPEN" },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closedById: userId,
      expectedCashCents: summary.expectedCashCents,
      countedCashCents,
      differenceCents: countedCashCents - summary.expectedCashCents,
      notes: notes ?? null,
    },
  });
  return { closed, summary };
}
