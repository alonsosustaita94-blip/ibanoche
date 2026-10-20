"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError, runAction } from "@/lib/action";
import { assertBranch, requireUser } from "@/lib/auth/guard";
import { getClientIp } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/utils";
import { zonedDateTime } from "@/lib/dates";
import { moveSchema, opportunitySchema } from "@/lib/validation/opportunity";
import { canMoveOpportunity } from "@/server/services/order-rules";

const CLOSED = ["WON", "LOST"];

/** Crea o actualiza una oportunidad comercial. */
export async function saveOpportunityAction(id: string | null, formData: FormData) {
  return runAction<{ id: string }>(async () => {
    const user = await requireUser("opportunities.manage");
    const input = opportunitySchema.parse(Object.fromEntries(formData));
    assertBranch(user, input.branchId);
    if (input.ownerId && !(await db.user.findFirst({ where: { id: input.ownerId, active: true } }))) throw new BusinessError("El responsable no existe.", { ownerId: "Elige un responsable válido." });
    if (input.partnerId && !(await db.partner.findUnique({ where: { id: input.partnerId } }))) throw new BusinessError("El convenio no existe.");
    if (input.patientId && !(await db.patient.findFirst({ where: { id: input.patientId, branchId: { in: user.branchIds } } }))) throw new BusinessError("El paciente no existe o no tienes acceso.");

    const data = {
      title: input.title,
      prospectName: input.prospectName,
      prospectPhone: normalizePhone(input.prospectPhone),
      clientType: input.clientType,
      estimatedCents: input.estimatedCents,
      ownerId: input.ownerId ?? null,
      branchId: input.branchId,
      // datetime-local llega en hora local del laboratorio.
      nextFollowUpAt: input.nextFollowUpAt ? zonedDateTime(input.nextFollowUpAt.slice(0, 10), input.nextFollowUpAt.slice(11, 16)) : null,
      notes: input.notes ?? null,
      partnerId: input.partnerId ?? null,
      patientId: input.patientId ?? null,
    };

    if (id) {
      const before = await db.opportunity.findFirst({ where: { id, branchId: { in: user.branchIds } } });
      if (!before) throw new BusinessError("La oportunidad ya no existe o no tienes acceso.");
      const after = await db.opportunity.update({ where: { id }, data });
      await audit({ userId: user.id, action: "opportunity.update", entity: "Opportunity", entityId: id, branchId: after.branchId, before, after, ip: await getClientIp() });
      revalidatePath("/oportunidades");
      return { id };
    }

    const stage = input.stage && !CLOSED.includes(input.stage) ? input.stage : "PROSPECT";
    const last = await db.opportunity.aggregate({ _max: { position: true }, where: { stage } });
    const created = await db.opportunity.create({ data: { ...data, stage, position: (last._max.position ?? -1) + 1, source: "OTHER" } });
    await audit({ userId: user.id, action: "opportunity.create", entity: "Opportunity", entityId: created.id, branchId: created.branchId, after: created, ip: await getClientIp() });
    revalidatePath("/oportunidades");
    return { id: created.id };
  });
}

/** Mueve una oportunidad de etapa respetando las reglas del embudo. */
export async function moveOpportunityAction(raw: { id: string; stage: string; position?: number; lostReason?: string }) {
  return runAction(async () => {
    const user = await requireUser("opportunities.manage");
    const input = moveSchema.parse(raw);
    const before = await db.opportunity.findFirst({ where: { id: input.id, branchId: { in: user.branchIds } } });
    if (!before) throw new BusinessError("La oportunidad ya no existe o no tienes acceso.");
    if (!canMoveOpportunity(before.stage, input.stage)) {
      throw new BusinessError(
        CLOSED.includes(before.stage) ? "Una oportunidad cerrada solo puede reabrirse a En seguimiento." : "Ese cambio de etapa no está permitido.",
      );
    }
    if (input.stage === "LOST" && before.stage !== "LOST" && !input.lostReason) throw new BusinessError("Indica el motivo por el que se perdió la oportunidad.", { lostReason: "Requerido." });

    const stageChanged = before.stage !== input.stage;
    const position = input.position ?? ((await db.opportunity.aggregate({ _max: { position: true }, where: { stage: input.stage } }))._max.position ?? -1) + 1;
    const closing = CLOSED.includes(input.stage);
    const after = await db.opportunity.update({
      where: { id: before.id },
      data: {
        stage: input.stage,
        position,
        ...(stageChanged
          ? {
              stageChangedAt: new Date(),
              closedAt: closing ? new Date() : null,
              lostReason: input.stage === "LOST" ? input.lostReason : null,
            }
          : {}),
      },
    });
    if (stageChanged) {
      await audit({ userId: user.id, action: "opportunity.move", entity: "Opportunity", entityId: before.id, branchId: before.branchId, before: { stage: before.stage }, after: { stage: after.stage, lostReason: after.lostReason }, ip: await getClientIp() });
    }
    revalidatePath("/oportunidades");
    return undefined;
  }, "Oportunidad actualizada");
}
