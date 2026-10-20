import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage } from "@/lib/auth/guard";
import { formatDate, formatDateTime } from "@/lib/dates";
import { CONTACT_SOURCE, QUOTE_STATUS } from "@/lib/labels";
import { bpsToPercent, formatMoney } from "@/lib/money";
import { fullName } from "@/lib/utils";
import { QUOTE_TRANSITIONS } from "@/lib/validation/quote";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { QuoteActions } from "./quote-actions";

export const metadata: Metadata = { title: "Cotización" };

export default async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("quotes.view");
  const { id } = await params;
  const quote = await db.quote.findFirst({
    where: { id, branchId: { in: user.branchIds } },
    include: { items: true, patient: true, branch: true, responsible: true, promotion: true, order: true },
  });
  if (!quote) notFound();

  const name = quote.patient ? fullName(quote.patient) : quote.prospectName ?? "Prospecto";
  const phone = quote.patient?.phone ?? quote.prospectPhone ?? null;
  const expired = quote.validUntil < new Date();
  const transitions = (QUOTE_TRANSITIONS[quote.status] ?? []).filter((t) => !(expired && t !== "REJECTED"));
  const convertBlocker = !quote.patientId
    ? "Registra al prospecto como paciente para convertir la cotización en orden."
    : ["REJECTED", "EXPIRED"].includes(quote.status) || expired
      ? "La cotización está vencida o rechazada; genera una nueva."
      : null;

  const message = [
    `Hola ${name.split(" ")[0]}, te compartimos tu cotización ${quote.folio} de IBANOCHE — Laboratorio de Análisis Clínicos:`,
    "",
    ...quote.items.map((i) => `• ${i.studyName}${i.quantity > 1 ? ` x${i.quantity}` : ""}: ${formatMoney(i.lineTotalCents)}`),
    "",
    quote.discountCents > 0 ? `Descuento: −${formatMoney(quote.discountCents)}` : null,
    `Total: ${formatMoney(quote.totalCents)}`,
    `Vigencia: hasta el ${formatDate(quote.validUntil)}.`,
    "",
    "Con gusto agendamos tu cita. Las indicaciones de preparación te las confirma nuestro personal.",
  ]
    .filter((l) => l !== null)
    .join("\n");

  return (
    <div className="grid grid-cols-1 gap-6">
      <Link href="/cotizaciones" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-brand-blue">
        <ArrowLeft className="h-4 w-4" /> Cotizaciones
      </Link>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-brand-ink">{quote.folio}</h1>
          <StatusBadge value={quote.status} map={QUOTE_STATUS} />
        </div>
        <QuoteActions
          quoteId={quote.id}
          status={quote.status}
          transitions={transitions}
          canManage={can(user, "quotes.manage")}
          canConvert={can(user, "orders.manage")}
          hasOrder={quote.order ? { id: quote.order.id, folio: quote.order.folio } : null}
          convertBlocker={convertBlocker}
          whatsapp={{ phone, consent: quote.patient ? quote.patient.contactConsent : null, message }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_20rem]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Estudios cotizados</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="flex items-start gap-2 rounded-lg bg-brand-ice p-3 text-xs text-brand-blue">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              Precios conservados del {formatDateTime(quote.issuedAt)}. Un cambio de tarifa posterior no modifica esta cotización.
            </p>
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
                {quote.items.map((i) => (
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
                <dd className="tabular">{formatMoney(quote.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Descuento ({bpsToPercent(quote.discountBps)})</dt>
                <dd className="tabular text-brand-coral">−{formatMoney(quote.discountCents)}</dd>
              </div>
              <div className="flex justify-between border-t pt-2 font-display text-lg font-bold text-brand-ink">
                <dt>Total</dt>
                <dd className="tabular">{formatMoney(quote.totalCents)}</dd>
              </div>
            </dl>
            {quote.notes ? <p className="rounded-lg bg-muted p-3 text-sm">{quote.notes}</p> : null}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{quote.patient ? "Paciente" : "Prospecto"}</dt>
                <dd className="font-semibold">
                  {quote.patient ? (
                    <Link href={`/pacientes/${quote.patient.id}`} className="text-brand-blue hover:underline">
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </dd>
                {phone ? <dd className="text-xs text-muted-foreground">{phone}</dd> : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Fecha</dt>
                  <dd className="font-semibold">{formatDate(quote.issuedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Vigencia</dt>
                  <dd className={expired ? "font-semibold text-brand-coral" : "font-semibold"}>{formatDate(quote.validUntil)}</dd>
                </div>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Sucursal</dt>
                <dd className="font-semibold">{quote.branch.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Responsable</dt>
                <dd className="font-semibold">{quote.responsible?.name ?? "Emilia / sistema"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Origen</dt>
                <dd className="font-semibold">{CONTACT_SOURCE[quote.source]}</dd>
              </div>
              {quote.promotion ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Promoción</dt>
                  <dd className="font-semibold">{quote.promotion.name}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
