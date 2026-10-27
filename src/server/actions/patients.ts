"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError, runAction } from "@/lib/action";
import { assertBranch, requireUser } from "@/lib/auth/guard";
import { getClientIp } from "@/lib/auth/session";
import { interactionSchema, patientSchema } from "@/lib/validation/patient";
import { createPatient, findDuplicates, type DuplicateCandidate, updatePatient } from "@/server/services/patients";

type SaveResult = { id: string } | { duplicates: DuplicateCandidate[] };

/** Crea o actualiza un paciente. Si hay posibles duplicados pide confirmación. */
export async function savePatientAction(patientId: string | null, formData: FormData) {
  return runAction<SaveResult>(async () => {
    const user = await requireUser("patients.manage");
    const input = patientSchema.parse(Object.fromEntries(formData));
    assertBranch(user, input.branchId);

    if (!input.confirmDuplicate) {
      const duplicates = await findDuplicates(input, patientId ?? undefined);
      if (duplicates.length) return { duplicates };
    }

    if (patientId) {
      const existing = await db.patient.findUnique({ where: { id: patientId } });
      if (!existing) throw new BusinessError("El paciente ya no existe.");
      assertBranch(user, existing.branchId);
      const { before, after } = await updatePatient(patientId, input);
      await audit({ userId: user.id, action: "patient.update", entity: "Patient", entityId: after.id, branchId: after.branchId, before, after, ip: await getClientIp() });
      revalidatePath(`/crm/pacientes/${after.id}`);
      revalidatePath("/crm/pacientes");
      return { id: after.id };
    }

    const created = await createPatient(input);
    await audit({ userId: user.id, action: "patient.create", entity: "Patient", entityId: created.id, branchId: created.branchId, after: created, ip: await getClientIp() });
    revalidatePath("/crm/pacientes");
    return { id: created.id };
  });
}

export async function addInteractionAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser("patients.manage");
    const input = interactionSchema.parse(Object.fromEntries(formData));
    const patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new BusinessError("El paciente ya no existe.");
    assertBranch(user, patient.branchId);
    await db.patientInteraction.create({ data: { ...input, userId: user.id } });
    revalidatePath(`/crm/pacientes/${input.patientId}`);
    return undefined;
  }, "Interacción registrada");
}

/** Tamaño máximo del PDF de resultados (las funciones de Vercel aceptan hasta 4.5 MB por solicitud). */
const MAX_RESULT_BYTES = 4 * 1024 * 1024;

export async function uploadResultAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser("patients.manage");
    const patientId = String(formData.get("patientId") ?? "");
    const file = formData.get("file");
    const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
    if (!(file instanceof File) || file.size === 0) throw new BusinessError("Selecciona el PDF de resultados.");
    if (file.size > MAX_RESULT_BYTES) throw new BusinessError("El PDF pesa más de 4 MB. Comprímelo e inténtalo de nuevo.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (Buffer.from(bytes.subarray(0, 5)).toString("latin1") !== "%PDF-") throw new BusinessError("El archivo debe ser un PDF.");
    const patient = await db.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new BusinessError("El paciente ya no existe.");
    assertBranch(user, patient.branchId);
    const result = await db.studyResult.create({
      data: { patientId, fileName: file.name.slice(0, 120) || "resultados.pdf", sizeBytes: bytes.length, data: bytes, note, uploadedById: user.id },
      select: { id: true, fileName: true },
    });
    await audit({ userId: user.id, action: "patient.result.upload", entity: "Patient", entityId: patientId, branchId: patient.branchId, summary: result.fileName });
    revalidatePath(`/crm/pacientes/${patientId}`);
    return undefined;
  }, "Resultados cargados");
}

export async function deleteResultAction(resultId: string) {
  return runAction(async () => {
    const user = await requireUser("patients.manage");
    const result = await db.studyResult.findUnique({ where: { id: resultId }, include: { patient: true } });
    if (!result) throw new BusinessError("El archivo ya no existe.");
    assertBranch(user, result.patient.branchId);
    await db.studyResult.delete({ where: { id: resultId } });
    await audit({ userId: user.id, action: "patient.result.delete", entity: "Patient", entityId: result.patientId, branchId: result.patient.branchId, summary: result.fileName });
    revalidatePath(`/crm/pacientes/${result.patientId}`);
    return undefined;
  }, "Archivo eliminado");
}
