import { z } from "zod";
import { discountBpsSchema, lineItemsSchema } from "./quote";

export const paymentPartSchema = z.object({
  method: z.enum(["CASH", "CARD", "TRANSFER"]),
  amountCents: z.number().int().min(0).max(100_000_000),
  reference: z.string().trim().max(80).nullish(),
});

export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,80}$/, "Solicitud no válida. Recarga la página.");

export const chargeSchema = z.object({
  orderId: z.string().min(1).max(40),
  parts: z.array(paymentPartSchema).min(1).max(3),
  idempotencyKey: idempotencyKeySchema,
});

export const posSaleSchema = z.object({
  patientId: z.string().min(1, "Elige un paciente.").max(40),
  branchId: z.string().min(1).max(40),
  items: lineItemsSchema,
  discountBps: discountBpsSchema,
  promotionId: z.string().max(40).nullish(),
  parts: z.array(paymentPartSchema).min(1).max(3),
  idempotencyKey: idempotencyKeySchema,
});

export const openCashSchema = z.object({
  branchId: z.string().min(1).max(40),
  openingCents: z.number().int().min(0, "Fondo no válido.").max(10_000_000),
});

export const closeCashSchema = z.object({
  sessionId: z.string().min(1).max(40),
  countedCashCents: z.number().int().min(0, "Escribe el efectivo contado.").max(100_000_000),
  notes: z.string().trim().max(500).nullish(),
});

export const voidPaymentSchema = z.object({
  paymentId: z.string().min(1).max(40),
  reason: z.string().trim().min(5, "Describe el motivo (mínimo 5 caracteres).").max(300),
});
