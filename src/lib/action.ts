import "server-only";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/guard";

/** Resultado uniforme de las acciones de servidor. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Error de negocio con mensaje para el usuario. */
export class BusinessError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

/** Convierte cualquier excepción en un mensaje comprensible. */
export function toActionError(err: unknown): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Revisa los campos marcados.", fieldErrors };
  }
  if (err instanceof BusinessError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
  if (err instanceof AuthError) return { ok: false, error: err.message };
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return { ok: false, error: "Ya existe un registro con esos datos." };
    if (err.code === "P2025") return { ok: false, error: "El registro ya no existe o fue modificado." };
    if (err.code === "P2034") return { ok: false, error: "Otra operación modificó estos datos. Inténtalo de nuevo." };
  }
  console.error(err);
  return { ok: false, error: "Ocurrió un error inesperado. No se guardaron cambios." };
}

/** Envuelve una acción: captura errores y devuelve ActionResult. */
export async function runAction<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    return ok(await fn(), message);
  } catch (err) {
    if (isNextRedirect(err)) throw err;
    return toActionError(err);
  }
}

function isNextRedirect(err: unknown) {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
