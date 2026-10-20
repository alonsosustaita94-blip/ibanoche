"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createSession, destroySession, getClientIp, getSessionUser } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
// Hash ficticio para igualar el tiempo de respuesta cuando el usuario no existe.
const DUMMY_HASH = "$2b$12$psBFJD3uLWilqYHCZ.Kh0.j8QlyZXpazd3l6EooinQ9SmnMpuGUua";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
  next: z.string().optional(),
});

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password, next } = parsed.data;
  const generic = "Correo o contraseña incorrectos.";

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    await verifyPassword(password, DUMMY_HASH);
    return { error: generic };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: "La cuenta está bloqueada temporalmente por intentos fallidos. Inténtalo en unos minutos." };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const attempts = user.failedLogins + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLogins: attempts >= MAX_ATTEMPTS ? 0 : attempts,
        lockedUntil: attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      },
    });
    await audit({ userId: user.id, action: "auth.login_failed", entity: "User", entityId: user.id, ip: await getClientIp() });
    return { error: generic };
  }

  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await createSession(user.id, user.defaultBranchId);
  await audit({ userId: user.id, action: "auth.login", entity: "User", entityId: user.id, ip: await getClientIp() });

  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  redirect(safeNext);
}

export async function logoutAction() {
  const user = await getSessionUser();
  if (user) await audit({ userId: user.id, action: "auth.logout", entity: "User", entityId: user.id });
  await destroySession();
  redirect("/login");
}

/** Cambia la sucursal activa de la sesión ("" = todas las permitidas). */
export async function setActiveBranchAction(branchId: string) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (branchId && !user.branchIds.includes(branchId)) return { ok: false as const, error: "No tienes acceso a esa sucursal." };
  await db.session.update({ where: { id: user.sessionId }, data: { activeBranchId: branchId || null } });
  return { ok: true as const };
}
