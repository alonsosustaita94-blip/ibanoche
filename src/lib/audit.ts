import "server-only";
import type { Prisma } from "@prisma/client";
import { db, type Tx } from "@/lib/db";

export type AuditInput = {
  userId?: string | null;
  actorType?: "USER" | "EMILIA" | "SYSTEM";
  action: string;
  entity: string;
  entityId?: string | null;
  branchId?: string | null;
  summary?: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
};

const json = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));

/** Registra un cambio administrativo. Acepta una transacción para ser atómico con el cambio. */
export async function audit(input: AuditInput, tx: Tx | typeof db = db) {
  await tx.auditLog.create({
    data: {
      userId: input.userId ?? null,
      actorType: input.actorType ?? "USER",
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      branchId: input.branchId ?? null,
      summary: input.summary,
      before: json(input.before),
      after: json(input.after),
      ip: input.ip ?? null,
    },
  });
}
