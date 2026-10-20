import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Receipt, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage } from "@/lib/auth/guard";
import { formatDate, formatDateTime } from "@/lib/dates";
import { ORDER_STATUS, PAYMENT_KIND, PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/labels";
import { bpsToPercent, formatMoney } from "@/lib/money";
import { fullName } from "@/lib/utils";
import { ORDER_TRANSITIONS } from "@/server/services/order-rules";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { InvoiceRequestForm, OrderNoteForm, OrderStatusActions, VoidPaymentButton } from "./order-actions";

export const metadata: Metadata = { title: "Orden" };

const EVENT_LABEL: Record<string, string> = {
  created: "Orden creada",
  created_from_quote: "Creada desde cotización",
  status_change: "Cambio de estado",
  payment: "Pago registrado",
  advance: "Anticipo registrado",
  payment_voided: "Cobro anulado",
  note: "Nota administrativa",
  invoice_requested: "Solicitud de factura",
};

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("orders.view");
  const { id } = await params;
  const order = await db.order.findFirst({
    where: { id, branchId: { in: user.branchIds } },
    include: {
      patient: true,
      branch: true,
      responsible: true,
      quote: true,
      promotion: true,
      items: true,
      payments: { include: { receivedBy: true }, orderBy: { createdAt: "asc" } },
      events: { include: { user: true }, orderBy: { createdAt: "desc" } },
      invoiceRequest: true,
    },
  });
  if (!order) notFound();

  const balance = order.status === "CANCELLED" ? 0 : order.totalCents - order.paidCents;
  const canManage = can(user, "orders.manage");
  // Los pagos se controlan en caja; desde aquí solo los estados administrativos.
  const transitions = canManage ? (ORDER_TRANSITIONS[order.status] ?? []).filter((t) => t !== "PAID") : [];
  const groups = [...new Set(order.payments.map((p) => p.groupId))];

  return (
    <div className="grid grid-cols-1 gap-6">
      <Link href="/ordenes" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-brand-blue">
        <ArrowLeft className="h-4 w-4" /> Órdenes
      </Link>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-brand-ink">{order.folio}</h1>
          <StatusBadge value={order.status} map={ORDER_STATUS} />
          <StatusBadge value={order.paymentStatus} map={PAYMENT_STATUS} />
        </div>
        <div className="flex flex-wrap gap-2">
          {balance > 0 && can(user, "pos.charge") && order.status !== "DRAFT" ? (
            <Link href={`/caja?orderId=${order.id}`} className={buttonVariants({ variant: "secondary" })}>
              <Wallet /> Cobrar {formatMoney(balance)}
            </Link>
          ) : null}
          <OrderStatusActions orderId={order.id} transitions={transitions} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Estudios solicitados</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Estudio</TableHead>
                    <TableHead className="hidden sm:table-cell">Código</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-semibold">{i.studyName}</TableCell>
                      <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">{i.studyCode}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular">{formatMoney(i.unitPriceCents)}</TableCell>
                      <TableCell className="text-center tabular">{i.quantity}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold tabular">{formatMoney(i.lineTotalCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <dl className="ml-auto grid w-full max-w-xs gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular">{formatMoney(order.subtotalCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Descuento ({bpsToPercent(order.discountBps)})</dt>
                  <dd className="tabular text-brand-coral">−{formatMoney(order.discountCents)}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 font-display text-base font-bold text-brand-ink">
                  <dt>Total</dt>
                  <dd className="tabular">{formatMoney(order.totalCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Pagado</dt>
                  <dd className="tabular text-brand-green">{formatMoney(order.paidCents)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>Saldo pendiente</dt>
                  <dd className={balance > 0 ? "tabular text-brand-coral" : "tabular"}>{formatMoney(balance)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Pagos</CardTitle>
              {groups.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((g, i) => (
                    <Link key={g} href={`/caja/recibo/${g}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      <Receipt /> Comprobante {groups.length > 1 ? i + 1 : ""}
                    </Link>
                  ))}
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              {order.payments.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Recibo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.payments.map((p) => (
                      <TableRow key={p.id} className={p.status === "VOIDED" ? "opacity-60" : ""}>
                        <TableCell className="font-mono text-xs">{p.folio}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateTime(p.createdAt)}</TableCell>
                        <TableCell>
                          {PAYMENT_METHOD[p.method]}
                          {p.reference ? <span className="block text-xs text-muted-foreground">Ref. {p.reference}</span> : null}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{p.status === "VOIDED" ? <Badge tone="coral">Anulado</Badge> : PAYMENT_KIND[p.kind]}</TableCell>
                        <TableCell className={p.status === "VOIDED" ? "text-right tabular line-through" : "text-right tabular"}>{formatMoney(p.amountCents)}</TableCell>
                        <TableCell className="text-right">
                          {p.status === "REGISTERED" && can(user, "pos.void") && order.status !== "COMPLETED" ? <VoidPaymentButton paymentId={p.id} folio={p.folio} /> : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={Wallet} title="Sin pagos registrados" description="Los cobros se registran en Caja / POS." className="py-8" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bitácora administrativa</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {canManage ? <OrderNoteForm orderId={order.id} /> : null}
              <ol className="relative grid gap-4 border-l border-border pl-5">
                {order.events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[1.42rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-brand-turquoise" aria-hidden />
                    <p className="text-sm font-semibold text-brand-ink">
                      {EVENT_LABEL[e.type] ?? e.type}
                      {e.fromStatus && e.toStatus ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {ORDER_STATUS[e.fromStatus]?.label} → {ORDER_STATUS[e.toStatus]?.label}
                        </span>
                      ) : null}
                    </p>
                    {e.note ? <p className="text-sm text-brand-text">{e.note}</p> : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {e.user?.name ?? "Sistema"} · {formatDateTime(e.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Paciente</dt>
                  <dd>
                    <Link href={`/pacientes/${order.patient.id}`} className="font-semibold text-brand-blue hover:underline">
                      {fullName(order.patient)}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{order.patient.folio}</span>
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Fecha</dt>
                    <dd className="font-semibold">{formatDate(order.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Sucursal</dt>
                    <dd className="font-semibold">{order.branch.name}</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Responsable</dt>
                  <dd className="font-semibold">{order.responsible?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Cotización vinculada</dt>
                  <dd className="font-semibold">
                    {order.quote ? (
                      <Link href={`/cotizaciones/${order.quote.id}`} className="inline-flex items-center gap-1 text-brand-blue hover:underline">
                        <FileText className="h-3.5 w-3.5" /> {order.quote.folio}
                      </Link>
                    ) : (
                      "Sin cotización"
                    )}
                  </dd>
                </div>
                {order.promotion ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Promoción</dt>
                    <dd className="font-semibold">{order.promotion.name}</dd>
                  </div>
                ) : null}
                {order.notes ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Notas</dt>
                    <dd>{order.notes}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facturación</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {order.invoiceRequest ? (
                <>
                  <Badge tone={order.invoiceRequest.status === "ISSUED" ? "green" : "amber"} dot className="w-fit">
                    {order.invoiceRequest.status === "ISSUED" ? "Factura emitida" : order.invoiceRequest.status === "CANCELLED" ? "Cancelada" : "Solicitud pendiente"}
                  </Badge>
                  <dl className="grid gap-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">RFC</dt>
                      <dd className="font-mono font-semibold">{order.invoiceRequest.rfc}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Razón social</dt>
                      <dd className="text-right font-semibold">{order.invoiceRequest.legalName}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Uso CFDI</dt>
                      <dd className="font-semibold">{order.invoiceRequest.cfdiUse}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Correo</dt>
                      <dd className="break-all font-semibold">{order.invoiceRequest.email}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-muted-foreground">Solicitud registrada; la factura se emite fuera del CRM.</p>
                </>
              ) : canManage && order.paidCents > 0 && order.status !== "CANCELLED" ? (
                <>
                  <p className="text-xs text-muted-foreground">Registra los datos fiscales. La factura se emite fuera del CRM.</p>
                  <InvoiceRequestForm orderId={order.id} defaultEmail={order.patient.email} />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">La solicitud de factura se habilita cuando la orden tiene pagos registrados.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
