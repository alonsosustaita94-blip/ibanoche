import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BusinessError } from "@/lib/action";
import { nextFolio } from "@/lib/folio";
import { computeTotals, validateDiscount } from "./discounts";
import { currentPublicPrices } from "./pricing";

export type QuoteDraft = {
  patientId?: string | null;
  prospectName?: string | null;
  prospectPhone?: string | null;
  branchId: string;
  items: { studyId: string; quantity: number }[];
  discountBps: number;
  promotionId?: string | null;
  notes?: string | null;
  validityDays?: number;
  source?: Prisma.QuoteCreateInput["source"];
  status?: "DRAFT" | "SENT";
};

export type Actor = { userId: string | null; roleMaxBps: number };

async function quoteValidityDays() {
  const s = await db.systemSetting.findUnique({ where: { key: "quotes" } });
  return Number((s?.value as { validityDays?: number } | null)?.validityDays ?? 15);
}

/** Construye las partidas con el precio vigente (snapshot) y valida el descuento. */
async function buildLines(draft: QuoteDraft, actor: Actor, tx: Prisma.TransactionClient) {
  if (!draft.items.length) throw new BusinessError("Agrega al menos un estudio.");
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
  if (draft.promotionId && !promotion) throw new BusinessError("La promoción seleccionada no existe.");
  let agreementBps = 0;
  if (draft.patientId) {
    const patient = await tx.patient.findUnique({ where: { id: draft.patientId }, include: { partner: { include: { agreements: { where: { status: "ACTIVE" } } } } } });
    if (!patient) throw new BusinessError("El paciente no existe.");
    agreementBps = Math.max(0, ...(patient.partner?.agreements.map((a) => a.discountBps) ?? []));
  }
  const error = validateDiscount(draft.discountBps, { roleMaxBps: actor.roleMaxBps, promotion, agreementBps });
  if (error) throw new BusinessError(error, { discount: error });
  return { lines, totals: computeTotals(lines, draft.discountBps) };
}

export async function createQuote(draft: QuoteDraft, actor: Actor) {
  if (!draft.patientId && !draft.prospectName) throw new BusinessError("Elige un paciente o escribe el nombre del prospecto.");
  const validityDays = draft.validityDays ?? (await quoteValidityDays());
  return db.$transaction(async (tx) => {
    const { lines, totals } = await buildLines(draft, actor, tx);
    const folio = await nextFolio(tx, "COT");
    return tx.quote.create({
      data: {
        folio,
        patientId: draft.patientId ?? null,
        prospectName: draft.patientId ? null : draft.prospectName,
        prospectPhone: draft.patientId ? null : draft.prospectPhone,
        branchId: draft.branchId,
        responsibleId: actor.userId,
        status: draft.status ?? "DRAFT",
        validUntil: new Date(Date.now() + validityDays * 86400000),
        discountBps: draft.discountBps,
        promotionId: draft.promotionId ?? null,
        notes: draft.notes ?? null,
        source: draft.source ?? "WALK_IN",
        ...totals,
        items: { create: lines },
      },
      include: { items: true },
    });
  });
}

/** Edita una cotización en borrador: vuelve a tomar los precios vigentes. */
export async function updateDraftQuote(id: string, draft: QuoteDraft, actor: Actor) {
  return db.$transaction(async (tx) => {
    const current = await tx.quote.findUnique({ where: { id } });
    if (!current) throw new BusinessError("La cotización ya no existe.");
    if (current.status !== "DRAFT") throw new BusinessError("Solo se pueden editar cotizaciones en borrador; los precios de una cotización enviada se conservan.");
    const { lines, totals } = await buildLines(draft, actor, tx);
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    return tx.quote.update({
      where: { id },
      data: {
        patientId: draft.patientId ?? null,
        prospectName: draft.patientId ? null : draft.prospectName,
        prospectPhone: draft.patientId ? null : draft.prospectPhone,
        branchId: draft.branchId,
        discountBps: draft.discountBps,
        promotionId: draft.promotionId ?? null,
        notes: draft.notes ?? null,
        ...totals,
        items: { create: lines },
      },
      include: { items: true },
    });
  });
}

/** Marca como vencidas las cotizaciones abiertas cuya vigencia terminó. */
export async function expireQuotes() {
  return db.quote.updateMany({ where: { status: { in: ["DRAFT", "SENT", "FOLLOW_UP"] }, validUntil: { lt: new Date() } }, data: { status: "EXPIRED" } });
}

/**
 * Convierte una cotización aceptable en orden copiando sus precios (no los
 * vigentes). Idempotente: si ya tiene orden, devuelve esa orden.
 */
export async function convertQuoteToOrder(quoteId: string, userId: string) {
  return db.$transaction(
    async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id: quoteId }, include: { items: true, order: true } });
      if (!quote) throw new BusinessError("La cotización ya no existe.");
      if (quote.order) return { order: quote.order, created: false };
      if (!quote.patientId) throw new BusinessError("Registra al prospecto como paciente antes de convertir la cotización en orden.");
      if (["REJECTED", "EXPIRED"].includes(quote.status)) throw new BusinessError("No se puede convertir una cotización rechazada o vencida.");
      if (quote.validUntil < new Date()) throw new BusinessError("La cotización está vencida. Genera una nueva con los precios vigentes.");
      const folio = await nextFolio(tx, "ORD");
      const order = await tx.order.create({
        data: {
          folio,
          patientId: quote.patientId,
          branchId: quote.branchId,
          quoteId: quote.id,
          status: "CONFIRMED",
          subtotalCents: quote.subtotalCents,
          discountBps: quote.discountBps,
          discountCents: quote.discountCents,
          totalCents: quote.totalCents,
          promotionId: quote.promotionId,
          responsibleId: userId,
          items: {
            create: quote.items.map(({ studyId, studyCode, studyName, unitPriceCents, quantity, lineTotalCents }) => ({ studyId, studyCode, studyName, unitPriceCents, quantity, lineTotalCents })),
          },
          events: { create: { type: "created_from_quote", toStatus: "CONFIRMED", note: `Desde cotización ${quote.folio}`, userId } },
        },
      });
      await tx.quote.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } });
      return { order, created: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
