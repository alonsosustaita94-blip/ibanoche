import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export type ApiClientContext = { id: string; name: string; scopes: string[]; branchId: string | null };

/** Valida "Authorization: Bearer <llave>" contra el hash guardado. */
export async function authenticateApiKey(header: string | null): Promise<ApiClientContext | null> {
  const key = header?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!key || key.length < 20 || key.length > 200) return null;
  const client = await db.apiClient.findUnique({ where: { keyHash: createHash("sha256").update(key).digest("hex") } });
  if (!client || !client.active || client.revokedAt) return null;
  await db.apiClient.update({ where: { id: client.id }, data: { lastUsedAt: new Date() } });
  return { id: client.id, name: client.name, scopes: client.scopes, branchId: client.branchId };
}

// Límite simple por llave (por instancia). En producción con varias
// instancias, usar un almacén compartido (p. ej. Redis).
const buckets = new Map<string, { tokens: number; at: number }>();
export function rateLimit(key: string, perMinute = 60) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: perMinute, at: now };
  b.tokens = Math.min(perMinute, b.tokens + ((now - b.at) / 60000) * perMinute);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}
