"use client";

import { toast } from "sonner";

type Result = { ok: true; message?: string } | { ok: false; error: string };

/** Muestra el resultado de una acción de servidor y devuelve si tuvo éxito. */
export function notifyResult(result: Result, successFallback = "Cambios guardados") {
  if (result.ok) toast.success(result.message ?? successFallback);
  else toast.error(result.error);
  return result.ok;
}
