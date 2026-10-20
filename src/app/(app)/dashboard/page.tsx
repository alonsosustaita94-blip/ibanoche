import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  ClipboardList,
  FileClock,
  MessageCircleHeart,
  Target,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { db } from "@/lib/db";
import { requirePage, resolveBranchFilter } from "@/lib/auth/guard";
import { addDays, formatDate, formatTime, localDateKey, parsePeriod, periodRange, PERIOD_LABELS, zonedDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { APPOINTMENT_STATUS, OPPORTUNITY_STAGE, ORDER_STATUS, PATIENT_TYPE, QUOTE_STATUS } from "@/lib/labels";
import { fullName } from "@/lib/utils";
import {
  appointmentsInRange,
  kpis,
  monthlyRevenue,
  ordersByStatus,
  patientsByType,
  previousRange,
  salesByBranch,
  topStudies,
} from "@/server/services/metrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Donut, HorizontalBars, RevenueBars } from "@/components/charts/charts";
import { KpiCard, pctChange } from "@/components/shared/kpi-card";
import { FilterSelect } from "@/components/shared/filter-select";
import { PeriodFilter } from "@/components/shared/period-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { EmiliaCard } from "./emilia-card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string; branch?: string }> }) {
  const user = await requirePage("dashboard.view");
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const branchIds = resolveBranchFilter(user, sp.branch);
  const range = periodRange(period);
  const prev = previousRange(range);
  const today = localDateKey(new Date());
  const todayRange = { from: zonedDateTime(today, "00:00"), to: zonedDateTime(addDays(today, 1), "00:00") };

  const [current, previous, apptsToday, revenueSeries, byType, byStatus, byBranch, studies, upcoming, recentOrders, pendingQuotes, activity, notifications, branches] =
    await Promise.all([
      kpis(branchIds, range),
      kpis(branchIds, prev),
      appointmentsInRange(branchIds, todayRange),
      monthlyRevenue(branchIds, 6),
      patientsByType(branchIds),
      ordersByStatus(branchIds, range),
      salesByBranch(branchIds, range),
      topStudies(branchIds, range),
      db.appointment.findMany({
        where: { branchId: { in: branchIds }, startsAt: { gte: new Date() }, status: { in: ["PENDING", "CONFIRMED"] } },
        include: { patient: true, branch: true },
        orderBy: { startsAt: "asc" },
        take: 6,
      }),
      db.order.findMany({
        where: { branchId: { in: branchIds } },
        include: { patient: true, _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.quote.findMany({
        where: { branchId: { in: branchIds }, status: { in: ["DRAFT", "SENT", "FOLLOW_UP"] } },
        include: { patient: true },
        orderBy: { validUntil: "asc" },
        take: 5,
      }),
      db.opportunity.findMany({
        where: { branchId: { in: branchIds } },
        include: { owner: true },
        orderBy: { stageChangedAt: "desc" },
        take: 5,
      }),
      db.notification.findMany({
        where: { OR: [{ userId: user.id }, { userId: null, branchId: { in: user.branchIds } }] },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" } }),
    ]);

  const firstName = user.name.split(" ")[0];
  const statusOrder = ["COMPLETED", "IN_PROGRESS", "PAID", "CONFIRMED", "DRAFT", "CANCELLED"];

  return (
    <div className="grid gap-6 [&_.grid>*]:min-w-0 [&>*]:min-w-0">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-ink">¡Hola, {firstName}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">Aquí está la visión general de tu laboratorio · {PERIOD_LABELS[period]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {branches.length > 1 ? (
            <FilterSelect
              param="branch"
              label="Filtrar por sucursal"
              allLabel={user.activeBranchId ? "Sucursal activa" : "Todas mis sucursales"}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              className="h-9 text-xs font-semibold sm:w-52"
            />
          ) : null}
          <PeriodFilter value={period} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="Pacientes atendidos" value={current.attended.toLocaleString("es-MX")} icon={Users} delta={pctChange(current.attended, previous.attended)} />
          <KpiCard label="Ingresos" value={formatMoney(current.revenue)} icon={Wallet} tone="turquoise" delta={pctChange(current.revenue, previous.revenue)} />
          <KpiCard label="Órdenes registradas" value={current.orders.toLocaleString("es-MX")} icon={ClipboardList} delta={pctChange(current.orders, previous.orders)} />
          <KpiCard label="Nuevos pacientes" value={current.newPatients.toLocaleString("es-MX")} icon={UserPlus} tone="coral" delta={pctChange(current.newPatients, previous.newPatients)} />
          <KpiCard label="Citas del día" value={String(apptsToday)} icon={CalendarCheck} tone="turquoise" />
          <KpiCard label="Cotizaciones pendientes" value={String(current.pendingQuotes)} icon={FileClock} tone="amber" />
          <KpiCard label="Oportunidades abiertas" value={String(current.openOpps)} icon={Target} />
          <KpiCard label="Conversaciones con Emilia" value={String(current.emiliaConvs)} icon={MessageCircleHeart} tone="coral" hint="Simuladas · sin IA conectada" />
        </div>
        <EmiliaCard />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Ingresos mensuales</CardTitle>
              <CardDescription>Cobros registrados, últimos 6 meses</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueBars data={revenueSeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pacientes por tipo</CardTitle>
            <CardDescription>Pacientes activos</CardDescription>
          </CardHeader>
          <CardContent>
            {byType.length ? (
              <Donut centerLabel="pacientes" data={byType.map((x) => ({ name: PATIENT_TYPE[x.key] ?? x.key, value: x.value }))} />
            ) : (
              <EmptyState title="Sin pacientes" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Órdenes por estado</CardTitle>
            <CardDescription>{PERIOD_LABELS[period]}</CardDescription>
          </CardHeader>
          <CardContent>
            {byStatus.length ? (
              <Donut
                height={170}
                centerLabel="órdenes"
                data={[...byStatus]
                  .sort((a, b) => statusOrder.indexOf(a.key) - statusOrder.indexOf(b.key))
                  .map((x) => ({ name: ORDER_STATUS[x.key]?.label ?? x.key, value: x.value }))}
              />
            ) : (
              <EmptyState title="Sin órdenes en el periodo" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ventas por sucursal</CardTitle>
            <CardDescription>{PERIOD_LABELS[period]}</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBars data={byBranch.map((b) => ({ name: b.name, value: b.cents }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estudios más vendidos</CardTitle>
            <CardDescription>Por número de estudios, {PERIOD_LABELS[period].toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            {studies.length ? (
              <ol className="grid gap-2.5">
                {studies.map((s, i) => {
                  const max = studies[0].quantity || 1;
                  return (
                    <li key={s.name} className="grid gap-1">
                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="truncate font-semibold text-brand-ink">
                          {i + 1}. {s.name}
                        </span>
                        <span className="shrink-0 tabular text-muted-foreground">{s.quantity}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div className="h-1.5 rounded-full bg-gradient-to-r from-brand-blue to-brand-turquoise" style={{ width: `${(s.quantity / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState title="Sin ventas en el periodo" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Órdenes recientes</CardTitle>
            <Link href="/ordenes" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[0.68rem] uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2 font-semibold">Folio</th>
                    <th className="px-3 py-2 font-semibold">Paciente</th>
                    <th className="px-3 py-2 font-semibold">Estudios</th>
                    <th className="px-3 py-2 font-semibold">Total</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-5 py-2.5">
                        <Link href={`/ordenes/${o.id}`} className="font-semibold text-brand-blue hover:underline">
                          {o.folio}
                        </Link>
                      </td>
                      <td className="max-w-[12rem] truncate px-3 py-2.5">{fullName(o.patient)}</td>
                      <td className="px-3 py-2.5 tabular text-muted-foreground">{o._count.items}</td>
                      <td className="px-3 py-2.5 tabular">{formatMoney(o.totalCents)}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge value={o.status} map={ORDER_STATUS} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Próximas citas</CardTitle>
            <Link href="/agenda" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Agenda
            </Link>
          </CardHeader>
          <CardContent>
            {upcoming.length ? (
              <ul className="grid gap-3">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <span className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-brand-ice py-1.5 text-brand-blue">
                      <span className="font-display text-sm font-bold tabular">{formatTime(a.startsAt)}</span>
                      <span className="text-[0.6rem] font-semibold uppercase">{formatDate(a.startsAt).slice(0, 6)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-brand-ink">{fullName(a.patient)}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.branch.name}</span>
                    </span>
                    <StatusBadge value={a.status} map={APPOINTMENT_STATUS} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={CalendarCheck} title="Sin citas próximas" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Cotizaciones pendientes</CardTitle>
            <Link href="/cotizaciones" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Ver
            </Link>
          </CardHeader>
          <CardContent>
            {pendingQuotes.length ? (
              <ul className="grid gap-3">
                {pendingQuotes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <Link href={`/cotizaciones/${q.id}`} className="block truncate text-sm font-semibold text-brand-ink hover:text-brand-blue">
                        {q.patient ? fullName(q.patient) : q.prospectName}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {q.folio} · vence {formatDate(q.validUntil)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular">{formatMoney(q.totalCents)}</span>
                      <StatusBadge value={q.status} map={QUOTE_STATUS} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Sin cotizaciones pendientes" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Actividad comercial</CardTitle>
            <Link href="/oportunidades" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Embudo
            </Link>
          </CardHeader>
          <CardContent>
            {activity.length ? (
              <ul className="grid gap-3">
                {activity.map((o) => (
                  <li key={o.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-brand-ink">{o.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {o.prospectName} · {formatMoney(o.estimatedCents)}
                      </span>
                    </span>
                    <StatusBadge value={o.stage} map={OPPORTUNITY_STAGE} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Target} title="Sin actividad comercial" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notificaciones importantes</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length ? (
              <ul className="grid gap-3">
                {notifications.map((n) => (
                  <li key={n.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-ice text-brand-blue">
                      <Bell className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      {n.link ? (
                        <Link href={n.link} className="block text-sm font-semibold text-brand-ink hover:text-brand-blue">
                          {n.title}
                        </Link>
                      ) : (
                        <span className="block text-sm font-semibold text-brand-ink">{n.title}</span>
                      )}
                      <span className="block text-xs text-muted-foreground">{n.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Bell} title="Sin notificaciones" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
