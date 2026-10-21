"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError, runAction } from "@/lib/action";
import { assertBranch, requireUser } from "@/lib/auth/guard";
import { getClientIp } from "@/lib/auth/session";
import { QUOTE_TRANSITIONS, quoteDraftSchema, quoteStatusSchema } from "@/lib/validation/quote";
import { convertQuoteToOrder, createQuote, updateDraftQuote } from "@/server/services/quotes";

async function loadQuoteForUser(quoteId: string, branchIds: string[]) {
  const quote = await db.quote.findUnique({ where: { id: quoteId } });
  if (!quote || !branchIds.includes(quote.branchId)) throw new BusinessError("La cotización no existe o no pertenece a tus sucursales.");
  return quote;
}

/** Crea (id = null) o edita una cotización en borrador. */
export async function saveQuoteAction(quoteId: string | null, raw: unknown) {
  return runAction(async () => {
    const user = await requireUser("quotes.manage");
    const input = quoteDraftSchema.parse(raw);
    assertBranch(user, input.branchId);
    if (input.patientId) {
      const patient = await db.patient.findUnique({ where: { id: input.patientId } });
      if (!patient) throw new BusinessError("El paciente no existe.");
      assertBranch(user, patient.branchId);
    }
    const actor = { userId: user.id, roleMaxBps: user.maxDiscountBps };
    const draft = {
      patientId: input.patientId || null,
      prospectName: input.prospectName || null,
      prospectPhone: input.prospectPhone || null,
      branchId: input.branchId,
      items: input.items,
      discountBps: input.discountBps,
      promotionId: input.promotionId || null,
      notes: input.notes || null,
    };
    const ip = await getClientIp();

    if (quoteId) {
      const before = await loadQuoteForUser(quoteId, user.branchIds);
      let quote = await updateDraftQuote(quoteId, draft, actor);
      if (input.status === "SENT") quote = await db.quote.update({ where: { id: quoteId }, data: { status: "SENT" }, include: { items: true } });
      await audit({ userId: user.id, action: "quote.update", entity: "Quote", entityId: quote.id, branchId: quote.branchId, summary: quote.folio, before, after: quote, ip });
      revalidatePath("/crm/cotizaciones");
      revalidatePath(`/crm/cotizaciones/${quote.id}`);
      return { id: quote.id, folio: quote.folio };
    }

    const quote = await createQuote({ ...draft, status: input.status, source: "WALK_IN" }, actor);
    await audit({ userId: user.id, action: "quote.create", entity: "Quote", entityId: quote.id, branchId: quote.branchId, summary: quote.folio, after: quote, ip });
    revalidatePath("/crm/cotizaciones");
    return { id: quote.id, folio: quote.folio };
  });
}

export async function setQuoteStatusAction(quoteId: string, to: string) {
  return runAction(async () => {
    const user = await requireUser("quotes.manage");
    const input = quoteStatusSchema.parse({ quoteId, to });
    const quote = await loadQuoteForUser(input.quoteId, user.branchIds);
    if (!QUOTE_TRANSITIONS[quote.status]?.includes(input.to)) throw new BusinessError("Ese cambio de estado no está permitido para la cotización.");
    if (input.to !== "REJECTED" && quote.validUntil < new Date()) throw new BusinessError("La cotización ya venció. Genera una nueva con los precios vigentes.");
    const after = await db.quote.update({ where: { id: quote.id }, data: { status: input.to } });
    await audit({ userId: user.id, action: "quote.status", entity: "Quote", entityId: quote.id, branchId: quote.branchId, summary: `${quote.status} → ${after.status}`, before: { status: quote.status }, after: { status: after.status }, ip: await getClientIp() });
    revalidatePath("/crm/cotizaciones");
    revalidatePath(`/crm/cotizaciones/${quote.id}`);
    return undefined;
  }, "Estado actualizado");
}

/** Convierte en orden (idempotente). Requiere permiso de órdenes y de cotizaciones. */
export async function convertQuoteAction(quoteId: string) {
  return runAction(async () => {
    const user = await requireUser("orders.manage");
    await loadQuoteForUser(quoteId, user.branchIds);
    const { order, created } = await convertQuoteToOrder(quoteId, user.id);
    if (created) {
      await audit({ userId: user.id, action: "order.create_from_quote", entity: "Order", entityId: order.id, branchId: order.branchId, summary: order.folio, after: order, ip: await getClientIp() });
    }
    revalidatePath("/crm/cotizaciones");
    revalidatePath(`/crm/cotizaciones/${quoteId}`);
    revalidatePath("/crm/ordenes");
    return { orderId: order.id, folio: order.folio, created };
  });
}

/** Deja constancia de que se preparó el mensaje de WhatsApp (y opcionalmente marca enviada). */
export async function logQuoteWhatsAppAction(quoteId: string, markSent: boolean) {
  return runAction(async () => {
    const user = await requireUser("quotes.manage");
    const quote = await loadQuoteForUser(quoteId, user.branchIds);
    if (markSent && quote.status === "DRAFT") await db.quote.update({ where: { id: quote.id }, data: { status: "SENT" } });
    if (quote.patientId) {
      await db.patientInteraction.create({ data: { patientId: quote.patientId, type: "WHATSAPP", summary: `Se preparó mensaje de WhatsApp con la cotización ${quote.folio}.`, userId: user.id } });
    }
    await audit({ userId: user.id, action: "quote.whatsapp_prepared", entity: "Quote", entityId: quote.id, branchId: quote.branchId, summary: quote.folio, ip: await getClientIp() });
    revalidatePath(`/crm/cotizaciones/${quote.id}`);
    return undefined;
  });
}

/** Cotizaciones vigentes sin orden de un paciente (para vincularlas a una orden). */
export async function openQuotesForPatientAction(patientId: string) {
  const user = await requireUser("orders.manage");
  const quotes = await db.quote.findMany({
    where: { patientId, branchId: { in: user.branchIds }, status: { in: ["SENT", "FOLLOW_UP", "ACCEPTED", "DRAFT"] }, validUntil: { gte: new Date() }, order: null },
    orderBy: { issuedAt: "desc" },
    take: 10,
  });
  return quotes.map((q) => ({ id: q.id, folio: q.folio, totalCents: q.totalCents, validUntil: q.validUntil.toISOString(), status: q.status }));
}
