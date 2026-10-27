import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, FilePlus2, Mail, MapPin, MessageCircle, Phone, ShieldCheck, ShieldOff } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage } from "@/lib/auth/guard";
import { formatDate, formatDateTime } from "@/lib/dates";
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPE,
  CONTACT_SOURCE,
  INTERACTION_TYPE,
  ORDER_STATUS,
  PATIENT_STATUS,
  PATIENT_TYPE,
  PAYMENT_KIND,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  QUOTE_STATUS,
} from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { fullName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { PatientFormDialog } from "../patient-form";
import { InteractionForm } from "./interaction-form";
import { ResultsPanel } from "./results-panel";

export const metadata: Metadata = { title: "Perfil del paciente" };

export default async function PatientProfile({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("patients.view");
  const { id } = await params;
  const patient = await db.patient.findFirst({
    where: { id, branchId: { in: user.branchIds } },
    include: {
      branch: true,
      partner: true,
      appointments: { include: { branch: true, studies: { include: { study: true } } }, orderBy: { startsAt: "desc" }, take: 30 },
      quotes: { orderBy: { issuedAt: "desc" }, take: 30, include: { _count: { select: { items: true } } } },
      orders: { orderBy: { createdAt: "desc" }, take: 30, include: { payments: { orderBy: { createdAt: "desc" } }, _count: { select: { items: true } } } },
      interactions: { orderBy: { createdAt: "desc" }, take: 50, include: { user: true } },
      results: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, fileName: true, sizeBytes: true, note: true, createdAt: true, sentAt: true, uploadedBy: { select: { name: true } } },
      },
    },
  });
  if (!patient) notFound();

  const [branches, partners] = await Promise.all([
    db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" } }),
    db.partner.findMany({ where: { status: "ACTIVE" }, orderBy: { organization: "asc" }, select: { id: true, organization: true } }),
  ]);
  const payments = patient.orders.flatMap((o) => o.payments.map((p) => ({ ...p, orderFolio: o.folio })));
  const totalPaid = payments.filter((p) => p.status === "REGISTERED").reduce((a, p) => a + (p.kind === "REFUND" ? -p.amountCents : p.amountCents), 0);
  const balance = patient.orders.filter((o) => o.status !== "CANCELLED").reduce((a, o) => a + (o.totalCents - o.paidCents), 0);
  const name = fullName(patient);
  const age = patient.birthDate ? Math.floor((Date.now() - patient.birthDate.getTime()) / (365.25 * 86400000)) : null;

  return (
    <div className="grid gap-6">
      <Link href="/crm/pacientes" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-brand-blue">
        <ArrowLeft className="h-4 w-4" /> Pacientes
      </Link>

      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-blue via-[#1a68b3] to-brand-turquoise" />
        <div className="flex flex-col gap-4 px-6 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-end gap-4">
            <Avatar name={name} className="-mt-8 h-16 w-16 border-4 border-card text-lg shadow-card" />
            <div className="min-w-0 pt-3">
              <h1 className="font-display text-xl font-bold text-brand-ink">{name}</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono text-xs">{patient.folio}</span>
                <StatusBadge value={patient.status} map={PATIENT_STATUS} />
                <Badge tone="blue">{PATIENT_TYPE[patient.type]}</Badge>
                {patient.partner ? <Badge tone="turquoise">{patient.partner.organization}</Badge> : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {can(user, "appointments.manage") ? (
              <Link href={`/crm/agenda?nueva=1&patientId=${patient.id}`} className={buttonVariants({ variant: "soft" })}>
                <CalendarPlus /> Agendar cita
              </Link>
            ) : null}
            {can(user, "quotes.manage") ? (
              <Link href={`/crm/cotizaciones/nueva?patientId=${patient.id}`} className={buttonVariants({ variant: "secondary" })}>
                <FilePlus2 /> Nueva cotización
              </Link>
            ) : null}
            {can(user, "patients.manage") ? (
              <PatientFormDialog
                branches={branches}
                partners={partners}
                initial={{
                  ...patient,
                  birthDate: patient.birthDate ? patient.birthDate.toISOString().slice(0, 10) : null,
                }}
              />
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[20rem_1fr]">
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Contacto</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-brand-turquoise" /> {patient.phone ?? "Sin teléfono"}
              </p>
              <p className="flex items-center gap-2.5 break-all">
                <Mail className="h-4 w-4 shrink-0 text-brand-turquoise" /> {patient.email ?? "Sin correo"}
              </p>
              <p className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-brand-turquoise" /> {patient.branch.name}
              </p>
              <dl className="mt-1 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Fecha de nacimiento</dt>
                  <dd className="font-semibold text-brand-ink">
                    {formatDate(patient.birthDate)}
                    {age !== null ? ` (${age} años)` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Medio de contacto</dt>
                  <dd className="font-semibold text-brand-ink">{CONTACT_SOURCE[patient.source]}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Registro</dt>
                  <dd className="font-semibold text-brand-ink">{formatDate(patient.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Última visita</dt>
                  <dd className="font-semibold text-brand-ink">{formatDate(patient.lastVisitAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Preferencias y autorización</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {patient.contactConsent ? (
                <p className="flex items-start gap-2.5 rounded-lg bg-brand-greenSoft p-3 text-brand-green">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Autoriza contacto
                    <span className="block text-xs opacity-80">Desde {formatDate(patient.consentAt)}</span>
                  </span>
                </p>
              ) : (
                <p className="flex items-start gap-2.5 rounded-lg bg-brand-blush p-3 text-[#c23444]">
                  <ShieldOff className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Sin autorización de contacto
                    <span className="block text-xs opacity-80">No enviar mensajes que no haya solicitado.</span>
                  </span>
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {patient.prefersWhatsApp ? <Badge tone="turquoise">WhatsApp</Badge> : null}
                {patient.prefersPhone ? <Badge tone="blue">Llamada</Badge> : null}
                {patient.prefersEmail ? <Badge tone="blue">Correo</Badge> : null}
              </div>
              {patient.adminNotes ? <p className="rounded-lg bg-muted p-3 text-xs text-brand-text">{patient.adminNotes}</p> : null}
            </CardContent>
          </Card>
          <Card className="grid grid-cols-2 divide-x p-0">
            <div className="p-4">
              <p className="text-xs text-muted-foreground">Total pagado</p>
              <p className="mt-1 font-display text-lg font-bold text-brand-ink tabular">{formatMoney(totalPaid)}</p>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted-foreground">Saldo pendiente</p>
              <p className={`mt-1 font-display text-lg font-bold tabular ${balance > 0 ? "text-brand-coral" : "text-brand-ink"}`}>{formatMoney(balance)}</p>
            </div>
          </Card>
        </div>

        <Card className="min-w-0 p-4 sm:p-5">
          <Tabs defaultValue="citas">
            <TabsList>
              <TabsTrigger value="citas">Citas ({patient.appointments.length})</TabsTrigger>
              <TabsTrigger value="resultados">Resultados ({patient.results.length})</TabsTrigger>
              <TabsTrigger value="cotizaciones">Cotizaciones ({patient.quotes.length})</TabsTrigger>
              <TabsTrigger value="ordenes">Órdenes ({patient.orders.length})</TabsTrigger>
              <TabsTrigger value="pagos">Pagos ({payments.length})</TabsTrigger>
              <TabsTrigger value="interacciones">Interacciones ({patient.interactions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="citas">
              {patient.appointments.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estudios</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patient.appointments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap">{formatDateTime(a.startsAt)}</TableCell>
                        <TableCell className="max-w-[16rem] truncate">{a.studies.map((s) => s.study.name).join(", ") || "—"}</TableCell>
                        <TableCell>{a.branch.name}</TableCell>
                        <TableCell>{APPOINTMENT_TYPE[a.type]}</TableCell>
                        <TableCell>
                          <StatusBadge value={a.status} map={APPOINTMENT_STATUS} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title="Sin citas registradas" />
              )}
            </TabsContent>

            <TabsContent value="resultados">
              <ResultsPanel
                patientId={patient.id}
                canManage={can(user, "patients.manage")}
                results={patient.results.map((r) => ({
                  id: r.id,
                  fileName: r.fileName,
                  sizeBytes: r.sizeBytes,
                  note: r.note,
                  createdAt: r.createdAt.toISOString(),
                  sentAt: r.sentAt?.toISOString() ?? null,
                  uploadedBy: r.uploadedBy?.name ?? null,
                }))}
              />
            </TabsContent>

            <TabsContent value="cotizaciones">
              {patient.quotes.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Folio</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estudios</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patient.quotes.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell>
                          <Link href={`/crm/cotizaciones/${q.id}`} className="font-semibold text-brand-blue hover:underline">
                            {q.folio}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(q.issuedAt)}</TableCell>
                        <TableCell className="tabular">{q._count.items}</TableCell>
                        <TableCell className="text-right tabular">{formatMoney(q.totalCents)}</TableCell>
                        <TableCell>
                          <StatusBadge value={q.status} map={QUOTE_STATUS} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title="Sin cotizaciones" />
              )}
            </TabsContent>

            <TabsContent value="ordenes">
              {patient.orders.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Folio</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patient.orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Link href={`/crm/ordenes/${o.id}`} className="font-semibold text-brand-blue hover:underline">
                            {o.folio}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(o.createdAt)}</TableCell>
                        <TableCell className="text-right tabular">{formatMoney(o.totalCents)}</TableCell>
                        <TableCell>
                          <StatusBadge value={o.paymentStatus} map={PAYMENT_STATUS} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={o.status} map={ORDER_STATUS} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title="Sin órdenes" />
              )}
            </TabsContent>

            <TabsContent value="pagos">
              {payments.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Recibo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Orden</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id} className={p.status === "VOIDED" ? "opacity-50" : ""}>
                        <TableCell className="font-mono text-xs">{p.folio}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateTime(p.createdAt)}</TableCell>
                        <TableCell>{p.orderFolio}</TableCell>
                        <TableCell>{PAYMENT_METHOD[p.method]}</TableCell>
                        <TableCell>{p.status === "VOIDED" ? "Anulado" : PAYMENT_KIND[p.kind]}</TableCell>
                        <TableCell className="text-right tabular">{formatMoney(p.amountCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title="Sin pagos" />
              )}
            </TabsContent>

            <TabsContent value="interacciones" className="grid gap-4">
              {can(user, "patients.manage") ? <InteractionForm patientId={patient.id} /> : null}
              {patient.interactions.length ? (
                <ol className="relative grid gap-4 border-l border-border pl-5">
                  {patient.interactions.map((i) => (
                    <li key={i.id} className="relative">
                      <span className="absolute -left-[1.6rem] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-mint text-[#1f8f94]">
                        <MessageCircle className="h-3 w-3" />
                      </span>
                      <p className="text-sm text-brand-ink">{i.summary}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {INTERACTION_TYPE[i.type]} · {i.user?.name ?? "Sistema"} · {formatDateTime(i.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title="Sin interacciones registradas" />
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
