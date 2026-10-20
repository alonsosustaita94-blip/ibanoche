"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError, runAction } from "@/lib/action";
import { requireUser } from "@/lib/auth/guard";
import { getClientIp } from "@/lib/auth/session";
import { TIMEZONE, zonedDateTime } from "@/lib/dates";
import {
  apiKeySchema,
  branchSchema,
  generalSettingsSchema,
  notificationSettingsSchema,
  paymentSettingsSchema,
  promotionSchema,
  scheduleSchema,
} from "@/lib/validation/settings";

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

async function getSetting<T extends object>(key: string): Promise<Partial<T>> {
  const s = await db.systemSetting.findUnique({ where: { key } });
  return (s?.value ?? {}) as Partial<T>;
}

async function putSetting(key: string, value: object, userId: string) {
  const before = await getSetting(key);
  const merged = { ...before, ...value };
  await db.systemSetting.upsert({ where: { key }, create: { key, value: json(merged), updatedById: userId }, update: { value: json(merged), updatedById: userId } });
  return { before, after: merged };
}

const done = () => revalidatePath("/configuracion");

export async function saveGeneralSettingsAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser("settings.manage");
    const d = generalSettingsSchema.parse(Object.fromEntries(formData));
    const ip = await getClientIp();
    const g = await putSetting("general", { businessName: d.businessName, currency: d.currency, timezone: TIMEZONE }, user.id);
    const q = await putSetting("quotes", { validityDays: d.quoteValidityDays }, user.id);
    const a = await putSetting("appointments", { minAdvanceMinutes: d.minAdvanceMinutes, maxDaysAhead: d.maxDaysAhead }, user.id);
    await audit({
      userId: user.id,
      action: "settings.update",
      entity: "SystemSetting",
      entityId: "general",
      before: { general: g.before, quotes: q.before, appointments: a.before },
      after: { general: g.after, quotes: q.after, appointments: a.after },
      ip,
    });
    done();
    return undefined;
  }, "Configuración guardada");
}

export async function saveBranchAction(branchId: string | null, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser("settings.manage");
    const d = branchSchema.parse(Object.fromEntries(formData));
    const data = { code: d.code, name: d.name, address: d.address ?? null, phone: d.phone ?? null, active: d.active };
    const ip = await getClientIp();
    if (branchId) {
      const before = await db.branch.findUnique({ where: { id: branchId } });
      if (!before) throw new BusinessError("La sucursal ya no existe.");
      if (before.active && !d.active) {
        const open = await db.cashRegisterSession.count({ where: { branchId, status: "OPEN" } });
        if (open) throw new BusinessError("Cierra la caja de la sucursal antes de desactivarla.");
      }
      const after = await db.branch.update({ where: { id: branchId }, data });
      await audit({ userId: user.id, action: "branch.update", entity: "Branch", entityId: branchId, branchId, before, after, ip });
    } else {
      const created = await db.branch.create({
        data: {
          ...data,
          // Horario inicial: lunes a sábado; ajustable en Horarios.
          schedules: {
            create: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: "07:00", closesAt: weekday === 6 ? "13:00" : "15:00", slotMinutes: 30, capacity: 2 })),
          },
        },
      });
      // Los administradores con acceso explícito reciben la nueva sucursal.
      const admins = await db.user.findMany({ where: { role: { key: "ADMIN" }, active: true }, select: { id: true } });
      await db.userBranch.createMany({ data: admins.map((a) => ({ userId: a.id, branchId: created.id })), skipDuplicates: true });
      await audit({ userId: user.id, action: "branch.create", entity: "Branch", entityId: created.id, branchId: created.id, after: created, ip });
    }
    done();
    return undefined;
  }, "Sucursal guardada");
}

export async function saveScheduleAction(input: unknown) {
  return runAction(async () => {
    const user = await requireUser("settings.manage");
    const d = scheduleSchema.parse(input);
    if (new Set(d.rows.map((r) => r.weekday)).size !== 7) throw new BusinessError("El horario debe incluir los 7 días.");
    const branch = await db.branch.findUnique({ where: { id: d.branchId } });
    if (!branch) throw new BusinessError("La sucursal ya no existe.");
    const before = await db.branchSchedule.findMany({ where: { branchId: d.branchId }, orderBy: { weekday: "asc" } });
    await db.$transaction(
      d.rows.map((r) =>
        db.branchSchedule.upsert({
          where: { branchId_weekday: { branchId: d.branchId, weekday: r.weekday } },
          create: { branchId: d.branchId, ...r },
          update: { active: r.active, opensAt: r.opensAt, closesAt: r.closesAt, slotMinutes: r.slotMinutes, capacity: r.capacity, homeService: r.homeService },
        }),
      ),
    );
    const after = await db.branchSchedule.findMany({ where: { branchId: d.branchId }, orderBy: { weekday: "asc" } });
    await audit({ userId: user.id, action: "schedule.update", entity: "BranchSchedule", entityId: d.branchId, branchId: d.branchId, before, after, ip: await getClientIp() });
    done();
    revalidatePath("/agenda");
    return undefined;
  }, "Horario guardado");
}

export async function savePromotionAction(promotionId: string | null, formData: FormData) {
  return runAction(async () => {
    const user = await requireUser("settings.manage");
    const d = promotionSchema.parse(Object.fromEntries(formData));
    const data = {
      name: d.name,
      discountBps: d.discount,
      active: d.active,
      validFrom: d.validFrom ? zonedDateTime(d.validFrom, "00:00") : null,
      validTo: d.validTo ? zonedDateTime(d.validTo, "23:59") : null,
    };
    const ip = await getClientIp();
    if (promotionId) {
      const before = await db.promotion.findUnique({ where: { id: promotionId } });
      if (!before) throw new BusinessError("La promoción ya no existe.");
      const after = await db.promotion.update({ where: { id: promotionId }, data });
      await audit({ userId: user.id, action: "promotion.update", entity: "Promotion", entityId: promotionId, before, after, ip });
    } else {
      const created = await db.promotion.create({ data });
      await audit({ userId: user.id, action: "promotion.create", entity: "Promotion", entityId: created.id, after: created, ip });
    }
    done();
    return undefined;
  }, "Promoción guardada");
}

export async function savePaymentSettingsAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser("settings.manage");
    const d = paymentSettingsSchema.parse(Object.fromEntries(formData));
    const r = await putSetting("payments", { CASH: d.CASH, CARD: d.CARD, TRANSFER: d.TRANSFER, gatewayConfigured: false }, user.id);
    await audit({ userId: user.id, action: "settings.update", entity: "SystemSetting", entityId: "payments", before: r.before, after: r.after, ip: await getClientIp() });
    done();
    return undefined;
  }, "Métodos de pago guardados");
}

export async function saveNotificationSettingsAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser("settings.manage");
    const d = notificationSettingsSchema.parse(Object.fromEntries(formData));
    const r = await putSetting("notifications", d, user.id);
    await audit({ userId: user.id, action: "settings.update", entity: "SystemSetting", entityId: "notifications", before: r.before, after: r.after, ip: await getClientIp() });
    done();
    return undefined;
  }, "Notificaciones guardadas");
}

/** Crea una llave de API. La llave completa se devuelve una sola vez; solo se guarda su hash. */
export async function createApiKeyAction(input: unknown) {
  return runAction(async () => {
    const user = await requireUser("settings.manage");
    const d = apiKeySchema.parse(input);
    if (d.branchId && !(await db.branch.findUnique({ where: { id: d.branchId } }))) throw new BusinessError("La sucursal no existe.");
    const key = `ibn_live_${randomBytes(32).toString("base64url")}`;
    const client = await db.apiClient.create({
      data: { name: d.name, scopes: d.scopes, branchId: d.branchId ?? null, keyPrefix: key.slice(0, 14), keyHash: createHash("sha256").update(key).digest("hex") },
    });
    await audit({
      userId: user.id,
      action: "apikey.create",
      entity: "ApiClient",
      entityId: client.id,
      after: { name: client.name, keyPrefix: client.keyPrefix, scopes: client.scopes, branchId: client.branchId },
      ip: await getClientIp(),
    });
    done();
    return { key, prefix: client.keyPrefix };
  }, "Llave creada");
}

export async function revokeApiKeyAction(id: string) {
  return runAction(async () => {
    const user = await requireUser("settings.manage");
    const before = await db.apiClient.findUnique({ where: { id } });
    if (!before) throw new BusinessError("La llave ya no existe.");
    if (before.revokedAt) throw new BusinessError("La llave ya estaba revocada.");
    await db.apiClient.update({ where: { id }, data: { active: false, revokedAt: new Date() } });
    await audit({ userId: user.id, action: "apikey.revoke", entity: "ApiClient", entityId: id, summary: `${before.name} (${before.keyPrefix}…)`, ip: await getClientIp() });
    done();
    return undefined;
  }, "Llave revocada");
}
