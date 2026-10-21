import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Permission } from "./permissions";

export const SESSION_COOKIE = "ibn_session";
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 8);

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type SessionUser = {
  sessionId: string;
  id: string;
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  permissions: Permission[];
  maxDiscountBps: number;
  /** Sucursales a las que el usuario tiene acceso. */
  branchIds: string[];
  allBranches: boolean;
  /** Sucursal activa elegida en el encabezado; null = todas las permitidas. */
  activeBranchId: string | null;
};

export async function createSession(userId: string, defaultBranchId: string | null) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  const expiresAt = new Date(Date.now() + TTL_HOURS * 3600_000);
  await db.session.create({
    data: {
      id: hashToken(token),
      userId,
      activeBranchId: defaultBranchId,
      expiresAt,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

/** Sesión actual (una consulta por petición gracias a cache). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { include: { role: true, branches: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;

  const { user } = session;
  const permissions = user.role.permissions as Permission[];
  const allBranches = permissions.includes("branches.all");
  const branchIds = allBranches
    ? (await db.branch.findMany({ where: { active: true }, select: { id: true } })).map((b) => b.id)
    : user.branches.map((b) => b.branchId);
  const activeBranchId =
    session.activeBranchId && branchIds.includes(session.activeBranchId) ? session.activeBranchId : null;

  return {
    sessionId: session.id,
    id: user.id,
    name: user.name,
    email: user.email,
    roleKey: user.role.key,
    roleName: user.role.name,
    permissions,
    maxDiscountBps: user.role.maxDiscountBps,
    branchIds,
    allBranches,
    activeBranchId,
  };
});

export async function getClientIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
