export type AgendaView = "day" | "week" | "month";

/** Cita serializada para el cliente, con horas ya convertidas a la zona local. */
export type ApptView = {
  id: string;
  folio: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  branchId: string;
  branchName: string;
  startsAt: string;
  dateKey: string;
  time: string;
  endTime: string;
  startMin: number;
  durationMin: number;
  type: "BRANCH" | "HOME";
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  homeAddress: string | null;
  notes: string | null;
  cancelReason: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  source: string;
  studies: { id: string; code: string; name: string }[];
};

export type DayColumn = { dateKey: string; label: string; short: string; dayNum: number; isToday: boolean; inMonth: boolean; weekday: number };
