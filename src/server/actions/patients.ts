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
