"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError, runAction } from "@/lib/action";
import { assertBranch, requireUser } from "@/lib/auth/guard";
import { getClientIp, type SessionUser } from "@/lib/auth/session";
import { agreementSchema, PARTNER_STATUSES, partnerSchema } from "@/lib/validation/partner";

async function loadPartner(user: SessionUser, id: string) {
  const partner = await db.partner.findFirst({ where: { id, OR: [{ branchId: { in: user.branchIds } }, { branchId: null }] } });
  if (!partner) throw new BusinessError("El convenio ya no existe o no tienes acceso.");
  return partner;
}

export async function savePartnerAction(id: string | null, formData: FormData) {
  return runAction<{ id: string }>(async () => {
    const user = await requireUser("partners.manage");
    const input = partnerSchema.parse(Object.fromEntries(formData));
    if (input.branchId) assertBranch(user, input.branchId);
    if (input.ownerId && !(await db.user.findFirst({ where: { id: input.ownerId, active: true } }))) throw new BusinessError("El ejecutivo no existe.", { ownerId: "Elige un ejecutivo válido." });
    const data = {
      organization: input.organization,
      contactName: input.contactName,
      phone: input.phone ?? null,
      email: input.email ?? null,
      type: input.type,
      status: input.status,
      ownerId: input.ownerId ?? null,
      branchId: input.branchId ?? null,
      startDate: input.startDate ? new Date(input.startDate) : input.status === "ACTIVE" ? new Date() : null,
      notes: input.notes ?? null,
    };
    if (id) {
      const before = await loadPartner(user, id);
      const after = await db.partner.update({ where: { id }, data: { ...data, startDate: input.startDate ? new Date(input.startDate) : before.startDate ?? data.startDate } });
      await audit({ userId: user.id, action: "partner.update", entity: "Partner", entityId: id, branchId: after.branchId, before, after, ip: await getClientIp() });
      revalidatePath("/convenios");
      revalidatePath(`/convenios/${id}`);
      return { id };
    }
    const created = await db.partner.create({ data });
    await audit({ userId: user.id, action: "partner.create", entity: "Partner", entityId: created.id, branchId: created.branchId, after: created, ip: await getClientIp() });
    revalidatePath("/convenios");
    return { id: created.id };
  });
}

export async function setPartnerStatusAction(id: string, status: string) {
  return runAction(async () => {
    const user = await requireUser("partners.manage");
    if (!PARTNER_STATUSES.includes(status as (typeof PARTNER_STATUSES)[number])) throw new BusinessError("Estado no válido.");
    const before = await loadPartner(user, id);
    if (before.status === status) return undefined;
    const after = await db.partner.update({
      where: { id },
      data: { status: status as (typeof PARTNER_STATUSES)[number], ...(status === "ACTIVE" && !before.startDate ? { startDate: new Date() } : {}) },
    });
    await audit({ userId: user.id, action: "partner.status", entity: "Partner", entityId: id, branchId: after.branchId, before: { status: before.status }, after: { status: after.status }, ip: await getClientIp() });
    revalidatePath(`/convenios/${id}`);
    revalidatePath("/convenios");
    return undefined;
  }, "Estado actualizado");
}

/** Crea o edita un acuerdo. Su descuento se vuelve un descuento autorizado en cotizaciones de pacientes vinculados. */
export async function saveAgreementAction(id: string | null, formData: FormData) {
  return runAction<{ id: string }>(async () => {
    const user = await requireUser("partners.manage");
    const input = agreementSchema.parse(Object.fromEntries(formData));
    const partner = await loadPartner(user, input.partnerId);
    const data = {
      name: input.name,
      discountBps: input.discountBps,
      validFrom: new Date(input.validFrom),
      validTo: input.validTo ? new Date(input.validTo) : null,
      status: input.status,
      terms: input.terms ?? null,
    };
    if (id) {
      const before = await db.agreement.findFirst({ where: { id, partnerId: partner.id } });
      if (!before) throw new BusinessError("El acuerdo ya no existe.");
      const after = await db.agreement.update({ where: { id }, data });
      await audit({ userId: user.id, action: "agreement.update", entity: "Agreement", entityId: id, branchId: partner.branchId, before, after, ip: await getClientIp() });
      revalidatePath(`/convenios/${partner.id}`);
      return { id };
    }
    const created = await db.agreement.create({ data: { ...data, partnerId: partner.id } });
    await audit({ userId: user.id, action: "agreement.create", entity: "Agreement", entityId: created.id, branchId: partner.branchId, after: created, ip: await getClientIp() });
    revalidatePath(`/convenios/${partner.id}`);
    return { id: created.id };
  });
}

export async function cancelAgreementAction(id: string) {
  return runAction(async () => {
    const user = await requireUser("partners.manage");
    const agreement = await db.agreement.findUnique({ where: { id } });
    if (!agreement) throw new BusinessError("El acuerdo ya no existe.");
    const partner = await loadPartner(user, agreement.partnerId);
    if (agreement.status === "CANCELLED") throw new BusinessError("El acuerdo ya está cancelado.");
    await db.agreement.update({ where: { id }, data: { status: "CANCELLED" } });
    await audit({ userId: user.id, action: "agreement.cancel", entity: "Agreement", entityId: id, branchId: partner.branchId, before: { status: agreement.status }, after: { status: "CANCELLED" }, ip: await getClientIp() });
    revalidatePath(`/convenios/${partner.id}`);
    return undefined;
  }, "Acuerdo cancelado");
}
