import "server-only";
import { db, type Tx } from "@/lib/db";

/** Precio público vigente (centavos) por estudio. Solo estudios activos. */
export async function currentPublicPrices(studyIds: string[], tx: Tx | typeof db = db) {
  const rows = await tx.studyPrice.findMany({
    where: { studyId: { in: studyIds }, kind: "PUBLIC", validTo: null, study: { active: true } },
    include: { study: { select: { id: true, code: true, name: true } } },
  });
  return new Map(rows.map((r) => [r.studyId, { amountCents: r.amountCents, code: r.study.code, name: r.study.name }]));
}

/**
 * Registra una nueva tarifa: cierra la vigente y crea la nueva en una sola
 * transacción (el índice parcial impide dos tarifas vigentes).
 */
export async function setPrice(studyId: string, kind: "PUBLIC" | "INTERNAL_COST", amountCents: number, userId: string, reason?: string) {
  return db.$transaction(async (tx) => {
    const now = new Date();
    const current = await tx.studyPrice.findFirst({ where: { studyId, kind, validTo: null } });
    if (current && current.amountCents === amountCents) return { before: current, after: current, changed: false };
    if (current) await tx.studyPrice.update({ where: { id: current.id }, data: { validTo: now } });
    const after = await tx.studyPrice.create({ data: { studyId, kind, amountCents, validFrom: now, createdById: userId, reason } });
    return { before: current, after, changed: true };
  });
}
