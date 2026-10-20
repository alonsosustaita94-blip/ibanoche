import type { Tx } from "./db";

/**
 * Folio legible y consecutivo por prefijo y año (COT-2026-000123).
 * El incremento es atómico (UPSERT … RETURNING), seguro ante concurrencia.
 */
export async function nextFolio(tx: Tx, prefix: string, date = new Date()): Promise<string> {
  const year = date.getUTCFullYear();
  const key = `${prefix}-${year}`;
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("key", "value") VALUES (${key}, 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"`;
  return `${key}-${String(rows[0].value).padStart(6, "0")}`;
}

/** Folio de paciente sin año (PAC-000123). */
export async function nextPatientFolio(tx: Tx): Promise<string> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("key", "value") VALUES ('PAC', 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"`;
  return `PAC-${String(rows[0].value).padStart(6, "0")}`;
}
