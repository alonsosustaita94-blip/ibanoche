import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";
import type { Permission } from "./permissions";

export class AuthError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHENTICATED" | "FORBIDDEN" | "BRANCH_FORBIDDEN",
  ) {
    super(message);
  }
}

/** Para páginas: redirige al inicio de sesión o muestra "sin acceso". */
export async function requirePage(permission?: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/crm/login");
  if (permission && !user.permissions.includes(permission)) redirect("/crm/sin-acceso");
  return user;
}

/** Para acciones de servidor y API: lanza AuthError. */
export async function requireUser(permission?: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Tu sesión expiró. Vuelve a iniciar sesión.", "UNAUTHENTICATED");
  if (permission && !user.permissions.includes(permission))
    throw new AuthError("No tienes permiso para realizar esta acción.", "FORBIDDEN");
  return user;
}

export function can(user: SessionUser, permission: Permission) {
  return user.permissions.includes(permission);
}

/** Sucursales visibles en consultas: la activa o todas las permitidas. */
export function scopeBranchIds(user: SessionUser): string[] {
  return user.activeBranchId ? [user.activeBranchId] : user.branchIds;
}

/** Filtro Prisma por sucursal. */
export function branchWhere(user: SessionUser) {
  return { branchId: { in: scopeBranchIds(user) } };
}

export function assertBranch(user: SessionUser, branchId: string) {
  if (!user.branchIds.includes(branchId))
    throw new AuthError("No tienes acceso a esa sucursal.", "BRANCH_FORBIDDEN");
}

/** Sucursales para un filtro opcional de la página (?branch=), limitado a las permitidas. */
export function resolveBranchFilter(user: SessionUser, branchParam?: string): string[] {
  if (branchParam && user.branchIds.includes(branchParam)) return [branchParam];
  return scopeBranchIds(user);
}
