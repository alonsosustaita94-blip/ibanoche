import { z } from "zod";

export const replySchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, "Escribe un mensaje.").max(2000, "Máximo 2000 caracteres."),
});

export const conversationStatusSchema = z.object({
  conversationId: z.string().min(1),
  action: z.enum(["take", "pending", "close", "reopen"]),
});

export const linkPatientSchema = z.object({
  conversationId: z.string().min(1),
  patientId: z.string().min(1).nullable(),
});
