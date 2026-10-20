import { z } from "zod";
import { moneyCents, optionalText, phoneSchema } from "./common";

export const CLIENT_TYPES = ["PATIENT", "DOCTOR", "CLINIC", "HOSPITAL", "COMPANY", "SCHOOL", "INSTITUTION"] as const;
export const STAGES = ["PROSPECT", "CONTACTED", "QUOTED", "FOLLOW_UP", "WON", "LOST"] as const;

export const opportunitySchema = z.object({
  title: z.string().trim().min(3, "Escribe un título.").max(120),
  prospectName: z.string().trim().min(2, "Escribe el nombre del prospecto.").max(120),
  prospectPhone: phoneSchema,
  clientType: z.enum(CLIENT_TYPES),
  estimatedCents: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? "0" : v))
    .pipe(moneyCents),
  ownerId: optionalText(40),
  branchId: z.string().min(1, "Elige una sucursal."),
  nextFollowUpAt: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v), "Fecha no válida."),
  notes: optionalText(2000),
  partnerId: optionalText(40),
  patientId: optionalText(40),
  stage: z.enum(STAGES).optional(),
});

export type OpportunityInput = z.infer<typeof opportunitySchema>;

export const moveSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(STAGES),
  position: z.number().int().min(0).max(100000).optional(),
  lostReason: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? v : undefined)),
});
