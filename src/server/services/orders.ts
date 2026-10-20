import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BusinessError } from "@/lib/action";
import { nextFolio } from "@/lib/folio";
import { computeTotals, validateDiscount } from "./discounts";
import { canTransition } from "./order-rules";
import { currentPublicPrices } from "./pricing";

export type OrderDraft = {
  patientId: string;
  branchId: string;
  items: { studyId: string; quantity: number }[];
  discountBps: number;
  promotionId?: string | null;
  notes?: string | null;
  status?: "DRAFT" | "CONFIRMED";
};

/** Crea una orden directa (sin cotización) con los precios vigentes. */
export async function createOrder(draft: OrderDraft, actor: { userId: string; roleMaxBps: number }) {
  if (!draft.items.length) throw new BusinessError("Agrega al menos un estudio.");
  return db.$transaction(async (tx) => {
    const patient = await tx.patient.findUnique({ where: { id: draft.patientId }, include: { partner: { include: { agreements: { where: { status: "ACTIVE" } } } } } });
    if (!patient) throw new BusinessError("El paciente no existe.");
    const merged = new Map<string, number>();
    for (const it of draft.items) {
      if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 99) throw new BusinessError("La cantidad debe estar entre 1 y 99.");
      merged.set(it.studyId, (merged.get(it.studyId) ?? 0) + it.quantity);
    }
    const prices = await currentPublicPrices([...merged.keys()], tx);
    const lines = [...merged.entries()].map(([studyId, quantity]) => {
      const p = prices.get(studyId);
      if (!p) throw new BusinessError("Uno de los estudios no tiene precio público vigente o está inactivo.");
      return { studyId, studyCode: p.code, studyName: p.name, unitPriceCents: p.amountCents, quantity, lineTotalCents: p.amountCents * quantity };
    });
    const promotion = draft.promotionId ? await tx.promotion.findUnique({ where: { id: draft.promotionId } }) : null;
    const agreementBps = Math.max(0, ...(patient.partner?.agreements.map((a) => a.discountBps) ?? []));
    const err = validateDiscount(draft.discountBps, { roleMaxBps: actor.roleMaxBps, promotion, agreementBps });
    if (err) throw new BusinessError(err, { discount: err });
    const totals = computeTotals(lines, draft.discountBps);
    const status = draft.status ?? "CONFIRMED";
    return tx.order.create({
      data: {
        folio: await nextFolio(tx, "ORD"),
        patientId: draft.patientId,
        branchId: draft.branchId,
        status,
        discountBps: draft.discountBps,
        promotionId: draft.promotionId ?? null,
        notes: draft.notes ?? null,
        responsibleId: actor.userId,
        ...totals,
        items: { create: lines },
        events: { create: { type: "created", toStatus: status, userId: actor.userId } },
      },
    });
  });
}

/** Cambia el estado administrativo validando la transición y deja bitácora. */
export async function changeOrderStatus(orderId: string, to: string, userId: string, note?: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BusinessError("La orden ya no existe.");
    if (!canTransition(order.status, to)) throw new BusinessError("Ese cambio de estado no está permitido para la orden.");
    if (to === "CANCELLED" && order.paidCents > 0) throw new BusinessError("La orden tiene pagos registrados. Anula los pagos antes de cancelarla.");
    if (to === "COMPLETED" && order.paymentStatus !== "PAID" && order.totalCents > 0) throw new BusinessError("La orden debe estar pagada para finalizarla.");
    if (to === "CANCELLED" && !note) throw new BusinessError("Indica el motivo de la cancelación.", { note: "Indica el motivo." });
    const updated = await tx.order.update({ where: { id: orderId }, data: { status: to as Prisma.OrderUpdateInput["status"] } });
    await tx.orderEvent.create({ data: { orderId, type: "status_change", fromStatus: order.status, toStatus: updated.status, note, userId } });
    if (to === "COMPLETED") await tx.patient.update({ where: { id: order.patientId }, data: { lastVisitAt: new Date() } });
    return { before: order, after: updated };
  });
}

export async function addOrderNote(orderId: string, note: string, userId: string) {
  return db.orderEvent.create({ data: { orderId, type: "note", note, userId } });
}
