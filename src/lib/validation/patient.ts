import { z } from "zod";
import { checkbox, emailSchema, optionalText, phoneSchema } from "./common";

export const patientSchema = z
  .object({
    firstName: z.string().trim().min(2, "Escribe el nombre.").max(80),
    lastName: z.string().trim().min(2, "Escribe el apellido paterno.").max(80),
    secondLastName: optionalText(80),
    birthDate: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v) <= new Date() && new Date(v) > new Date("1900-01-01")), "Fecha de nacimiento no válida."),
    phone: phoneSchema,
    email: emailSchema,
    type: z.enum(["PARTICULAR", "CONVENIO", "EMPRESA", "OTRO"]),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
    source: z.enum(["WALK_IN", "PHONE", "WHATSAPP", "WEBSITE", "EMILIA", "REFERRAL", "OTHER"]),
    branchId: z.string().min(1, "Elige una sucursal."),
    partnerId: optionalText(40),
    contactConsent: checkbox,
    prefersWhatsApp: checkbox,
    prefersEmail: checkbox,
    prefersPhone: checkbox,
    adminNotes: optionalText(1000),
    /** Confirmación explícita cuando se detectaron posibles duplicados. */
    confirmDuplicate: checkbox,
  })
  .refine((d) => d.phone || d.email, { message: "Registra al menos un teléfono o un correo.", path: ["phone"] });

export type PatientInput = z.infer<typeof patientSchema>;

export const interactionSchema = z.object({
  patientId: z.string().min(1),
  type: z.enum(["CALL", "WHATSAPP", "EMAIL", "VISIT", "NOTE"]),
  summary: z.string().trim().min(3, "Describe la interacción.").max(500),
});
