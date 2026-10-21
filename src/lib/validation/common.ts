import { z } from "zod";

/** Convierte "" en undefined para campos opcionales de formularios. */
export const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const phoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || v.replace(/\D/g, "").length >= 10, "Escribe un teléfono de 10 dígitos.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || z.string().email().safeParse(v).success, "Escribe un correo válido.");

export const idSchema = z.string().min(1).max(40);

/** Casilla de formulario ("on" / "true") a booleano. */
export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

/** Importe en pesos ("1,250.50") a centavos. */
export const moneyCents = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const s = String(v).replace(/[$,\s]/g, "");
    if (!/^\d+(\.\d{1,2})?$/.test(s)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Escribe un importe válido." });
      return z.NEVER;
    }
    const [i, d = ""] = s.split(".");
    return Number(i) * 100 + Number(d.padEnd(2, "0"));
  });

/** Porcentaje ("12.5") a puntos base (1250). */
export const percentBps = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const n = Number(String(v).replace(/[%\s]/g, "") || 0);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Escribe un porcentaje entre 0 y 100." });
      return z.NEVER;
    }
    return Math.round(n * 100);
  });
