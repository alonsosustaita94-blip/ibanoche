import { z } from "zod";
import { emailSchema, optionalText, percentBps, phoneSchema } from "./common";

export const PARTNER_TYPES = ["DOCTOR", "CLINIC", "HOSPITAL", "COMPANY", "SCHOOL", "INSTITUTION"] as const;
export const PARTNER_STATUSES = ["PROSPECT", "NEGOTIATION", "ACTIVE", "INACTIVE"] as const;

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha no válida.");

export const partnerSchema = z.object({
  organization: z.string().trim().min(2, "Escribe la organización.").max(150),
  contactName: z.string().trim().min(2, "Escribe el nombre del contacto.").max(120),
  phone: phoneSchema,
  email: emailSchema,
  type: z.enum(PARTNER_TYPES),
  status: z.enum(PARTNER_STATUSES),
  ownerId: optionalText(40),
  branchId: optionalText(40),
  startDate: optionalDate,
  notes: optionalText(2000),
});

export type PartnerInput = z.infer<typeof partnerSchema>;

/** Descuento máximo de un convenio: 30 %. */
export const MAX_AGREEMENT_BPS = 3000;

export const agreementSchema = z
  .object({
    partnerId: z.string().min(1),
    name: z.string().trim().min(3, "Escribe el nombre del convenio.").max(120),
    discountBps: percentBps.refine((v) => v <= MAX_AGREEMENT_BPS, "El descuento de un convenio no puede superar 30 %."),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha de inicio."),
    validTo: optionalDate,
    status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "CANCELLED"]),
    terms: optionalText(2000),
  })
  .refine((d) => !d.validTo || d.validTo >= d.validFrom, { message: "La vigencia final debe ser posterior al inicio.", path: ["validTo"] });

export type AgreementInput = z.infer<typeof agreementSchema>;
