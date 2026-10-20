"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError, runAction } from "@/lib/action";
import { requireUser } from "@/lib/auth/guard";
import { getClientIp, type SessionUser } from "@/lib/auth/session";
import { conversationStatusSchema, linkPatientSchema, replySchema } from "@/lib/validation/emilia";

/** Conversación visible para el usuario (su sucursal o sin sucursal asignada). */
async function loadConversation(user: SessionUser, id: string) {
  const conv = await db.conversation.findFirst({
    where: { id, OR: [{ branchId: { in: user.branchIds } }, { branchId: null }] },
  });
  if (!conv) throw new BusinessError("La conversación ya no existe o no tienes acceso.");
  return conv;
}

/**
 * Respuesta del personal. Se guarda en el CRM; no se envía a WhatsApp ni al
 * sitio web hasta que se configure la integración del canal.
 */
export async function replyConversationAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser("emilia.reply");
    const input = replySchema.parse(Object.fromEntries(formData));
    const conv = await loadConversation(user, input.conversationId);
    if (conv.status === "CLOSED") throw new BusinessError("La conversación está cerrada. Reábrela para responder.");
    const message = await db.$transaction(async (tx) => {
      const m = await tx.message.create({ data: { conversationId: conv.id, sender: "AGENT", body: input.body, userId: user.id } });
      await tx.conversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: m.createdAt, assignedToId: conv.assignedToId ?? user.id },
      });
      return m;
    });
    await audit({ userId: user.id, action: "conversation.reply", entity: "Conversation", entityId: conv.id, branchId: conv.branchId, after: { messageId: message.id }, ip: await getClientIp() });
    revalidatePath("/emilia");
    return { id: message.id };
  }, "Respuesta guardada en el CRM");
}

const STATUS_COPY = {
  take: { status: "TRANSFERRED", note: "tomó la conversación", toast: "Conversación asignada a ti" },
  pending: { status: "PENDING", note: "marcó la conversación como pendiente", toast: "Marcada como pendiente" },
  close: { status: "CLOSED", note: "cerró la conversación", toast: "Conversación cerrada" },
  reopen: { status: "PENDING", note: "reabrió la conversación", toast: "Conversación reabierta" },
} as const;

export async function setConversationStatusAction(conversationId: string, action: keyof typeof STATUS_COPY) {
  const copy = STATUS_COPY[action];
  return runAction(async () => {
    const user = await requireUser("emilia.reply");
    const input = conversationStatusSchema.parse({ conversationId, action });
    const conv = await loadConversation(user, input.conversationId);
    if (action === "reopen" && conv.status !== "CLOSED") throw new BusinessError("La conversación no está cerrada.");
    if (action !== "reopen" && conv.status === "CLOSED") throw new BusinessError("La conversación está cerrada. Reábrela primero.");
    const after = await db.conversation.update({
      where: { id: conv.id },
      data: {
        status: copy.status,
        ...(action === "take" ? { assignedToId: user.id } : {}),
        messages: { create: { sender: "SYSTEM", body: `${user.name} ${copy.note}.` } },
      },
    });
    await audit({ userId: user.id, action: `conversation.${action}`, entity: "Conversation", entityId: conv.id, branchId: conv.branchId, before: { status: conv.status, assignedToId: conv.assignedToId }, after: { status: after.status, assignedToId: after.assignedToId }, ip: await getClientIp() });
    revalidatePath("/emilia");
    return undefined;
  }, copy.toast);
}

export async function linkConversationPatientAction(conversationId: string, patientId: string | null) {
  return runAction(async () => {
    const user = await requireUser("emilia.reply");
    const input = linkPatientSchema.parse({ conversationId, patientId });
    const conv = await loadConversation(user, input.conversationId);
    if (input.patientId) {
      const patient = await db.patient.findFirst({ where: { id: input.patientId, branchId: { in: user.branchIds } } });
      if (!patient) throw new BusinessError("El paciente no existe o no tienes acceso.");
    }
    await db.conversation.update({ where: { id: conv.id }, data: { patientId: input.patientId } });
    await audit({ userId: user.id, action: "conversation.link_patient", entity: "Conversation", entityId: conv.id, branchId: conv.branchId, before: { patientId: conv.patientId }, after: { patientId: input.patientId }, ip: await getClientIp() });
    revalidatePath("/emilia");
    return undefined;
  }, patientId ? "Paciente vinculado" : "Paciente desvinculado");
}
