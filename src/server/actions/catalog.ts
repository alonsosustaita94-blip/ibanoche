"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError, runAction } from "@/lib/action";
import { can, requireUser } from "@/lib/auth/guard";
import { getClientIp } from "@/lib/auth/session";
import { studySearchText } from "@/lib/utils";
import { optionalMoney, priceSchema, studySchema } from "@/lib/validation/catalog";
import { setPrice } from "@/server/services/pricing";

export async function saveStudyAction(studyId: string | null, formData: FormData) {
  return runAction<{ id: string }>(async () => {
    const user = await requireUser("catalog.manage");
    const d = studySchema.parse(Object.fromEntries(formData));
    const category = await db.studyCategory.findUnique({ where: { id: d.categoryId } });
    if (!category) throw new BusinessError("La categoría no existe.", { categoryId: "Elige una categoría." });
    const dup = await db.study.findFirst({ where: { code: d.code, ...(studyId ? { id: { not: studyId } } : {}) } });
    if (dup) throw new BusinessError("Ya existe un estudio con ese código.", { code: "Código en uso." });

    const data = {
      code: d.code,
      name: d.name,
      synonyms: d.synonyms,
      searchText: studySearchText({ code: d.code, name: d.name, synonyms: d.synonyms }),
      categoryId: d.categoryId,
      sampleType: d.sampleType ?? null,
      sampleTypeValidated: Boolean(d.sampleType) && d.sampleTypeValidated,
      instructions: d.instructions ?? null,
      instructionsApproved: Boolean(d.instructions) && d.instructionsApproved,
      turnaround: d.turnaround ?? null,
      turnaroundConfirmed: Boolean(d.turnaround) && d.turnaroundConfirmed,
      active: d.active,
    };
    const ip = await getClientIp();

    if (studyId) {
      const before = await db.study.findUnique({ where: { id: studyId } });
      if (!before) throw new BusinessError("El estudio ya no existe.");
      const after = await db.study.update({ where: { id: studyId }, data });
      await audit({ userId: user.id, action: "study.update", entity: "Study", entityId: after.id, before, after, ip });
      revalidatePath("/crm/catalogo");
      return { id: after.id };
    }

    const publicCents = optionalMoney.parse(d.publicPrice);
    if (publicCents === undefined) throw new BusinessError("Escribe el precio público.", { publicPrice: "Requerido." });
    const costCents = can(user, "catalog.viewCost") ? optionalMoney.parse(d.internalCost) : undefined;
    const created = await db.study.create({ data });
    await setPrice(created.id, "PUBLIC", publicCents, user.id, "Precio inicial");
    if (costCents !== undefined) await setPrice(created.id, "INTERNAL_COST", costCents, user.id, "Costo inicial");
    await audit({ userId: user.id, action: "study.create", entity: "Study", entityId: created.id, after: { ...created, publicPriceCents: publicCents }, ip });
    revalidatePath("/crm/catalogo");
    return { id: created.id };
  });
}

export async function toggleStudyActiveAction(studyId: string) {
  return runAction(async () => {
    const user = await requireUser("catalog.manage");
    const before = await db.study.findUnique({ where: { id: studyId } });
    if (!before) throw new BusinessError("El estudio ya no existe.");
    const after = await db.study.update({ where: { id: studyId }, data: { active: !before.active } });
    await audit({ userId: user.id, action: after.active ? "study.activate" : "study.deactivate", entity: "Study", entityId: studyId, before: { active: before.active }, after: { active: after.active }, ip: await getClientIp() });
    revalidatePath("/crm/catalogo");
    return undefined;
  }, "Estado del estudio actualizado");
}

export type PriceVersion = { id: string; kind: "PUBLIC" | "INTERNAL_COST"; amountCents: number; validFrom: string; validTo: string | null; reason: string | null; createdBy: string | null };

/** Historial de tarifas. El costo interno solo se devuelve con catalog.viewCost. */
export async function priceHistoryAction(studyId: string) {
  return runAction<PriceVersion[]>(async () => {
    const user = await requireUser("catalog.view");
    const rows = await db.studyPrice.findMany({
      where: { studyId, ...(can(user, "catalog.viewCost") ? {} : { kind: "PUBLIC" }) },
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ kind: "asc" }, { validFrom: "desc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      amountCents: r.amountCents,
      validFrom: r.validFrom.toISOString(),
      validTo: r.validTo?.toISOString() ?? null,
      reason: r.reason,
      createdBy: r.createdBy?.name ?? null,
    }));
  });
}

export async function setPriceAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser("prices.manage");
    const d = priceSchema.parse(Object.fromEntries(formData));
    if (d.kind === "INTERNAL_COST" && !can(user, "catalog.viewCost")) throw new BusinessError("No tienes permiso para modificar costos internos.");
    const study = await db.study.findUnique({ where: { id: d.studyId } });
    if (!study) throw new BusinessError("El estudio ya no existe.");
    const { before, after, changed } = await setPrice(d.studyId, d.kind, d.amount, user.id, d.reason);
    if (!changed) throw new BusinessError("El importe es igual a la tarifa vigente.", { amount: "Sin cambios." });
    await audit({
      userId: user.id,
      action: d.kind === "PUBLIC" ? "price.public.update" : "price.cost.update",
      entity: "Study",
      entityId: d.studyId,
      summary: `${study.code}: ${d.reason}`,
      before: before ? { amountCents: before.amountCents } : null,
      after: { amountCents: after.amountCents },
      ip: await getClientIp(),
    });
    revalidatePath("/crm/catalogo");
    return undefined;
  }, "Tarifa actualizada");
}
