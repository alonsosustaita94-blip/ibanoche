"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError, runAction } from "@/lib/action";
import { assertBranch, requireUser } from "@/lib/auth/guard";
import { getClientIp } from "@/lib/auth/session";
import {
  appointmentCreateSchema,
  appointmentEditSchema,
  appointmentRescheduleSchema,
  appointmentStatusSchema,
  availabilitySchema,
} from "@/lib/validation/appointment";
import {
  createAppointment,
  getAvailability,
  rescheduleAppointment,
  setAppointmentStatus,
  type Slot,
} from "@/server/services/appointments";

/** Horarios disponibles reales de una sucursal en una fecha. */
export async function availabilityAction(input: { branchId: string; date: string; type?: "BRANCH" | "HOME" }) {
  return runAction<{ open: boolean; slots: Slot[]; slotMinutes: number }>(async () => {
    const user = await requireUser("appointments.view");
    const d = availabilitySchema.parse(input);
    assertBranch(user, d.branchId);
    return getAvailability(d.branchId, d.date, d.type);
  });
}

/** Usuarios activos con acceso a la sucursal (para asignar responsable). */
export async function branchStaffAction(branchId: string) {
  return runAction<{ id: string; name: string }[]>(async () => {
    const user = await requireUser("appointments.view");
    assertBranch(user, branchId);
    return db.user.findMany({
      where: { active: true, OR: [{ branches: { some: { branchId } } }, { role: { permissions: { has: "branches.all" } } }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  });
}

async function assertResponsible(responsibleId: string | undefined, branchId: string) {
  if (!responsibleId) return;
  const ok = await db.user.findFirst({
    where: { id: responsibleId, active: true, OR: [{ branches: { some: { branchId } } }, { role: { permissions: { has: "branches.all" } } }] },
  });
  if (!ok) throw new BusinessError("El responsable no tiene acceso a esa sucursal.", { responsibleId: "Elige otro responsable." });
}

async function assertStudies(studyIds: string[]) {
  if (!studyIds.length) return;
  const n = await db.study.count({ where: { id: { in: studyIds }, active: true } });
  if (n !== new Set(studyIds).size) throw new BusinessError("Uno de los estudios no existe o está inactivo.");
}

export async function createAppointmentAction(formData: FormData) {
  return runAction<{ id: string; folio: string }>(async () => {
    const user = await requireUser("appointments.manage");
    const d = appointmentCreateSchema.parse(Object.fromEntries(formData));
    assertBranch(user, d.branchId);
    const patient = await db.patient.findUnique({ where: { id: d.patientId } });
    if (!patient || patient.status !== "ACTIVE") throw new BusinessError("El paciente no existe o está inactivo.");
    assertBranch(user, patient.branchId);
    await assertResponsible(d.responsibleId, d.branchId);
    await assertStudies(d.studyIds);
    const appt = await createAppointment(
      {
        patientId: d.patientId,
        branchId: d.branchId,
        startsAt: new Date(d.startsAt),
        type: d.type,
        studyIds: d.studyIds,
        homeAddress: d.homeAddress,
        notes: d.notes,
        responsibleId: d.responsibleId ?? null,
        status: d.status,
      },
      user.id,
    );
    await audit({ userId: user.id, action: "appointment.create", entity: "Appointment", entityId: appt.id, branchId: appt.branchId, after: appt, ip: await getClientIp() });
    revalidatePath("/agenda");
    revalidatePath(`/pacientes/${appt.patientId}`);
    return { id: appt.id, folio: appt.folio };
  }, "Cita agendada");
}

async function loadScoped(id: string, user: Awaited<ReturnType<typeof requireUser>>) {
  const appt = await db.appointment.findUnique({ where: { id } });
  if (!appt) throw new BusinessError("La cita ya no existe.");
  assertBranch(user, appt.branchId);
  return appt;
}

export async function rescheduleAppointmentAction(input: { id: string; startsAt: string; branchId?: string }) {
  return runAction(async () => {
    const user = await requireUser("appointments.manage");
    const d = appointmentRescheduleSchema.parse(input);
    await loadScoped(d.id, user);
    if (d.branchId) assertBranch(user, d.branchId);
    const { before, after } = await rescheduleAppointment(d.id, new Date(d.startsAt), d.branchId);
    await audit({ userId: user.id, action: "appointment.reschedule", entity: "Appointment", entityId: after.id, branchId: after.branchId, before, after, ip: await getClientIp() });
    revalidatePath("/agenda");
    return undefined;
  }, "Cita reagendada");
}

const STATUS_MESSAGES: Record<string, string> = {
  CONFIRMED: "Cita confirmada",
  IN_PROGRESS: "Asistencia registrada",
  COMPLETED: "Cita completada",
  CANCELLED: "Cita cancelada",
  NO_SHOW: "Ausencia registrada",
  PENDING: "Cita marcada como pendiente",
};

export async function setAppointmentStatusAction(input: { id: string; status: string; reason?: string }) {
  const parsed = appointmentStatusSchema.safeParse(input);
  return runAction(async () => {
    const user = await requireUser("appointments.manage");
    const d = appointmentStatusSchema.parse(input);
    await loadScoped(d.id, user);
    const { before, after } = await setAppointmentStatus(d.id, d.status, d.reason);
    await audit({ userId: user.id, action: `appointment.status.${d.status.toLowerCase()}`, entity: "Appointment", entityId: after.id, branchId: after.branchId, before, after, ip: await getClientIp() });
    revalidatePath("/agenda");
    revalidatePath(`/pacientes/${after.patientId}`);
    return undefined;
  }, parsed.success ? STATUS_MESSAGES[parsed.data.status] : undefined);
}

export async function updateAppointmentAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser("appointments.manage");
    const d = appointmentEditSchema.parse(Object.fromEntries(formData));
    const before = await loadScoped(d.id, user);
    if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(before.status)) throw new BusinessError("No se puede editar una cita cerrada.");
    await assertResponsible(d.responsibleId, before.branchId);
    await assertStudies(d.studyIds);
    const after = await db.$transaction(async (tx) => {
      await tx.appointmentStudy.deleteMany({ where: { appointmentId: d.id } });
      return tx.appointment.update({
        where: { id: d.id },
        data: {
          notes: d.notes ?? null,
          responsibleId: d.responsibleId ?? null,
          studies: { create: [...new Set(d.studyIds)].map((studyId) => ({ studyId })) },
        },
        include: { studies: true },
      });
    });
    await audit({ userId: user.id, action: "appointment.update", entity: "Appointment", entityId: after.id, branchId: after.branchId, before, after, ip: await getClientIp() });
    revalidatePath("/agenda");
    return undefined;
  }, "Cita actualizada");
}
