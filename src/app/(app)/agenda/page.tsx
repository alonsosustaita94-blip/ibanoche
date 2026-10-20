import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage, resolveBranchFilter } from "@/lib/auth/guard";
import { addDays, localDateKey, localTime, zonedDateTime } from "@/lib/dates";
import { APPOINTMENT_STATUS } from "@/lib/labels";
import { cn, fullName } from "@/lib/utils";
import type { PatientOption } from "@/server/actions/lookup";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { AgendaBoard } from "./agenda-board";
import { CreateAppointmentDialog } from "./appointment-dialogs";
import type { AgendaView, ApptView, DayColumn } from "./types";

export const metadata: Metadata = { title: "Agenda y citas" };

type SP = { view?: string; date?: string; branch?: string; nueva?: string; patientId?: string; cita?: string };

const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function parts(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage("appointments.view");
  const sp = await searchParams;
  const view: AgendaView = sp.view === "day" || sp.view === "month" ? sp.view : "week";
  const today = localDateKey(new Date());
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const branchIds = resolveBranchFilter(user, sp.branch);
  const canManage = can(user, "appointments.manage");

  // Rango visible
  const p = parts(date);
  let start: string;
  let days: number;
  if (view === "day") {
    start = date;
    days = 1;
  } else if (view === "week") {
    start = addDays(date, -((p.weekday + 6) % 7)); // lunes
    days = 7;
  } else {
    const first = `${p.y}-${String(p.m).padStart(2, "0")}-01`;
    start = addDays(first, -((parts(first).weekday + 6) % 7));
    days = 42;
  }
  const end = addDays(start, days);
  const columns: DayColumn[] = Array.from({ length: days }, (_, i) => {
    const key = addDays(start, i);
    const q = parts(key);
    return {
      dateKey: key,
      label: `${WEEKDAY_SHORT[q.weekday]} ${q.d} ${MONTHS[q.m - 1].slice(0, 3)}`,
      short: WEEKDAY_SHORT[q.weekday],
      dayNum: q.d,
      isToday: key === today,
      inMonth: q.m === p.m,
      weekday: q.weekday,
    };
  });

  const [appointments, schedules, branches, dayCounts] = await Promise.all([
    db.appointment.findMany({
      where: { branchId: { in: branchIds }, startsAt: { gte: zonedDateTime(start, "00:00"), lt: zonedDateTime(end, "00:00") } },
      include: { patient: true, branch: true, responsible: { select: { id: true, name: true } }, studies: { include: { study: { select: { id: true, code: true, name: true } } } } },
      orderBy: { startsAt: "asc" },
    }),
    db.branchSchedule.findMany({ where: { branchId: { in: branchIds }, active: true } }),
    db.branch.findMany({ where: { id: { in: user.branchIds }, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.appointment.groupBy({
      by: ["status"],
      _count: true,
      where: { branchId: { in: branchIds }, startsAt: { gte: zonedDateTime(date, "00:00"), lt: zonedDateTime(addDays(date, 1), "00:00") } },
    }),
  ]);

  // Cita enlazada (?cita=) fuera del rango visible
  let linked = sp.cita && !appointments.some((a) => a.id === sp.cita)
    ? await db.appointment.findFirst({
        where: { id: sp.cita, branchId: { in: user.branchIds } },
        include: { patient: true, branch: true, responsible: { select: { id: true, name: true } }, studies: { include: { study: { select: { id: true, code: true, name: true } } } } },
      })
    : null;
  if (!sp.cita) linked = null;

  const toView = (a: (typeof appointments)[number]): ApptView => {
    const time = localTime(a.startsAt);
    return {
      id: a.id,
      folio: a.folio,
      patientId: a.patientId,
      patientName: fullName(a.patient),
      patientPhone: a.patient.phone,
      branchId: a.branchId,
      branchName: a.branch.name,
      startsAt: a.startsAt.toISOString(),
      dateKey: localDateKey(a.startsAt),
      time,
      endTime: localTime(a.endsAt),
      startMin: minutesOf(time),
      durationMin: Math.max(15, Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60000)),
      type: a.type,
      status: a.status,
      homeAddress: a.homeAddress,
      notes: a.notes,
      cancelReason: a.cancelReason,
      responsibleId: a.responsibleId,
      responsibleName: a.responsible?.name ?? null,
      source: a.source,
      studies: a.studies.map((s) => s.study),
    };
  };
  const items = appointments.map(toView);

  // Horas visibles de la cuadrícula según los horarios configurados
  const opens = schedules.map((s) => minutesOf(s.opensAt));
  const closes = schedules.map((s) => minutesOf(s.closesAt));
  let gridStart = opens.length ? Math.min(...opens) : 7 * 60;
  let gridEnd = closes.length ? Math.max(...closes) : 15 * 60;
  for (const a of items) {
    gridStart = Math.min(gridStart, Math.floor(a.startMin / 60) * 60);
    gridEnd = Math.max(gridEnd, Math.ceil((a.startMin + a.durationMin) / 60) * 60);
  }
  gridStart = Math.floor(gridStart / 60) * 60;
  gridEnd = Math.ceil(gridEnd / 60) * 60;

  // Navegación
  const step = view === "day" ? 1 : view === "week" ? 7 : 0;
  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(p.y, p.m - 1 + delta, 1));
    return d.toISOString().slice(0, 10);
  };
  const prev = view === "month" ? shiftMonth(-1) : addDays(date, -step);
  const next = view === "month" ? shiftMonth(1) : addDays(date, step);
  const href = (patch: Partial<SP>) => {
    const q = new URLSearchParams();
    const merged = { view, date, branch: sp.branch, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    return `/agenda?${q.toString()}`;
  };

  const title =
    view === "day"
      ? `${columns[0].label} ${p.y}`
      : view === "week"
        ? `${columns[0].dayNum} ${MONTHS[parts(columns[0].dateKey).m - 1].slice(0, 3)} – ${columns[6].dayNum} ${MONTHS[parts(columns[6].dateKey).m - 1].slice(0, 3)} ${parts(columns[6].dateKey).y}`
        : `${MONTHS[p.m - 1][0].toUpperCase()}${MONTHS[p.m - 1].slice(1)} ${p.y}`;

  let initialPatient: PatientOption | null = null;
  if (sp.nueva === "1" && sp.patientId && canManage) {
    const pt = await db.patient.findFirst({ where: { id: sp.patientId, branchId: { in: user.branchIds } } });
    if (pt) initialPatient = { id: pt.id, name: fullName(pt), folio: pt.folio, phone: pt.phone, branchId: pt.branchId, contactConsent: pt.contactConsent };
  }

  const counts = Object.fromEntries(dayCounts.map((c) => [c.status, c._count])) as Record<string, number>;
  const totalDay = dayCounts.reduce((a, c) => a + c._count, 0);

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader
        title="Agenda y citas"
        description="Citas en sucursal y a domicilio. El cupo y los horarios se validan al agendar."
        actions={
          canManage ? (
            <CreateAppointmentDialog
              branches={branches}
              defaultBranchId={user.activeBranchId ?? (branchIds.length === 1 ? branchIds[0] : branches[0]?.id)}
              defaultDate={date < today ? today : date}
              initialPatient={initialPatient}
              autoOpen={sp.nueva === "1"}
            />
          ) : null
        }
      />

      <Card className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <Link href={href({ date: prev })} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link href={href({ date: today })} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Hoy
          </Link>
          <Link href={href({ date: next })} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Siguiente">
            <ChevronRight className="h-4 w-4" />
          </Link>
          <h2 className="ml-2 font-display text-base font-bold capitalize text-brand-ink">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {branches.length > 1 ? (
            <FilterSelect
              param="branch"
              label="Sucursal"
              allLabel={user.activeBranchId ? "Sucursal activa" : "Todas mis sucursales"}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              className="h-9 text-xs font-semibold sm:w-52"
            />
          ) : null}
          <nav aria-label="Vista del calendario" className="inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1">
            {(["day", "week", "month"] as const).map((v) => (
              <Link
                key={v}
                href={href({ view: v })}
                aria-current={view === v ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1 font-display text-xs font-semibold transition",
                  view === v ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-primary",
                )}
              >
                {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
              </Link>
            ))}
          </nav>
        </div>
      </Card>

      <section aria-label="Resumen del día" className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-display font-bold text-brand-ink">
          {date === today ? "Hoy" : columns.find((c) => c.dateKey === date)?.label ?? date}: {totalDay} {totalDay === 1 ? "cita" : "citas"}
        </span>
        {(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1">
            <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} aria-hidden />
            {APPOINTMENT_STATUS[s].label}
            <span className="font-semibold tabular text-brand-ink">{counts[s] ?? 0}</span>
          </span>
        ))}
      </section>

      <AgendaBoard
        view={view}
        columns={columns}
        items={items}
        linked={linked ? toView(linked) : null}
        gridStart={gridStart}
        gridEnd={gridEnd}
        canManage={canManage}
        branches={branches}
        dayHref={Object.fromEntries(columns.map((c) => [c.dateKey, href({ view: "day", date: c.dateKey })]))}
      />
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-brand-coral",
  CONFIRMED: "bg-brand-blue",
  IN_PROGRESS: "bg-brand-turquoise",
  COMPLETED: "bg-brand-green",
  CANCELLED: "bg-[#9AA8BC]",
  NO_SHOW: "bg-brand-amber",
};
