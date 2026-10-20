"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarX2, Home } from "lucide-react";
import { APPOINTMENT_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { AppointmentDetailDialog } from "./appointment-dialogs";
import type { AgendaView, ApptView, DayColumn } from "./types";

export const STATUS_BLOCK: Record<ApptView["status"], string> = {
  PENDING: "border-brand-coral bg-brand-blush text-[#9e2a37]",
  CONFIRMED: "border-brand-blue bg-brand-ice text-brand-navy",
  IN_PROGRESS: "border-brand-turquoise bg-brand-mint text-[#1a7a7f]",
  COMPLETED: "border-brand-green bg-brand-greenSoft text-[#15704b]",
  CANCELLED: "border-[#9AA8BC] bg-muted text-muted-foreground line-through decoration-1",
  NO_SHOW: "border-brand-amber bg-brand-amberSoft text-[#8a5e0c]",
};

const PX_PER_MIN = 1.1;

/** Asigna columnas a citas simultáneas para que no se encimen. */
function layoutDay(items: ApptView[]) {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.patientName.localeCompare(b.patientName));
  const out: { item: ApptView; col: number; cols: number }[] = [];
  let cluster: { item: ApptView; col: number }[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((c) => c.col + 1));
    out.push(...cluster.map((c) => ({ ...c, cols })));
    cluster = [];
  };
  for (const item of sorted) {
    if (item.startMin >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    const used = new Set(cluster.filter((c) => c.item.startMin + c.item.durationMin > item.startMin).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ item, col });
    clusterEnd = Math.max(clusterEnd, item.startMin + item.durationMin);
  }
  flush();
  return out;
}

export function AgendaBoard({
  view,
  columns,
  items,
  linked,
  gridStart,
  gridEnd,
  canManage,
  branches,
  dayHref,
}: {
  view: AgendaView;
  columns: DayColumn[];
  items: ApptView[];
  linked: ApptView | null;
  gridStart: number;
  gridEnd: number;
  canManage: boolean;
  branches: { id: string; name: string }[];
  dayHref: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(params.get("cita"));
  const all = useMemo(() => (linked ? [...items, linked] : items), [items, linked]);
  const selected = all.find((a) => a.id === selectedId) ?? null;

  useEffect(() => setSelectedId(params.get("cita")), [params]);

  const open = (id: string) => setSelectedId(id);
  const close = () => {
    setSelectedId(null);
    if (params.get("cita")) {
      const next = new URLSearchParams(params.toString());
      next.delete("cita");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    }
  };

  const byDay = useMemo(() => {
    const m = new Map<string, ApptView[]>();
    for (const a of items) m.set(a.dateKey, [...(m.get(a.dateKey) ?? []), a]);
    return m;
  }, [items]);

  return (
    <>
      {view === "month" ? (
        <MonthGrid columns={columns} byDay={byDay} onOpen={open} dayHref={dayHref} />
      ) : (
        <>
          <div className="hidden md:block">
            <TimeGrid columns={columns} byDay={byDay} gridStart={gridStart} gridEnd={gridEnd} onOpen={open} dayHref={dayHref} />
          </div>
          <div className="md:hidden">
            <AgendaList columns={columns} byDay={byDay} onOpen={open} />
          </div>
        </>
      )}
      <AppointmentDetailDialog appt={selected} onClose={close} canManage={canManage} branches={branches} />
    </>
  );
}

function TimeGrid({
  columns,
  byDay,
  gridStart,
  gridEnd,
  onOpen,
  dayHref,
}: {
  columns: DayColumn[];
  byDay: Map<string, ApptView[]>;
  gridStart: number;
  gridEnd: number;
  onOpen: (id: string) => void;
  dayHref: Record<string, string>;
}) {
  const hours: number[] = [];
  for (let m = gridStart; m < gridEnd; m += 60) hours.push(m);
  const height = (gridEnd - gridStart) * PX_PER_MIN;
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
      const h = Number(parts.find((p) => p.type === "hour")?.value);
      const m = Number(parts.find((p) => p.type === "minute")?.value);
      setNowMin(h * 60 + m);
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, []);
  const single = columns.length === 1;

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <div style={{ minWidth: single ? undefined : 860 }}>
          <div className="grid border-b bg-muted/40" style={{ gridTemplateColumns: `4rem repeat(${columns.length}, minmax(0, 1fr))` }}>
            <div />
            {columns.map((c) => (
              <Link
                key={c.dateKey}
                href={dayHref[c.dateKey]}
                className={cn("border-l px-2 py-2.5 text-center hover:bg-accent", c.isToday && "bg-brand-ice")}
              >
                <span className="block text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">{c.short}</span>
                <span className={cn("font-display text-lg font-bold", c.isToday ? "text-brand-blue" : "text-brand-ink")}>{c.dayNum}</span>
                <span className="ml-1 text-[0.68rem] text-muted-foreground">({byDay.get(c.dateKey)?.length ?? 0})</span>
              </Link>
            ))}
          </div>
          <div className="grid" style={{ gridTemplateColumns: `4rem repeat(${columns.length}, minmax(0, 1fr))` }}>
            <div className="relative" style={{ height }}>
              {hours.map((m) => (
                <span key={m} className="absolute right-2 -translate-y-1/2 text-[0.68rem] tabular text-muted-foreground" style={{ top: (m - gridStart) * PX_PER_MIN }}>
                  {m === gridStart ? "" : `${String(m / 60).padStart(2, "0")}:00`}
                </span>
              ))}
            </div>
            {columns.map((c) => {
              const laid = layoutDay(byDay.get(c.dateKey) ?? []);
              return (
                <div key={c.dateKey} className={cn("relative border-l", c.isToday && "bg-brand-ice/30")} style={{ height }}>
                  {hours.map((m) => (
                    <div key={m} className="absolute inset-x-0 border-t border-border/60" style={{ top: (m - gridStart) * PX_PER_MIN }} />
                  ))}
                  {hours.map((m) => (
                    <div key={`h${m}`} className="absolute inset-x-0 border-t border-dashed border-border/40" style={{ top: (m + 30 - gridStart) * PX_PER_MIN }} />
                  ))}
                  {c.isToday && nowMin !== null && nowMin >= gridStart && nowMin <= gridEnd ? (
                    <div className="absolute inset-x-0 z-10 border-t-2 border-brand-coral" style={{ top: (nowMin - gridStart) * PX_PER_MIN }} aria-hidden>
                      <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-brand-coral" />
                    </div>
                  ) : null}
                  {laid.map(({ item, col, cols }) => {
                    const top = (item.startMin - gridStart) * PX_PER_MIN;
                    const h = Math.max(item.durationMin * PX_PER_MIN - 2, 22);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpen(item.id)}
                        className={cn(
                          "absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-[0.7rem] leading-tight shadow-sm transition hover:z-20 hover:shadow-pop focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          STATUS_BLOCK[item.status],
                        )}
                        style={{ top: top + 1, height: h, left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)` }}
                        title={`${item.time} · ${item.patientName} · ${APPOINTMENT_STATUS[item.status].label}`}
                      >
                        <span className="flex items-center gap-1 font-semibold">
                          {item.type === "HOME" ? <Home className="h-3 w-3 shrink-0" aria-label="A domicilio" /> : null}
                          <span className="truncate">{item.patientName}</span>
                        </span>
                        {h > 30 ? (
                          <span className="block truncate opacity-80">
                            {item.time} · {item.studies[0]?.name ?? "Sin estudios"}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

function AgendaList({ columns, byDay, onOpen }: { columns: DayColumn[]; byDay: Map<string, ApptView[]>; onOpen: (id: string) => void }) {
  const days = columns.filter((c) => (byDay.get(c.dateKey)?.length ?? 0) > 0);
  if (!days.length) return <Card><EmptyState icon={CalendarX2} title="Sin citas en este periodo" /></Card>;
  return (
    <div className="grid gap-4">
      {days.map((c) => (
        <Card key={c.dateKey} className="overflow-hidden">
          <h3 className={cn("border-b px-4 py-2.5 font-display text-sm font-bold", c.isToday ? "bg-brand-ice text-brand-blue" : "bg-muted/50 text-brand-ink")}>
            {c.isToday ? "Hoy · " : ""}
            {c.label}
          </h3>
          <ul className="divide-y">
            {(byDay.get(c.dateKey) ?? []).map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => onOpen(a.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50">
                  <span className={cn("w-14 shrink-0 rounded-md border-l-[3px] px-2 py-1 text-center font-display text-sm font-bold tabular", STATUS_BLOCK[a.status])}>{a.time}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-brand-ink">{a.patientName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.type === "HOME" ? "A domicilio · " : ""}
                      {a.studies.map((s) => s.name).join(", ") || "Sin estudios"}
                    </span>
                  </span>
                  <StatusBadge value={a.status} map={APPOINTMENT_STATUS} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function MonthGrid({
  columns,
  byDay,
  onOpen,
  dayHref,
}: {
  columns: DayColumn[];
  byDay: Map<string, ApptView[]>;
  onOpen: (id: string) => void;
  dayHref: Record<string, string>;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {columns.map((c) => {
          const list = byDay.get(c.dateKey) ?? [];
          const active = list.filter((a) => a.status !== "CANCELLED");
          return (
            <div key={c.dateKey} className={cn("min-h-[4.5rem] border-b border-r p-1 sm:min-h-[7.5rem] sm:p-1.5", !c.inMonth && "bg-muted/40", c.isToday && "bg-brand-ice/50")}>
              <div className="flex items-center justify-between">
                <Link
                  href={dayHref[c.dateKey]}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold hover:bg-accent",
                    c.isToday ? "bg-brand-blue text-white hover:bg-brand-navy" : c.inMonth ? "text-brand-ink" : "text-muted-foreground",
                  )}
                  aria-label={`Ver ${c.label}`}
                >
                  {c.dayNum}
                </Link>
                {list.length ? (
                  <Link href={dayHref[c.dateKey]} className="rounded-full bg-brand-blue/10 px-1.5 text-[0.65rem] font-bold tabular text-brand-blue">
                    {active.length}
                  </Link>
                ) : null}
              </div>
              <ul className="mt-1 hidden gap-0.5 sm:grid">
                {list.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(a.id)}
                      className={cn("w-full truncate rounded border-l-2 px-1 py-0.5 text-left text-[0.65rem] leading-tight", STATUS_BLOCK[a.status])}
                    >
                      <span className="tabular">{a.time}</span> {a.patientName.split(" ")[0]}
                    </button>
                  </li>
                ))}
                {list.length > 3 ? (
                  <li>
                    <Link href={dayHref[c.dateKey]} className="text-[0.65rem] font-semibold text-brand-blue hover:underline">
                      +{list.length - 3} más
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
