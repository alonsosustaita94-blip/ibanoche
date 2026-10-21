import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgePercent,
  CalendarCheck,
  CircleDollarSign,
  ClipboardList,
  Download,
  FileText,
  MessageCircleHeart,
  Receipt,
  Repeat,
  Target,
  Trophy,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage, resolveBranchFilter } from "@/lib/auth/guard";
import { formatDate, localDateKey } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  APPOINTMENT_STATUS,
  CONTACT_SOURCE,
  CONVERSATION_STATUS,
  OPPORTUNITY_STAGE,
  PATIENT_TYPE,
  PAYMENT_METHOD,
  QUOTE_STATUS,
} from "@/lib/labels";
import {
  commercialReport,
  dailyRevenue,
  emiliaReport,
  parseDateRange,
  patientsAppointmentsReport,
  salesReport,
  type ReportFilters,
} from "@/server/services/reports";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Donut, HorizontalBars, TrendArea } from "@/components/charts/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DateRangeFilter } from "./date-range";

export const metadata: Metadata = { title: "Reportes" };

type SP = { from?: string; to?: string; branch?: string; user?: string; category?: string; tab?: string };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)} %`);

function ExportLink({ report, query, label = "Exportar CSV" }: { report: string; query: string; label?: string }) {
  return (
    <a href={`/api/reportes/export?report=${report}&${query}`} className={buttonVariants({ variant: "outline", size: "sm" })} download>
      <Download /> {label}
    </a>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage("reports.view");
  const sp = await searchParams;
  const range = parseDateRange(sp.from, sp.to);
  const branchIds = resolveBranchFilter(user, sp.branch);

  const [branches, users, categories] = await Promise.all([
    db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { branches: { some: { branchId: { in: user.branchIds } } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.studyCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const userId = users.some((u) => u.id === sp.user) ? sp.user : undefined;
  const categoryId = categories.some((c) => c.id === sp.category) ? sp.category : undefined;
  const filters: ReportFilters = { from: range.from, to: range.to, branchIds, userId, categoryId };

  const [sales, daily, pa, commercial, emilia] = await Promise.all([
    salesReport(filters),
    dailyRevenue(filters, range.fromKey, range.toKey),
    patientsAppointmentsReport(filters),
    commercialReport(filters),
    emiliaReport(filters),
  ]);

  const canExport = can(user, "reports.export");
  const query = new URLSearchParams(
    Object.entries({ from: range.fromKey, to: range.toKey, branch: sp.branch, user: userId, category: categoryId }).filter(([, v]) => v) as [string, string][],
  ).toString();
  const tab = ["ventas", "pacientes", "comercial", "emilia"].includes(sp.tab ?? "") ? sp.tab! : "ventas";

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title="Reportes"
        description={`Indicadores calculados con los movimientos registrados · ${formatDate(range.from)} al ${formatDate(new Date(range.to.getTime() - 1))}`}
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <DateRangeFilter from={range.fromKey} to={range.toKey} today={localDateKey(new Date())} />
          <div className="flex flex-wrap gap-2">
            {branches.length > 1 ? (
              <FilterSelect param="branch" label="Sucursal" allLabel="Todas las sucursales" options={branches.map((b) => ({ value: b.id, label: b.name }))} />
            ) : null}
            <FilterSelect param="user" label="Usuario responsable" allLabel="Todos los usuarios" options={users.map((u) => ({ value: u.id, label: u.name }))} />
            <FilterSelect param="category" label="Tipo de servicio" allLabel="Todos los servicios" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          </div>
        </div>
      </Card>

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="pacientes">Pacientes y citas</TabsTrigger>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="emilia">Emilia</TabsTrigger>
        </TabsList>

        {/* ───────────── Ventas ───────────── */}
        <TabsContent value="ventas" className="grid gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Ingresos cobrados" value={formatMoney(sales.revenue)} icon={CircleDollarSign} tone="turquoise" />
            <KpiCard label="Órdenes" value={sales.ordersCount.toLocaleString("es-MX")} icon={ClipboardList} hint={`${sales.paidOrdersCount} pagadas`} />
            <KpiCard label="Ticket promedio" value={formatMoney(sales.averageTicket)} icon={Receipt} hint="Total de órdenes pagadas ÷ órdenes pagadas" />
            <KpiCard label="Descuentos aplicados" value={formatMoney(sales.discountCents)} icon={BadgePercent} tone="coral" hint={`${sales.discountCount} órdenes con descuento`} />
          </div>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Tendencia de ingresos</CardTitle>
                <CardDescription>Cobros registrados por día</CardDescription>
              </div>
              {canExport ? <ExportLink report="pagos" query={query} label="Exportar pagos" /> : null}
            </CardHeader>
            <CardContent>
              {daily.some((d) => d.value) ? <TrendArea data={daily} /> : <EmptyState title="Sin cobros en el periodo" />}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-[1.3fr_1fr_1fr]">
            <Card className="lg:col-span-2 2xl:col-span-1">
              <CardHeader>
                <CardTitle>Ingresos por categoría</CardTitle>
                <CardDescription>Importe de estudios en órdenes no canceladas</CardDescription>
              </CardHeader>
              <CardContent>
                {sales.byCategory.length ? (
                  <Donut money centerLabel="en estudios" height={170} data={sales.byCategory.map((c) => ({ name: c.name, value: c.cents }))} />
                ) : (
                  <EmptyState title="Sin ventas" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ventas por sucursal</CardTitle>
                <CardDescription>Cobros registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBars data={sales.byBranch.map((b) => ({ name: b.name, value: b.cents }))} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Métodos de pago</CardTitle>
                <CardDescription>Cobros por método</CardDescription>
              </CardHeader>
              <CardContent>
                {sales.byMethod.length ? (
                  <Donut money centerLabel="cobrado" height={170} data={sales.byMethod.map((m) => ({ name: PAYMENT_METHOD[m.method], value: m.cents }))} />
                ) : (
                  <EmptyState title="Sin cobros" />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Ventas por estudio</CardTitle>
                <CardDescription>Estudios en órdenes no canceladas del periodo</CardDescription>
              </div>
              {canExport ? (
                <div className="flex flex-wrap gap-2">
                  <ExportLink report="estudios" query={query} />
                  <ExportLink report="ventas" query={query} label="Exportar órdenes" />
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="px-0">
              {sales.byStudy.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-5">Estudio</TableHead>
                      <TableHead className="hidden sm:table-cell">Código</TableHead>
                      <TableHead className="hidden md:table-cell">Categoría</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="pr-5 text-right">Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.byStudy.slice(0, 15).map((s) => (
                      <TableRow key={s.code}>
                        <TableCell className="pl-5 font-semibold">{s.name}</TableCell>
                        <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">{s.code}</TableCell>
                        <TableCell className="hidden md:table-cell">{s.category}</TableCell>
                        <TableCell className="text-right tabular">{s.quantity}</TableCell>
                        <TableCell className="pr-5 text-right tabular">{formatMoney(s.cents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title="Sin estudios vendidos en el periodo" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────────── Pacientes y citas ───────────── */}
        <TabsContent value="pacientes" className="grid gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Pacientes nuevos" value={pa.newPatients.toLocaleString("es-MX")} icon={UserPlus} tone="coral" />
            <KpiCard label="Citas confirmadas" value={pa.confirmed.toLocaleString("es-MX")} icon={CalendarCheck} hint="Confirmadas, en atención o completadas" />
            <KpiCard label="Asistencia" value={pct(pa.attendanceRate)} icon={UserCheck} tone="turquoise" hint={`${pa.completed} completadas · ${pa.noShow} no asistieron`} />
            <KpiCard label="Citas a domicilio" value={pa.homeCount.toLocaleString("es-MX")} icon={Repeat} tone="amber" hint={`De ${pa.appointmentsTotal} citas`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Citas por estado</CardTitle>
                  <CardDescription>Citas con fecha en el periodo</CardDescription>
                </div>
                {canExport ? <ExportLink report="citas" query={query} label="CSV" /> : null}
              </CardHeader>
              <CardContent>
                {pa.byStatus.length ? (
                  <Donut height={170} centerLabel="citas" data={pa.byStatus.map((x) => ({ name: APPOINTMENT_STATUS[x.key]?.label ?? x.key, value: x.value }))} />
                ) : (
                  <EmptyState title="Sin citas" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Pacientes nuevos por tipo</CardTitle>
              </CardHeader>
              <CardContent>
                {pa.byType.length ? (
                  <Donut height={170} centerLabel="nuevos" data={pa.byType.map((x) => ({ name: PATIENT_TYPE[x.key] ?? x.key, value: x.value }))} />
                ) : (
                  <EmptyState title="Sin pacientes nuevos" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Fuente de contacto</CardTitle>
                <CardDescription>Pacientes nuevos por medio</CardDescription>
              </CardHeader>
              <CardContent>
                {pa.bySource.length ? (
                  <HorizontalBars money={false} data={pa.bySource.map((x) => ({ name: CONTACT_SOURCE[x.key] ?? x.key, value: x.value }))} />
                ) : (
                  <EmptyState title="Sin datos" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ───────────── Comercial ───────────── */}
        <TabsContent value="comercial" className="grid gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Cotizaciones emitidas" value={commercial.quotesCount.toLocaleString("es-MX")} icon={FileText} hint={formatMoney(commercial.quotesValue)} />
            <KpiCard label="Conversión de cotizaciones" value={pct(commercial.conversionRate)} icon={Repeat} tone="turquoise" hint="Aceptadas ÷ (aceptadas + rechazadas + vencidas)" />
            <KpiCard label="Oportunidades ganadas" value={commercial.wonCount.toLocaleString("es-MX")} icon={Trophy} tone="amber" hint={`${formatMoney(commercial.wonValue)} · tasa ${pct(commercial.winRate)}`} />
            <KpiCard label="Oportunidades abiertas" value={commercial.openCount.toLocaleString("es-MX")} icon={Target} hint={`Valor estimado ${formatMoney(commercial.openValue)}`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Cotizaciones por estado</CardTitle>
                  <CardDescription>Emitidas en el periodo</CardDescription>
                </div>
                {canExport ? <ExportLink report="cotizaciones" query={query} label="CSV" /> : null}
              </CardHeader>
              <CardContent className="px-0">
                {commercial.quotesByStatus.length ? (
                  <Table>
                    <TableBody>
                      {commercial.quotesByStatus.map((q) => (
                        <TableRow key={q.key}>
                          <TableCell className="pl-5">
                            <StatusBadge value={q.key} map={QUOTE_STATUS} />
                          </TableCell>
                          <TableCell className="text-right tabular">{q.value}</TableCell>
                          <TableCell className="pr-5 text-right tabular">{formatMoney(q.cents)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState title="Sin cotizaciones" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Embudo abierto</CardTitle>
                  <CardDescription>Oportunidades activas por etapa</CardDescription>
                </div>
                {canExport ? <ExportLink report="oportunidades" query={query} label="CSV" /> : null}
              </CardHeader>
              <CardContent>
                {commercial.byStage.length ? (
                  <HorizontalBars
                    data={["PROSPECT", "CONTACTED", "QUOTED", "FOLLOW_UP"]
                      .map((k) => commercial.byStage.find((s) => s.key === k))
                      .filter((s): s is NonNullable<typeof s> => Boolean(s))
                      .map((s) => ({ name: `${OPPORTUNITY_STAGE[s.key].label} (${s.value})`, value: s.cents }))}
                  />
                ) : (
                  <EmptyState title="Sin oportunidades abiertas" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ───────────── Emilia ───────────── */}
        <TabsContent value="emilia" className="grid gap-4">
          <p className="rounded-lg border border-dashed border-brand-amber/40 bg-brand-amberSoft px-4 py-2 text-xs text-brand-ink">
            Las conversaciones de demostración son simuladas. Las acciones por API cuentan solo llamadas reales a la API de Emilia.
          </p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Conversaciones" value={String(emilia.conversations)} icon={MessageCircleHeart} tone="coral" />
            <KpiCard label="Transferidas a personal" value={String(emilia.transferred)} icon={Repeat} />
            <KpiCard label="Cotizaciones por Emilia" value={String(emilia.quotes)} icon={FileText} tone="turquoise" />
            <KpiCard label="Citas y prospectos" value={`${emilia.appointments} · ${emilia.leads}`} icon={CalendarCheck} hint="Citas solicitadas · prospectos registrados" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Conversaciones por estado</CardTitle>
              </CardHeader>
              <CardContent>
                {emilia.byStatus.length ? (
                  <Donut height={170} centerLabel="conversaciones" data={emilia.byStatus.map((x) => ({ name: CONVERSATION_STATUS[x.key]?.label ?? x.key, value: x.value }))} />
                ) : (
                  <EmptyState title="Sin conversaciones en el periodo" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Acciones por API</CardTitle>
                <CardDescription>Registradas en la auditoría</CardDescription>
              </CardHeader>
              <CardContent>
                {emilia.apiActions.length ? (
                  <HorizontalBars money={false} data={emilia.apiActions.map((a) => ({ name: a.action, value: a.count }))} />
                ) : (
                  <EmptyState title="Sin llamadas a la API" description="Cuando Emilia esté conectada, aquí verás sus acciones." />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {!canExport ? (
        <p className="text-xs text-muted-foreground">
          Tu rol no permite exportar reportes. <Link href="/crm/perfil" className="font-semibold text-brand-blue hover:underline">Ver mis permisos</Link>
        </p>
      ) : null}
    </div>
  );
}
