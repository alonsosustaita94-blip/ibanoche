import { z } from "zod";
import { checkbox, moneyCents, optionalText } from "./common";

export const studySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Escribe el código.")
    .max(20)
    .regex(/^[A-Z0-9-]+$/, "Usa solo letras, números y guiones."),
  name: z.string().trim().min(3, "Escribe el nombre del estudio.").max(150),
  synonyms: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? [...new Set(v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))].slice(0, 20)
        : [],
    ),
  categoryId: z.string().min(1, "Elige una categoría."),
  sampleType: optionalText(120),
  sampleTypeValidated: checkbox,
  instructions: optionalText(1500),
  instructionsApproved: checkbox,
  turnaround: optionalText(120),
  turnaroundConfirmed: checkbox,
  active: checkbox,
  publicPrice: z.string().optional(),
  internalCost: z.string().optional(),
});

export const priceSchema = z.object({
  studyId: z.string().min(1),
  kind: z.enum(["PUBLIC", "INTERNAL_COST"]),
  amount: moneyCents,
  reason: z.string().trim().min(3, "Indica el motivo del cambio.").max(200),
});

export const optionalMoney = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v : undefined))
  .pipe(moneyCents.optional());
