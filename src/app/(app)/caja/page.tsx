import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Info, Receipt, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage } from "@/lib/auth/guard";
import { formatDateTime, formatTime, periodRange } from "@/lib/dates";
import { PAYMENT_KIND, PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { fullName } from "@/lib/utils";
import { cashSessionSummary } from "@/server/services/payments";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { loadActivePromotions } from "../cotizaciones/_components/data";
import { VoidPaymentButton } from "../ordenes/[id]/order-actions";
import { CloseCashDialog, OpenCashDialog } from "./cash-panel";
import { ChargeDialog } from "./charge-dialog";
import { PosSale } from "./pos-sale";

export const metadata: Metadata = { title: "Caja / POS" };

type SP = { branch?: string; orderId?: string; tab?: string };

export default async function CashPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage("pos.charge");
  const sp = await searchParams;

  const deepOrder = sp.orderId
    ? await db.order.findFirst({ where: { id: sp.orderId, branchId: { in: user.branchIds } }, include: { patient: true } })
    : null;
  const branchId =
    deepOrder?.branchId ??
    (sp.branch && user.branchIds.includes(sp.branch) ? sp.branch : null) ??
    user.activeBranchId ??
    (user.branchIds.length === 1 ? user.branchIds[0] : null);

  const branches = await db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" } });

  if (!branchId) {
    return (
      <div className="grid gap-6">
        <PageHeader title="Caja / POS" description="Elige la sucursal en la que vas a cobrar." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <Link key={b.id} href={`/caja?branch=${b.id}`} className="rounded-xl border bg-card p-5 shadow-card transition hover:border-brand-turquoise hover:shadow-pop">
              <Building2 className="h-5 w-5 text-brand-turquoise" />
              <p className="mt-3 font-display font-bold text-brand-ink">{b.name}</p>
              <p className="text-xs text-muted-foreground">Abrir caja de esta sucursal</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const branch = branches.find((b) => b.id === branchId)!;
  const today = periodRange("today");
  const month = periodRange("month");
  const [session, history, pending, todayPayments, promotions, salesToday, salesMonth] = await Promise.all([
    db.cashRegisterSession.findFirst({ where: { branchId, status: "OPEN" }, include: { openedBy: true } }),
    db.cashRegisterSession.findMany({ where: { branchId, status: "CLOSED" }, include: { closedBy: true }, orderBy: { closedAt: "desc" }, take: 6 }),
    db.order.findMany({
      where: { branchId, status: { in: ["CONFIRMED", "PAID", "IN_PROGRESS"] }, paymentStatus: { in: ["UNPAID", "PARTIAL"] } },
      include: { patient: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    db.payment.findMany({
      where: { branchId, createdAt: { gte: today.from, lt: today.to } },
      include: { order: { include: { patient: true } }, receivedBy: true, cashSession: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
    }),
    loadActivePromotions(),
    db.payment.groupBy({ by: ["branchId"], _sum: { amountCents: true }, _count: true, where: { branchId: { in: user.branchIds }, status: "REGISTERED", kind: { not: "REFUND" }, createdAt: { gte: today.from, lt: today.to } } }),
    db.payment.groupBy({ by: ["branchId"], _sum: { amountCents: true }, _count: true, where: { branchId: { in: user.branchIds }, status: "REGISTERED", kind: { not: "REFUND" }, createdAt: { gte: month.from, lt: month.to } } }),
  ]);
  const summary = session ? await cashSessionSummary(session.id) : null;
  const canSession = can(user, "pos.cashSession");
  const canSell = can(user, "orders.manage");
  const defaultTab = sp.orderId ? "pendientes" : sp.tab ?? (canSell ? "venta" : "pendientes");
  const sumOf = (rows: typeof salesToday, id: string) => rows.find((r) => r.branchId === id);

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title="Caja / POS"
        description={branch.name}
        actions={
          branches.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {branches.map((b) => (
                <Link key={b.id} href={`/caja?branch=${b.id}`} className={buttonVariants({ variant: b.id === branchId ? "soft" : "ghost", size: "sm" })}>
                  {b.name.replace("Sucursal ", "")}
                </Link>
              ))}
            </div>
          ) : null
        }
      />

      <p className="flex items-start gap-2 rounded-lg border border-brand-turquoise/30 bg-brand-mint px-4 py-3 text-sm text-brand-ink">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1f8f94]" />
        Sin pasarela de pago conectada: registra cobros realizados en efectivo, terminal o transferencia.
      </p>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          {session && summary ? (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-greenSoft text-brand-green">
                  <Wallet className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display font-bold text-brand-ink">Caja abierta</p>
                  <p className="text-xs text-muted-foreground">
                    Desde {formatDateTime(session.openedAt)} · {session.openedBy.name} · fondo {formatMoney(session.openingCents)}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-5">
                {(
                  [
                    ["Efectivo", summary.byMethod.CASH],
                    ["Tarjeta", summary.byMethod.CARD],
                    ["Transferencia", summary.byMethod.TRANSFER],
                    ["Total cobrado", summary.totalCents],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-semibold tabular">{formatMoney(v)}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-xs text-muted-foreground">Movimientos</dt>
                  <dd className="font-semibold tabular">{summary.count}</dd>
                </div>
              </dl>
              {canSession ? <CloseCashDialog sessionId={session.id} expectedCashCents={summary.expectedCashCents} /> : null}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blush text-brand-coral">
                  <Wallet className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display font-bold text-brand-ink">Caja cerrada</p>
                  <p className="text-xs text-muted-foreground">Abre la caja para registrar cobros en esta sucursal.</p>
                </div>
              </div>
              {canSession ? <OpenCashDialog branchId={branchId} branchName={branch.name} /> : <p className="text-sm text-muted-foreground">Pide a un usuario de caja que la abra.</p>}
            </>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {canSell ? <TabsTrigger value="venta">Nueva venta</TabsTrigger> : null}
          <TabsTrigger value="pendientes">Pagos pendientes ({pending.length})</TabsTrigger>
          <TabsTrigger value="transacciones">Transacciones de hoy ({todayPayments.length})</TabsTrigger>
          <TabsTrigger value="sucursales">Ventas por sucursal</TabsTrigger>
          <TabsTrigger value="cortes">Cortes</TabsTrigger>
        </TabsList>

        {canSell ? (
          <TabsContent value="venta">
            <PosSale branchId={branchId} roleMaxBps={user.maxDiscountBps} promotions={promotions} sessionOpen={!!session} />
          </TabsContent>
        ) : null}

        <TabsContent value="pendientes">
          <Card>
            {deepOrder && !pending.some((o) => o.id === deepOrder.id) ? (
              <p className="border-b p-4 text-sm text-muted-foreground">La orden {deepOrder.folio} no tiene saldo pendiente o no está confirmada.</p>
            ) : null}
            {pending.length === 0 ? (
              <EmptyState icon={Wallet} title="Sin pagos pendientes" description="Todas las órdenes confirmadas de esta sucursal están pagadas." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Orden</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Total</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Pagado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="hidden sm:table-cell">Pago</TableHead>
                    <TableHead className="pr-5 text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((o) => (
                    <TableRow key={o.id} data-state={o.id === deepOrder?.id ? "selected" : undefined}>
                      <TableCell className="pl-5">
                        <Link href={`/ordenes/${o.id}`} className="whitespace-nowrap font-semibold text-brand-blue hover:underline">
                          {o.folio}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate">{fullName(o.patient)}</TableCell>
                      <TableCell className="hidden text-right tabular md:table-cell">{formatMoney(o.totalCents)}</TableCell>
                      <TableCell className="hidden text-right tabular md:table-cell">{formatMoney(o.paidCents)}</TableCell>
                      <TableCell className="text-right font-semibold tabular text-brand-coral">{formatMoney(o.totalCents - o.paidCents)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <StatusBadge value={o.paymentStatus} map={PAYMENT_STATUS} />
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <ChargeDialog
                          order={{ id: o.id, folio: o.folio, patient: fullName(o.patient), dueCents: o.totalCents - o.paidCents }}
                          defaultOpen={o.id === deepOrder?.id}
                          disabled={!session}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="transacciones">
          <Card>
            {todayPayments.length === 0 ? (
              <EmptyState icon={Receipt} title="Sin cobros hoy" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Recibo</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead className="hidden lg:table-cell">Paciente</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="hidden xl:table-cell">Usuario</TableHead>
                    <TableHead className="pr-5 text-right">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayPayments.map((p) => (
                    <TableRow key={p.id} className={p.status === "VOIDED" ? "opacity-60" : ""}>
                      <TableCell className="pl-5">
                        <Link href={`/caja/recibo/${p.groupId}`} className="whitespace-nowrap font-mono text-xs text-brand-blue hover:underline">
                          {p.folio}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular">{formatTime(p.createdAt)}</TableCell>
                      <TableCell>
                        <Link href={`/ordenes/${p.orderId}`} className="whitespace-nowrap hover:text-brand-blue">
                          {p.order.folio}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden max-w-[12rem] truncate lg:table-cell">{fullName(p.order.patient)}</TableCell>
                      <TableCell>{PAYMENT_METHOD[p.method]}</TableCell>
                      <TableCell className="hidden md:table-cell">{p.status === "VOIDED" ? <Badge tone="coral">Anulado</Badge> : PAYMENT_KIND[p.kind]}</TableCell>
                      <TableCell className={p.status === "VOIDED" ? "text-right tabular line-through" : "text-right tabular"}>{formatMoney(p.amountCents)}</TableCell>
                      <TableCell className="hidden max-w-[10rem] truncate xl:table-cell">{p.receivedBy?.name ?? "—"}</TableCell>
                      <TableCell className="pr-5 text-right">
                        {p.status === "REGISTERED" && p.cashSession?.status !== "CLOSED" && can(user, "pos.void") ? <VoidPaymentButton paymentId={p.id} folio={p.folio} /> : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="sucursales">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por sucursal</CardTitle>
              <p className="text-xs text-muted-foreground">Cobros registrados (sin anulados ni devoluciones).</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right">Hoy</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Cobros hoy</TableHead>
                    <TableHead className="text-right">Este mes</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Cobros del mes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-semibold">{b.name}</TableCell>
                      <TableCell className="text-right tabular">{formatMoney(sumOf(salesToday, b.id)?._sum.amountCents ?? 0)}</TableCell>
                      <TableCell className="hidden text-right tabular sm:table-cell">{sumOf(salesToday, b.id)?._count ?? 0}</TableCell>
                      <TableCell className="text-right font-semibold tabular">{formatMoney(sumOf(salesMonth, b.id)?._sum.amountCents ?? 0)}</TableCell>
                      <TableCell className="hidden text-right tabular sm:table-cell">{sumOf(salesMonth, b.id)?._count ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cortes">
          <Card>
            {history.length === 0 ? (
              <EmptyState title="Sin cortes registrados" description="Los cortes de caja de esta sucursal aparecerán aquí." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Cierre</TableHead>
                    <TableHead className="hidden sm:table-cell">Cerró</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                    <TableHead className="pr-5 text-right">Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="whitespace-nowrap pl-5">{formatDateTime(h.closedAt)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{h.closedBy?.name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular">{formatMoney(h.expectedCashCents ?? 0)}</TableCell>
                      <TableCell className="text-right tabular">{formatMoney(h.countedCashCents ?? 0)}</TableCell>
                      <TableCell className={`pr-5 text-right font-semibold tabular ${(h.differenceCents ?? 0) === 0 ? "text-brand-green" : "text-brand-coral"}`}>
                        {formatMoney(h.differenceCents ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
