import { z } from "zod";

export const REQUEST_TYPES = {
  informacion: "Información de estudios y precios",
  cita: "Solicitud de cita",
  profesional: "Colaboración para profesionales",
  empresa: "Propuesta empresarial",
  consultorio: "Renta de consultorio",
} as const;

export type RequestType = keyof typeof REQUEST_TYPES;

export const publicRequestSchema = z.object({
  type: z.enum(Object.keys(REQUEST_TYPES) as [RequestType, ...RequestType[]]),
  name: z.string().trim().min(3, "Escribe tu nombre completo.").max(120),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Escribe un teléfono de 10 dígitos."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || z.string().email().safeParse(v).success, "Escribe un correo válido."),
  branchId: z.string().trim().max(40).optional().transform((v) => (v ? v : undefined)),
  preferredDate: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha no válida."),
  organization: z.string().trim().max(120).optional().transform((v) => (v ? v : undefined)),
  message: z.string().trim().max(600, "Máximo 600 caracteres.").optional().transform((v) => (v ? v : undefined)),
  privacy: z.literal("on", { errorMap: () => ({ message: "Debes aceptar el aviso de privacidad." }) }),
  // Anti-spam: campo oculto que debe venir vacío y momento en que se mostró el formulario.
  website: z.string().max(0).optional(),
  renderedAt: z.coerce.number().int().positive(),
});
