"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError, runAction } from "@/lib/action";
import { assertBranch, requireUser } from "@/lib/auth/guard";
import { getClientIp } from "@/lib/auth/session";
import { invoiceRequestSchema, orderDraftSchema, orderNoteSchema, orderStatusSchema } from "@/lib/validation/order";
import { voidPaymentSchema } from "@/lib/validation/pos";
import { addOrderNote, changeOrderStatus, createOrder } from "@/server/services/orders";
import { voidPayment } from "@/server/services/payments";

async function loadOrderForUser(orderId: string, branchIds: string[]) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || !branchIds.includes(order.branchId)) throw new BusinessError("La orden no existe o no pertenece a tus sucursales.");
  return order;
}

export async function createOrderAction(raw: unknown) {
  return runAction(async () => {
    const user = await requireUser("orders.manage");
    const input = orderDraftSchema.parse(raw);
    assertBranch(user, input.branchId);
    const patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new BusinessError("El paciente no existe.");
    assertBranch(user, patient.branchId);
    const order = await createOrder(
      { patientId: input.patientId, branchId: input.branchId, items: input.items, discountBps: input.discountBps, promotionId: input.promotionId || null, notes: input.notes || null, status: "CONFIRMED" },
      { userId: user.id, roleMaxBps: user.maxDiscountBps },
    );
    await audit({ userId: user.id, action: "order.create", entity: "Order", entityId: order.id, branchId: order.branchId, summary: order.folio, after: order, ip: await getClientIp() });
    revalidatePath("/crm/ordenes");
    return { id: order.id, folio: order.folio };
  });
}

export async function changeOrderStatusAction(orderId: string, to: string, note?: string) {
  return runAction(async () => {
    const user = await requireUser("orders.manage");
    const input = orderStatusSchema.parse({ orderId, to, note });
    await loadOrderForUser(input.orderId, user.branchIds);
    const { before, after } = await changeOrderStatus(input.orderId, input.to, user.id, input.note);
    await audit({ userId: user.id, action: "order.status", entity: "Order", entityId: after.id, branchId: after.branchId, summary: `${before.status} → ${after.status}${input.note ? `: ${input.note}` : ""}`, before: { status: before.status }, after: { status: after.status }, ip: await getClientIp() });
    revalidatePath("/crm/ordenes");
    revalidatePath(`/crm/ordenes/${after.id}`);
    return undefined;
  }, "Estado de la orden actualizado");
}

export async function addOrderNoteAction(orderId: string, note: string) {
  return runAction(async () => {
    const user = await requireUser("orders.manage");
    const input = orderNoteSchema.parse({ orderId, note });
    const order = await loadOrderForUser(input.orderId, user.branchIds);
    await addOrderNote(order.id, input.note, user.id);
    await audit({ userId: user.id, action: "order.note", entity: "Order", entityId: order.id, branchId: order.branchId, summary: input.note.slice(0, 120) });
    revalidatePath(`/crm/ordenes/${order.id}`);
    return undefined;
  }, "Nota agregada");
}

export async function requestInvoiceAction(raw: unknown) {
  return runAction(async () => {
    const user = await requireUser("orders.manage");
    const input = invoiceRequestSchema.parse(raw);
    const order = await loadOrderForUser(input.orderId, user.branchIds);
    if (order.status === "CANCELLED") throw new BusinessError("No se puede solicitar factura de una orden cancelada.");
    if (order.paidCents <= 0) throw new BusinessError("Registra el pago antes de solicitar la factura.");
    const existing = await db.invoiceRequest.findUnique({ where: { orderId: order.id } });
    if (existing) throw new BusinessError("Esta orden ya tiene una solicitud de factura.");
    const req = await db.invoiceRequest.create({ data: { ...input, orderId: order.id } });
    await db.orderEvent.create({ data: { orderId: order.id, type: "invoice_requested", note: `Solicitud de factura para RFC ${input.rfc}`, userId: user.id } });
    await audit({ userId: user.id, action: "invoice.request", entity: "InvoiceRequest", entityId: req.id, branchId: order.branchId, summary: order.folio, after: req, ip: await getClientIp() });
    revalidatePath(`/crm/ordenes/${order.id}`);
    return undefined;
  }, "Solicitud de factura registrada");
}

export async function voidPaymentAction(paymentId: string, reason: string) {
  return runAction(async () => {
    const user = await requireUser("pos.void");
    const input = voidPaymentSchema.parse({ paymentId, reason });
    const payment = await db.payment.findUnique({ where: { id: input.paymentId } });
    if (!payment) throw new BusinessError("El cobro no existe.");
    assertBranch(user, payment.branchId);
    const voided = await voidPayment(payment.id, user.id, input.reason);
    await audit({ userId: user.id, action: "payment.void", entity: "Payment", entityId: voided.id, branchId: voided.branchId, summary: `${voided.folio}: ${input.reason}`, before: { status: "REGISTERED" }, after: { status: "VOIDED" }, ip: await getClientIp() });
    revalidatePath(`/crm/ordenes/${payment.orderId}`);
    revalidatePath("/crm/caja");
    return undefined;
  }, "Cobro anulado");
}
