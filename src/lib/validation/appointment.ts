import { z } from "zod";
import { optionalText } from "./common";

const ids = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []))
  .refine((a) => a.length <= 20, "Máximo 20 estudios.");

export const appointmentCreateSchema = z
  .object({
    patientId: z.string().min(1, "Elige un paciente."),
    branchId: z.string().min(1, "Elige una sucursal."),
    startsAt: z.string().datetime({ message: "Elige un horario disponible." }),
    type: z.enum(["BRANCH", "HOME"]),
    homeAddress: optionalText(300),
    notes: optionalText(1000),
    responsibleId: optionalText(40),
    studyIds: ids,
    status: z.enum(["PENDING", "CONFIRMED"]).default("PENDING"),
  })
  .refine((d) => d.type !== "HOME" || d.homeAddress, { message: "Escribe el domicilio.", path: ["homeAddress"] });

export const appointmentRescheduleSchema = z.object({
  id: z.string().min(1),
  startsAt: z.string().datetime({ message: "Elige un horario disponible." }),
  branchId: optionalText(40),
});

export const appointmentStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  reason: optionalText(300),
});

export const appointmentEditSchema = z.object({
  id: z.string().min(1),
  notes: optionalText(1000),
  responsibleId: optionalText(40),
  studyIds: ids,
});

export const availabilitySchema = z.object({
  branchId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["BRANCH", "HOME"]).default("BRANCH"),
});
