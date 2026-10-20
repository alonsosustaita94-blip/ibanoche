import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { db } from "@/lib/db";
import { requirePage } from "@/lib/auth/guard";
import { formatDateTime } from "@/lib/dates";
import { PAYMENT_KIND, PAYMENT_METHOD } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { fullName } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/layout/brand";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Comprobante" };

export default async function ReceiptPage({ params }: { params: Promise<{ groupId: string }> }) {
  const user = await requirePage("orders.view");
  const { groupId } = await params;
  const payments = await db.payment.findMany({
    where: { groupId, branchId: { in: user.branchIds } },
    include: { receivedBy: true },
    orderBy: { createdAt: "asc" },
  });
  if (!payments.length) notFound();
  const order = await db.order.findUniqueOrThrow({ where: { id: payments[0].orderId }, include: { items: true, patient: true, branch: true } });
  const groupTotal = payments.filter((p) => p.status === "REGISTERED").reduce((a, p) => a + p.amountCents, 0);
  const balance = Math.max(0, order.totalCents - order.paidCents);
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || order.isDemo;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/caja" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-brand-blue">
          <ArrowLeft className="h-4 w-4" /> Caja
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/ordenes/${order.id}`} className={buttonVariants({ variant: "outline" })}>
            <FileCheck2 /> Solicitar factura
          </Link>
          <PrintButton />
          <Link href="/caja" className={buttonVariants()}>
            Nueva venta
          </Link>
        </div>
      </div>

      <Card className="mx-auto w-full max-w-xl p-6 sm:p-8 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b pb-5">
          <BrandMark />
          <div className="text-right">
            <p className="font-display text-sm font-bold text-brand-ink">Comprobante de pago</p>
            <p className="font-mono text-xs text-muted-foreground">{payments.map((p) => p.folio).join(" · ")}</p>
          </div>
        </div>
        {demo ? <p className="mt-4 rounded-md bg-brand-amberSoft px-3 py-2 text-center text-xs font-semibold text-brand-amber">Comprobante de demostración · sin validez fiscal</p> : null}
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Paciente</dt>
            <dd className="font-semibold">{fullName(order.patient)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Orden</dt>
            <dd className="font-semibold">{order.folio}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Fecha</dt>
            <dd className="font-semibold">{formatDateTime(payments[0].createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Sucursal</dt>
            <dd className="font-semibold">{order.branch.name}</dd>
          </div>
        </dl>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[0.68rem] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 font-semibold">Estudio</th>
              <th className="py-2 text-center font-semibold">Cant.</th>
              <th className="py-2 text-right font-semibold">Importe</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} className="border-b border-dashed">
                <td className="py-2">{i.studyName}</td>
                <td className="py-2 text-center tabular">{i.quantity}</td>
                <td className="py-2 text-right tabular">{formatMoney(i.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 grid max-w-xs gap-1.5 text-sm">
          {order.discountCents ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Descuento</dt>
              <dd className="tabular">−{formatMoney(order.discountCents)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between font-semibold">
            <dt>Total de la orden</dt>
            <dd className="tabular">{formatMoney(order.totalCents)}</dd>
          </div>
        </dl>

        <div className="mt-6 rounded-lg bg-muted/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pagos de este comprobante</p>
          <ul className="mt-2 grid gap-1.5 text-sm">
            {payments.map((p) => (
              <li key={p.id} className={`flex justify-between gap-3 ${p.status === "VOIDED" ? "line-through opacity-60" : ""}`}>
                <span>
                  {PAYMENT_METHOD[p.method]} · {PAYMENT_KIND[p.kind]}
                  {p.reference ? ` · Ref. ${p.reference}` : ""}
                  {p.status === "VOIDED" ? " (anulado)" : ""}
                </span>
                <span className="tabular">{formatMoney(p.amountCents)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t pt-2 font-display text-base font-bold text-brand-ink">
            <span>Pagado</span>
            <span className="tabular">{formatMoney(groupTotal)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted-foreground">Saldo pendiente de la orden</span>
            <span className={balance ? "font-semibold tabular text-brand-coral" : "tabular"}>{formatMoney(balance)}</span>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Atendió: {payments[0].receivedBy?.name ?? "—"} · Este comprobante no es una factura.</p>
      </Card>
    </div>
  );
}
