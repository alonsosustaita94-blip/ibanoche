import { z } from "zod";
import { checkbox, optionalText, percentBps } from "./common";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida (HH:MM).");
const intIn = (min: number, max: number, msg: string) =>
  z.coerce.number({ invalid_type_error: msg }).int(msg).min(min, msg).max(max, msg);

export const generalSettingsSchema = z.object({
  businessName: z.string().trim().min(3, "Escribe el nombre del negocio.").max(120),
  currency: z.literal("MXN"),
  quoteValidityDays: intIn(1, 90, "La vigencia debe estar entre 1 y 90 días."),
  minAdvanceMinutes: intIn(0, 2880, "La anticipación debe estar entre 0 y 2,880 minutos."),
  maxDaysAhead: intIn(1, 365, "El máximo debe estar entre 1 y 365 días."),
});

export const branchSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,20}$/, "Usa de 3 a 20 letras, números o guiones."),
  name: z.string().trim().min(3, "Escribe el nombre de la sucursal.").max(80),
  address: optionalText(200),
  phone: optionalText(20),
  active: checkbox,
});

export const scheduleRowSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    active: z.boolean(),
    opensAt: time,
    closesAt: time,
    slotMinutes: z.number().int().min(10, "El intervalo debe estar entre 10 y 120 minutos.").max(120, "El intervalo debe estar entre 10 y 120 minutos."),
    capacity: z.number().int().min(1, "La capacidad debe estar entre 1 y 20.").max(20, "La capacidad debe estar entre 1 y 20."),
    homeService: z.boolean(),
  })
  .refine((r) => !r.active || r.closesAt > r.opensAt, { message: "La hora de cierre debe ser posterior a la de apertura.", path: ["closesAt"] });

export const scheduleSchema = z.object({
  branchId: z.string().min(1),
  rows: z.array(scheduleRowSchema).length(7),
});

export const promotionSchema = z
  .object({
    name: z.string().trim().min(3, "Escribe el nombre de la promoción.").max(120),
    discount: percentBps,
    validFrom: z.string().optional().transform((v) => (v ? v : undefined)),
    validTo: z.string().optional().transform((v) => (v ? v : undefined)),
    active: checkbox,
  })
  .refine((d) => d.discount > 0, { message: "El descuento debe ser mayor a 0 %.", path: ["discount"] })
  .refine((d) => !d.validFrom || !d.validTo || d.validTo >= d.validFrom, { message: "La fecha final debe ser posterior a la inicial.", path: ["validTo"] });

export const paymentSettingsSchema = z
  .object({ CASH: checkbox, CARD: checkbox, TRANSFER: checkbox })
  .refine((d) => d.CASH || d.CARD || d.TRANSFER, { message: "Debe quedar al menos un método de pago activo.", path: ["CASH"] });

export const notificationSettingsSchema = z.object({
  appointmentReminders: checkbox,
  quoteFollowUp: checkbox,
  dailySummary: checkbox,
});

export const EMILIA_SCOPES = {
  "studies.read": "Buscar estudios",
  "prices.read": "Consultar precios públicos",
  "quotes.create": "Generar cotizaciones",
  "availability.read": "Consultar disponibilidad",
  "patients.write": "Registrar pacientes nuevos",
  "appointments.create": "Solicitar citas",
  "leads.create": "Registrar prospectos",
  "handoff.create": "Transferir a personal",
} as const;

export const apiKeySchema = z.object({
  name: z.string().trim().min(3, "Escribe un nombre para la llave.").max(80),
  scopes: z.array(z.enum(Object.keys(EMILIA_SCOPES) as [keyof typeof EMILIA_SCOPES, ...(keyof typeof EMILIA_SCOPES)[]])).min(1, "Elige al menos un permiso."),
  branchId: optionalText(40),
});
