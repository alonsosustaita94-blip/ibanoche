import { z } from "zod";
import { discountBpsSchema, lineItemsSchema } from "./quote";

export const orderDraftSchema = z.object({
  patientId: z.string().min(1, "Elige un paciente.").max(40),
  branchId: z.string().min(1, "Elige una sucursal."),
  items: lineItemsSchema,
  discountBps: discountBpsSchema,
  promotionId: z.string().max(40).nullish(),
  notes: z.string().trim().max(1000).nullish(),
});

export const orderStatusSchema = z.object({
  orderId: z.string().min(1).max(40),
  to: z.enum(["CONFIRMED", "PAID", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const orderNoteSchema = z.object({
  orderId: z.string().min(1).max(40),
  note: z.string().trim().min(3, "Escribe la nota.").max(1000),
});

// RFC: persona moral (3 letras) o física (4 letras) + fecha AAMMDD + homoclave.
export const RFC_REGEX = /^([A-ZÑ&]{3,4})(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([A-Z\d]{2}[A\d])$/;

export const invoiceRequestSchema = z.object({
  orderId: z.string().min(1).max(40),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => RFC_REGEX.test(v), "Escribe un RFC válido (12 o 13 caracteres)."),
  legalName: z.string().trim().min(3, "Escribe la razón social.").max(200),
  taxRegime: z.string().trim().regex(/^\d{3}$/, "Elige el régimen fiscal."),
  zipCode: z.string().trim().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos."),
  cfdiUse: z.string().trim().regex(/^[A-Z]\d{2}$|^S01$|^CP01$|^CN01$/, "Elige el uso de CFDI."),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
});

export const TAX_REGIMES: [string, string][] = [
  ["601", "601 · General de Ley Personas Morales"],
  ["603", "603 · Personas Morales con Fines no Lucrativos"],
  ["605", "605 · Sueldos y Salarios"],
  ["606", "606 · Arrendamiento"],
  ["612", "612 · Personas Físicas con Actividades Empresariales y Profesionales"],
  ["616", "616 · Sin obligaciones fiscales"],
  ["621", "621 · Incorporación Fiscal"],
  ["626", "626 · Régimen Simplificado de Confianza"],
];

export const CFDI_USES: [string, string][] = [
  ["D01", "D01 · Honorarios médicos, dentales y gastos hospitalarios"],
  ["G03", "G03 · Gastos en general"],
  ["S01", "S01 · Sin efectos fiscales"],
  ["CP01", "CP01 · Pagos"],
];
