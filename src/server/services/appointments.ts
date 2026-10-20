import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BusinessError } from "@/lib/action";
import { nextFolio } from "@/lib/folio";
import { addMinutes, localDateKey, localTime, localWeekday, zonedDateTime } from "@/lib/dates";

const ACTIVE: Prisma.AppointmentWhereInput["status"] = { notIn: ["CANCELLED", "NO_SHOW"] };

export async function appointmentSettings() {
  const s = await db.systemSetting.findUnique({ where: { key: "appointments" } });
  const v = (s?.value ?? {}) as { minAdvanceMinutes?: number; maxDaysAhead?: number };
  return { minAdvanceMinutes: v.minAdvanceMinutes ?? 60, maxDaysAhead: v.maxDaysAhead ?? 60 };
}

export type Slot = { time: string; startsAt: string; capacity: number; booked: number; available: boolean; reason?: string };

/** Horarios de un día con cupo disponible, según el horario configurado de la sucursal. */
export async function getAvailability(branchId: string, dateStr: string, type: "BRANCH" | "HOME" = "BRANCH"): Promise<{ open: boolean; slots: Slot[]; slotMinutes: number }> {
  const day = zonedDateTime(dateStr, "12:00");
  const schedule = await db.branchSchedule.findUnique({ where: { branchId_weekday: { branchId, weekday: localWeekday(day) } } });
  if (!schedule || !schedule.active) return { open: false, slots: [], slotMinutes: 30 };
  if (type === "HOME" && !schedule.homeService) return { open: false, slots: [], slotMinutes: schedule.slotMinutes };

  const settings = await appointmentSettings();
  const earliest = addMinutes(new Date(), settings.minAdvanceMinutes);
  const from = zonedDateTime(dateStr, schedule.opensAt);
  const to = zonedDateTime(dateStr, schedule.closesAt);
  const booked = await db.appointment.groupBy({ by: ["startsAt"], _count: true, where: { branchId, startsAt: { gte: from, lt: to }, status: ACTIVE } });
  const counts = new Map(booked.map((b) => [b.startsAt.getTime(), b._count]));

  const slots: Slot[] = [];
  for (let t = from; t < to; t = addMinutes(t, schedule.slotMinutes)) {
    const n = counts.get(t.getTime()) ?? 0;
    const tooSoon = t < earliest;
    slots.push({
      time: localTime(t),
      startsAt: t.toISOString(),
      capacity: schedule.capacity,
      booked: n,
      available: !tooSoon && n < schedule.capacity,
      reason: tooSoon ? "Fuera de la anticipación mínima" : n >= schedule.capacity ? "Sin cupo" : undefined,
    });
  }
  return { open: true, slots, slotMinutes: schedule.slotMinutes };
}

/**
 * Valida y reserva un horario dentro de una transacción con candado por
 * sucursal y horario (pg_advisory_xact_lock) para impedir sobrecupos.
 */
async function assertSlotBookable(
  tx: Prisma.TransactionClient,
  args: { branchId: string; patientId: string; startsAt: Date; type: "BRANCH" | "HOME"; excludeId?: string },
) {
  const { branchId, patientId, startsAt, type, excludeId } = args;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${branchId}|${startsAt.toISOString()}`}))`;

  const settings = await appointmentSettings();
  if (startsAt < addMinutes(new Date(), settings.minAdvanceMinutes)) throw new BusinessError(`La cita debe agendarse con al menos ${settings.minAdvanceMinutes} minutos de anticipación.`);
  if (startsAt > addMinutes(new Date(), settings.maxDaysAhead * 1440)) throw new BusinessError(`Solo se pueden agendar citas dentro de los próximos ${settings.maxDaysAhead} días.`);

  const schedule = await tx.branchSchedule.findUnique({ where: { branchId_weekday: { branchId, weekday: localWeekday(startsAt) } } });
  if (!schedule || !schedule.active) throw new BusinessError("La sucursal no atiende ese día.");
  if (type === "HOME" && !schedule.homeService) throw new BusinessError("No hay servicio a domicilio ese día.");
  const dateStr = localDateKey(startsAt);
  const open = zonedDateTime(dateStr, schedule.opensAt);
  const close = zonedDateTime(dateStr, schedule.closesAt);
  const offset = (startsAt.getTime() - open.getTime()) / 60000;
  if (startsAt < open || startsAt >= close || offset % schedule.slotMinutes !== 0) throw new BusinessError("Elige un horario disponible dentro del horario de la sucursal.");

  const taken = await tx.appointment.count({ where: { branchId, startsAt, status: ACTIVE, ...(excludeId ? { id: { not: excludeId } } : {}) } });
  if (taken >= schedule.capacity) throw new BusinessError("Ese horario ya no tiene cupo. Elige otro.");

  const endsAt = addMinutes(startsAt, schedule.slotMinutes);
  const overlap = await tx.appointment.findFirst({
    where: { patientId, status: ACTIVE, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (overlap) throw new BusinessError("El paciente ya tiene una cita en ese horario.");
  return { endsAt };
}

export type AppointmentDraft = {
  patientId: string;
  branchId: string;
  startsAt: Date;
  type: "BRANCH" | "HOME";
  studyIds: string[];
  homeAddress?: string | null;
  notes?: string | null;
  responsibleId?: string | null;
  source?: Prisma.AppointmentCreateInput["source"];
  status?: "PENDING" | "CONFIRMED";
};

export async function createAppointment(draft: AppointmentDraft, createdById: string | null) {
  if (draft.type === "HOME" && !draft.homeAddress) throw new BusinessError("Escribe el domicilio para la toma a domicilio.", { homeAddress: "Requerido." });
  return db.$transaction(async (tx) => {
    const { endsAt } = await assertSlotBookable(tx, draft);
    return tx.appointment.create({
      data: {
        folio: await nextFolio(tx, "CIT"),
        patientId: draft.patientId,
        branchId: draft.branchId,
        startsAt: draft.startsAt,
        endsAt,
        type: draft.type,
        status: draft.status ?? "PENDING",
        homeAddress: draft.type === "HOME" ? draft.homeAddress : null,
        notes: draft.notes ?? null,
        responsibleId: draft.responsibleId ?? null,
        createdById,
        source: draft.source ?? "WALK_IN",
        studies: { create: [...new Set(draft.studyIds)].map((studyId) => ({ studyId })) },
      },
    });
  });
}

export async function rescheduleAppointment(id: string, startsAt: Date, branchId?: string) {
  return db.$transaction(async (tx) => {
    const appt = await tx.appointment.findUnique({ where: { id } });
    if (!appt) throw new BusinessError("La cita ya no existe.");
    if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appt.status)) throw new BusinessError("Solo se pueden reagendar citas pendientes o confirmadas.");
    const target = branchId ?? appt.branchId;
    const { endsAt } = await assertSlotBookable(tx, { branchId: target, patientId: appt.patientId, startsAt, type: appt.type, excludeId: id });
    const after = await tx.appointment.update({ where: { id }, data: { startsAt, endsAt, branchId: target, status: "PENDING" } });
    return { before: appt, after };
  });
}

/** Estados permitidos desde cada estado de cita. */
export const APPOINTMENT_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["PENDING", "IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export async function setAppointmentStatus(id: string, to: string, reason?: string) {
  const appt = await db.appointment.findUnique({ where: { id } });
  if (!appt) throw new BusinessError("La cita ya no existe.");
  if (!APPOINTMENT_TRANSITIONS[appt.status]?.includes(to)) throw new BusinessError("Ese cambio de estado no está permitido para la cita.");
  if (to === "CANCELLED" && !reason) throw new BusinessError("Indica el motivo de la cancelación.");
  if ((to === "IN_PROGRESS" || to === "NO_SHOW") && appt.startsAt.getTime() - Date.now() > 12 * 3600000)
    throw new BusinessError("Solo puedes registrar asistencia el día de la cita.");
  const after = await db.appointment.update({
    where: { id },
    data: { status: to as Prisma.AppointmentUpdateInput["status"], cancelReason: to === "CANCELLED" ? reason : appt.cancelReason },
  });
  if (to === "COMPLETED") await db.patient.update({ where: { id: appt.patientId }, data: { lastVisitAt: new Date() } });
  return { before: appt, after };
}
