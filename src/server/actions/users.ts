"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError, runAction } from "@/lib/action";
import { requireUser } from "@/lib/auth/guard";
import { getClientIp } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { resetPasswordSchema, rolePermissionsSchema, userCreateSchema, userUpdateSchema } from "@/lib/validation/user";

const PROTECTED_ADMIN_PERMISSIONS = ["users.manage", "settings.manage", "settings.view"];

const publicUser = (u: { id: string; name: string; email: string; active: boolean; roleId: string }) => ({ id: u.id, name: u.name, email: u.email, active: u.active, roleId: u.roleId });

async function assertBranches(ids: string[]) {
  const n = await db.branch.count({ where: { id: { in: ids } } });
  if (n !== new Set(ids).size) throw new BusinessError("Una de las sucursales seleccionadas no existe.");
}

/** Impide dejar el sistema sin administradores activos. */
async function assertKeepsAnAdmin(userId: string, nextRoleKey: string, nextActive: boolean) {
  const target = await db.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!target || target.role.key !== "ADMIN" || !target.active) return;
  if (nextRoleKey === "ADMIN" && nextActive) return;
  const others = await db.user.count({ where: { id: { not: userId }, active: true, role: { key: "ADMIN" } } });
  if (others === 0) throw new BusinessError("Debe quedar al menos un administrador activo.");
}

export async function createUserAction(input: unknown) {
  return runAction(async () => {
    const actor = await requireUser("users.manage");
    const d = userCreateSchema.parse(input);
    await assertBranches(d.branchIds);
    if (await db.user.findUnique({ where: { email: d.email } })) throw new BusinessError("Ya existe un usuario con ese correo.", { email: "Correo en uso." });
    const role = await db.role.findUniqueOrThrow({ where: { key: d.roleKey } });
    const created = await db.user.create({
      data: {
        name: d.name,
        email: d.email,
        roleId: role.id,
        passwordHash: await hashPassword(d.password),
        defaultBranchId: d.branchIds.length === 1 ? d.branchIds[0] : null,
        branches: { create: d.branchIds.map((branchId) => ({ branchId })) },
      },
    });
    await audit({ userId: actor.id, action: "user.create", entity: "User", entityId: created.id, after: { ...publicUser(created), role: d.roleKey, branchIds: d.branchIds }, ip: await getClientIp() });
    revalidatePath("/crm/configuracion");
    return { id: created.id };
  }, "Usuario creado");
}

export async function updateUserAction(userId: string, input: unknown) {
  return runAction(async () => {
    const actor = await requireUser("users.manage");
    const d = userUpdateSchema.parse(input);
    await assertBranches(d.branchIds);
    const before = await db.user.findUnique({ where: { id: userId }, include: { role: true, branches: true } });
    if (!before) throw new BusinessError("El usuario ya no existe.");
    if (userId === actor.id && !d.active) throw new BusinessError("No puedes desactivar tu propia cuenta.");
    if (userId === actor.id && d.roleKey !== before.role.key) throw new BusinessError("No puedes cambiar tu propio rol.");
    await assertKeepsAnAdmin(userId, d.roleKey, d.active);
    const role = await db.role.findUniqueOrThrow({ where: { key: d.roleKey } });

    const after = await db.$transaction(async (tx) => {
      await tx.userBranch.deleteMany({ where: { userId } });
      const u = await tx.user.update({
        where: { id: userId },
        data: {
          name: d.name,
          roleId: role.id,
          active: d.active,
          defaultBranchId: d.branchIds.length === 1 ? d.branchIds[0] : null,
          branches: { create: d.branchIds.map((branchId) => ({ branchId })) },
        },
      });
      // Al desactivar o cambiar de rol/sucursales, se cierran sus sesiones abiertas.
      const accessChanged = !d.active || role.id !== before.roleId || before.branches.map((b) => b.branchId).sort().join() !== [...d.branchIds].sort().join();
      if (accessChanged && userId !== actor.id) await tx.session.deleteMany({ where: { userId } });
      return u;
    });
    await audit({
      userId: actor.id,
      action: d.active ? "user.update" : "user.deactivate",
      entity: "User",
      entityId: userId,
      before: { ...publicUser(before), role: before.role.key, branchIds: before.branches.map((b) => b.branchId) },
      after: { ...publicUser(after), role: d.roleKey, branchIds: d.branchIds },
      ip: await getClientIp(),
    });
    revalidatePath("/crm/configuracion");
    return undefined;
  }, "Usuario actualizado");
}

export async function resetUserPasswordAction(userId: string, input: unknown) {
  return runAction(async () => {
    const actor = await requireUser("users.manage");
    const d = resetPasswordSchema.parse(input);
    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) throw new BusinessError("El usuario ya no existe.");
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(d.password), failedLogins: 0, lockedUntil: null } }),
      db.session.deleteMany({ where: { userId } }),
    ]);
    await audit({ userId: actor.id, action: "user.password_reset", entity: "User", entityId: userId, summary: target.email, ip: await getClientIp() });
    revalidatePath("/crm/configuracion");
    return undefined;
  }, "Contraseña restablecida. Comparte la contraseña temporal por un medio seguro.");
}

export async function saveRolePermissionsAction(input: unknown) {
  return runAction(async () => {
    const actor = await requireUser("users.manage");
    const d = rolePermissionsSchema.parse(input);
    const before = await db.role.findUnique({ where: { key: d.roleKey } });
    if (!before) throw new BusinessError("El rol no existe.");
    const permissions = [...new Set(d.permissions)];
    if (d.roleKey === "ADMIN") {
      const missing = PROTECTED_ADMIN_PERMISSIONS.filter((p) => !permissions.includes(p as (typeof permissions)[number]));
      if (missing.length) throw new BusinessError("El rol Administrador debe conservar la administración de usuarios y configuración.");
    }
    if (actor.roleKey === d.roleKey && !permissions.includes("users.manage")) throw new BusinessError("No puedes quitarte el permiso de administrar usuarios.");
    const after = await db.role.update({ where: { key: d.roleKey }, data: { permissions, maxDiscountBps: d.maxDiscount } });
    await audit({
      userId: actor.id,
      action: "role.update",
      entity: "Role",
      entityId: before.id,
      summary: before.name,
      before: { permissions: before.permissions, maxDiscountBps: before.maxDiscountBps },
      after: { permissions: after.permissions, maxDiscountBps: after.maxDiscountBps },
      ip: await getClientIp(),
    });
    revalidatePath("/crm/configuracion");
    return undefined;
  }, "Permisos del rol guardados");
}
