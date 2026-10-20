import { z } from "zod";

export const lineItemsSchema = z
  .array(z.object({ studyId: z.string().min(1).max(40), quantity: z.number().int().min(1, "Cantidad mínima 1.").max(99, "Cantidad máxima 99.") }))
  .min(1, "Agrega al menos un estudio.")
  .max(50, "Máximo 50 estudios.");

export const discountBpsSchema = z.number().int("Descuento no válido.").min(0, "Descuento no válido.").max(10000, "El descuento no puede superar el 100 %.");

export const quoteDraftSchema = z
  .object({
    patientId: z.string().max(40).nullish(),
    prospectName: z.string().trim().max(120).nullish(),
    prospectPhone: z
      .string()
      .trim()
      .max(20)
      .nullish()
      .refine((v) => !v || v.replace(/\D/g, "").length >= 10, "Escribe un teléfono de 10 dígitos."),
    branchId: z.string().min(1, "Elige una sucursal."),
    items: lineItemsSchema,
    discountBps: discountBpsSchema,
    promotionId: z.string().max(40).nullish(),
    notes: z.string().trim().max(1000).nullish(),
    status: z.enum(["DRAFT", "SENT"]).default("DRAFT"),
  })
  .refine((d) => d.patientId || (d.prospectName && d.prospectName.length >= 2), {
    message: "Elige un paciente o escribe el nombre del prospecto.",
    path: ["patientId"],
  });

export type QuoteDraftInput = z.infer<typeof quoteDraftSchema>;

export const QUOTE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT", "REJECTED"],
  SENT: ["FOLLOW_UP", "ACCEPTED", "REJECTED"],
  FOLLOW_UP: ["SENT", "ACCEPTED", "REJECTED"],
  ACCEPTED: [],
  REJECTED: ["FOLLOW_UP"],
  EXPIRED: [],
};

export const quoteStatusSchema = z.object({
  quoteId: z.string().min(1).max(40),
  to: z.enum(["SENT", "FOLLOW_UP", "ACCEPTED", "REJECTED"]),
});
