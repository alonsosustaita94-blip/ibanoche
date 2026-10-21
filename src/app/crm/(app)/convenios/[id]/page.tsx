import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, FileSignature, Mail, Phone, Target, UserRound, Users } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage } from "@/lib/auth/guard";
import { formatDate } from "@/lib/dates";
import { AGREEMENT_STATUS, OPPORTUNITY_STAGE, PARTNER_STATUS, PARTNER_TYPE, PATIENT_TYPE } from "@/lib/labels";
import { bpsToPercent, formatMoney } from "@/lib/money";
import { fullName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { AgreementFormDialog, CancelAgreementButton, PartnerFormDialog, PartnerStatusSelect } from "../partner-forms";

export const metadata: Metadata = { title: "Ficha de convenio" };

export default async function PartnerDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("partners.view");
  const { id } = await params;
  const partner = await db.partner.findFirst({
    where: { id, OR: [{ branchId: { in: user.branchIds } }, { branchId: null }] },
    include: {
      owner: true,
      branch: true,
      agreements: { orderBy: [{ status: "asc" }, { validFrom: "desc" }] },
      opportunities: { include: { owner: true }, orderBy: { stageChangedAt: "desc" }, take: 20 },
      patients: { where: { branchId: { in: user.branchIds } }, orderBy: { lastName: "asc" }, take: 20 },
      _count: { select: { patients: true } },
    },
  });
  if (!partner) notFound();
  const canManage = can(user, "partners.manage");
  const [owners, branches] = canManage
    ? await Promise.all([
        db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      ])
    : [[], []];
  const now = new Date();
  const activeAgreement = partner.agreements.find((a) => a.status === "ACTIVE" && a.validFrom <= now && (!a.validTo || a.validTo >= now));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Link href="/crm/convenios" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-brand-blue">
        <ArrowLeft className="h-4 w-4" /> Convenios
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-turquoise text-white">
              <Building2 className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold text-brand-ink">{partner.organization}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="blue">{PARTNER_TYPE[partner.type]}</Badge>
                <StatusBadge value={partner.status} map={PARTNER_STATUS} />
                {activeAgreement ? <Badge tone="turquoise">Descuento vigente {bpsToPercent(activeAgreement.discountBps)}</Badge> : null}
              </p>
            </div>
          </div>
          {canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <PartnerStatusSelect id={partner.id} status={partner.status} />
              <PartnerFormDialog
                owners={owners}
                branches={branches}
                initial={{ ...partner, startDate: partner.startDate ? partner.startDate.toISOString().slice(0, 10) : null }}
              />
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Datos del convenio</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p className="flex items-center gap-2.5">
                <UserRound className="h-4 w-4 shrink-0 text-brand-turquoise" /> {partner.contactName}
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-brand-turquoise" /> {partner.phone ?? "Sin teléfono"}
              </p>
              <p className="flex items-center gap-2.5 break-all">
                <Mail className="h-4 w-4 shrink-0 text-brand-turquoise" /> {partner.email ?? "Sin correo"}
              </p>
              <dl className="mt-1 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Ejecutivo</dt>
                  <dd className="font-semibold text-brand-ink">{partner.owner?.name ?? "Sin asignar"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sucursal</dt>
                  <dd className="font-semibold text-brand-ink">{partner.branch?.name ?? "Todas"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fecha de inicio</dt>
                  <dd className="font-semibold text-brand-ink">{formatDate(partner.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Pacientes vinculados</dt>
                  <dd className="font-semibold text-brand-ink tabular">{partner._count.patients}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm text-brand-text">{partner.notes || "Sin observaciones."}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-brand-blue" /> Acuerdos
                </CardTitle>
                <CardDescription>El descuento de un acuerdo vigente es un descuento autorizado para los pacientes vinculados.</CardDescription>
              </div>
              {canManage ? <AgreementFormDialog partnerId={partner.id} /> : null}
            </CardHeader>
            <CardContent className="px-0">
              {partner.agreements.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-5">Acuerdo</TableHead>
                      <TableHead className="text-right">Descuento</TableHead>
                      <TableHead>Vigencia</TableHead>
                      <TableHead>Estado</TableHead>
                      {canManage ? <TableHead className="pr-5 text-right">Acciones</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partner.agreements.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="max-w-[16rem] pl-5">
                          <span className="block truncate font-semibold">{a.name}</span>
                          {a.terms ? <span className="block truncate text-xs text-muted-foreground">{a.terms}</span> : null}
                        </TableCell>
                        <TableCell className="text-right tabular">{bpsToPercent(a.discountBps)}</TableCell>
                        <TableCell className="text-xs">
                          <span className="flex items-start gap-1.5">
                            <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span>
                              <span className="block whitespace-nowrap">Desde {formatDate(a.validFrom)}</span>
                              <span className="block whitespace-nowrap text-muted-foreground">{a.validTo ? `Hasta ${formatDate(a.validTo)}` : "Sin fecha de fin"}</span>
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={a.status} map={AGREEMENT_STATUS} />
                        </TableCell>
                        {canManage ? (
                          <TableCell className="pr-5 text-right">
                            {a.status !== "CANCELLED" ? (
                              <span className="inline-flex gap-0.5">
                                <AgreementFormDialog
                                  partnerId={partner.id}
                                  initial={{
                                    id: a.id,
                                    name: a.name,
                                    discountPct: (a.discountBps / 100).toString(),
                                    validFrom: a.validFrom.toISOString().slice(0, 10),
                                    validTo: a.validTo ? a.validTo.toISOString().slice(0, 10) : null,
                                    status: a.status,
                                    terms: a.terms,
                                  }}
                                />
                                <CancelAgreementButton id={a.id} name={a.name} />
                              </span>
                            ) : null}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={FileSignature} title="Sin acuerdos" description="Registra las condiciones comerciales del convenio." />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-blue" /> Pacientes vinculados ({partner._count.patients})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {partner.patients.length ? (
                  <ul className="grid gap-2">
                    {partner.patients.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                        <Link href={`/crm/pacientes/${p.id}`} className="min-w-0 truncate font-semibold text-brand-ink hover:text-brand-blue">
                          {fullName(p)}
                        </Link>
                        <span className="shrink-0 text-xs text-muted-foreground">{PATIENT_TYPE[p.type]}</span>
                      </li>
                    ))}
                    {partner._count.patients > partner.patients.length ? (
                      <li className="text-xs text-muted-foreground">Y {partner._count.patients - partner.patients.length} más en otras sucursales o páginas.</li>
                    ) : null}
                  </ul>
                ) : (
                  <EmptyState icon={Users} title="Sin pacientes vinculados" className="py-8" />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-brand-blue" /> Oportunidades
                </CardTitle>
                <Link href="/crm/oportunidades?view=tabla" className="text-xs font-semibold text-brand-blue hover:underline">
                  Ver embudo
                </Link>
              </CardHeader>
              <CardContent>
                {partner.opportunities.length ? (
                  <ul className="grid gap-3">
                    {partner.opportunities.map((o) => (
                      <li key={o.id} className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-brand-ink">{o.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatMoney(o.estimatedCents)} · {o.owner?.name ?? "Sin responsable"}
                          </span>
                        </span>
                        <StatusBadge value={o.stage} map={OPPORTUNITY_STAGE} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon={Target} title="Sin oportunidades" className="py-8" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
