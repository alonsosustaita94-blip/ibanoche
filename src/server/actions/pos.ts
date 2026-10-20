"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError, runAction } from "@/lib/action";
import { assertBranch, requireUser } from "@/lib/auth/guard";
import { getClientIp } from "@/lib/auth/session";
import { chargeSchema, closeCashSchema, openCashSchema, posSaleSchema } from "@/lib/validation/pos";
import { createOrder } from "@/server/services/orders";
import { closeCashSession, openCashSession, registerPayment } from "@/server/services/payments";

export async function openCashAction(branchId: string, openingCents: number) {
  return runAction(async () => {
    const user = await requireUser("pos.cashSession");
    const input = openCashSchema.parse({ branchId, openingCents });
    assertBranch(user, input.branchId);
    const session = await openCashSession(input.branchId, input.openingCents, user.id);
    await audit({ userId: user.id, action: "cash.open", entity: "CashRegisterSession", entityId: session.id, branchId: session.branchId, after: session, ip: await getClientIp() });
    revalidatePath("/caja");
    return undefined;
  }, "Caja abierta");
}

export async function closeCashAction(sessionId: string, countedCashCents: number, notes?: string) {
  return runAction(async () => {
    const user = await requireUser("pos.cashSession");
    const input = closeCashSchema.parse({ sessionId, countedCashCents, notes });
    const session = await db.cashRegisterSession.findUnique({ where: { id: input.sessionId } });
    if (!session) throw new BusinessError("La caja no existe.");
    assertBranch(user, session.branchId);
    const { closed } = await closeCashSession(input.sessionId, input.countedCashCents, user.id, input.notes ?? undefined);
    await audit({ userId: user.id, action: "cash.close", entity: "CashRegisterSession", entityId: closed.id, branchId: closed.branchId, summary: `Diferencia ${closed.differenceCents}`, after: closed, ip: await getClientIp() });
    revalidatePath("/caja");
    return { differenceCents: closed.differenceCents ?? 0 };
  }, "Corte de caja registrado");
}

/** Cobra el saldo (o un anticipo) de una orden existente. */
export async function chargeOrderAction(raw: unknown) {
  return runAction(async () => {
    const user = await requireUser("pos.charge");
    const input = chargeSchema.parse(raw);
    const result = await registerPayment({ orderId: input.orderId, parts: input.parts, idempotencyKey: input.idempotencyKey, userId: user.id, allowedBranchIds: user.branchIds });
    if (!result.duplicate) {
      await audit({ userId: user.id, action: "payment.register", entity: "Payment", entityId: result.groupId, branchId: result.payments[0]?.branchId, summary: result.payments.map((p) => p.folio).join(", "), after: result.payments, ip: await getClientIp() });
    }
    revalidatePath("/caja");
    revalidatePath(`/ordenes/${input.orderId}`);
    return { groupId: result.groupId, duplicate: result.duplicate };
  });
}

type SaleReservation = { pending?: boolean; orderId?: string };

/**
 * Venta de mostrador: crea la orden y registra el cobro.
 * La llave de idempotencia reserva la venta para que un reintento o doble
 * clic no cree una segunda orden ni un segundo cobro.
 */
export async function posSaleAction(raw: unknown) {
  return runAction(async () => {
    const user = await requireUser("pos.charge");
    if (!user.permissions.includes("orders.manage")) throw new BusinessError("Tu rol no puede crear órdenes.");
    const input = posSaleSchema.parse(raw);
    assertBranch(user, input.branchId);
    const ip = await getClientIp();

    const already = await db.payment.findFirst({ where: { idempotencyKey: input.idempotencyKey } });
    if (already) return { groupId: already.groupId, orderId: already.orderId, duplicate: true };

    const reservationKey = `pos-sale:${input.idempotencyKey}`;
    let orderId: string | undefined;
    const existing = await db.idempotencyRecord.findUnique({ where: { key: reservationKey } });
    if (existing) {
      const r = existing.response as SaleReservation;
      if (r.pending) throw new BusinessError("La venta se está procesando. Espera un momento.");
      orderId = r.orderId;
    } else {
      const session = await db.cashRegisterSession.findFirst({ where: { branchId: input.branchId, status: "OPEN" } });
      if (!session) throw new BusinessError("Abre la caja de la sucursal antes de registrar cobros.");
      try {
        await db.idempotencyRecord.create({ data: { key: reservationKey, scope: "pos.sale", response: { pending: true } } });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new BusinessError("La venta se está procesando. Espera un momento.");
        throw err;
      }
      try {
        const patient = await db.patient.findUnique({ where: { id: input.patientId } });
        if (!patient) throw new BusinessError("El paciente no existe.");
        assertBranch(user, patient.branchId);
        const order = await createOrder(
          { patientId: input.patientId, branchId: input.branchId, items: input.items, discountBps: input.discountBps, promotionId: input.promotionId || null, status: "CONFIRMED", notes: "Venta en caja" },
          { userId: user.id, roleMaxBps: user.maxDiscountBps },
        );
        orderId = order.id;
        await db.idempotencyRecord.update({ where: { key: reservationKey }, data: { response: { orderId } } });
        await audit({ userId: user.id, action: "order.create_pos", entity: "Order", entityId: order.id, branchId: order.branchId, summary: order.folio, after: order, ip });
      } catch (err) {
        await db.idempotencyRecord.delete({ where: { key: reservationKey } }).catch(() => {});
        throw err;
      }
    }

    const result = await registerPayment({ orderId: orderId!, parts: input.parts, idempotencyKey: input.idempotencyKey, userId: user.id, allowedBranchIds: user.branchIds });
    if (!result.duplicate) {
      await audit({ userId: user.id, action: "payment.register", entity: "Payment", entityId: result.groupId, branchId: input.branchId, summary: result.payments.map((p) => p.folio).join(", "), after: result.payments, ip });
    }
    revalidatePath("/caja");
    revalidatePath("/ordenes");
    return { groupId: result.groupId, orderId: orderId!, duplicate: result.duplicate };
  });
}
