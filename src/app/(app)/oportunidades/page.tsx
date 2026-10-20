import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CircleDollarSign, LayoutGrid, Percent, Plus, Rows3, Target, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage, resolveBranchFilter } from "@/lib/auth/guard";
import { formatDate, formatDateTime } from "@/lib/dates";
import { CLIENT_TYPE, OPPORTUNITY_STAGE } from "@/lib/labels";
import { formatCompactMoney, formatMoney } from "@/lib/money";
import { cn, normalizeText } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { OpportunityBoard, type BoardItem } from "./board";
import { OpportunityFormDialog } from "./opportunity-form";
import { toLocalInput } from "./utils";

export const metadata: Metadata = { title: "Oportunidades" };

type SP = { view?: string; q?: string; owner?: string; type?: string; branch?: string; sort?: string };

const SORTS: Record<string, { label: string; orderBy: Prisma.OpportunityOrderByWithRelationInput[] }> = {
  recent: { label: "Más recientes", orderBy: [{ stageChangedAt: "desc" }] },
  value: { label: "Mayor valor", orderBy: [{ estimatedCents: "desc" }] },
  followup: { label: "Próximo seguimiento", orderBy: [{ nextFollowUpAt: { sort: "asc", nulls: "last" } }] },
  stage: { label: "Etapa", orderBy: [{ stage: "asc" }, { position: "asc" }] },
};

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage("opportunities.view");
  const sp = await searchParams;
  const view = sp.view === "tabla" ? "tabla" : "tablero";
  const branchIds = resolveBranchFilter(user, sp.branch);
  const sort = SORTS[sp.sort ?? ""] ? sp.sort! : "recent";

  const where: Prisma.OpportunityWhereInput = {
    branchId: { in: branchIds },
    ...(sp.owner ? { ownerId: sp.owner } : {}),
    ...(sp.type && sp.type in CLIENT_TYPE ? { clientType: sp.type as Prisma.EnumClientTypeFilter["equals"] } : {}),
  };

  const [rows, owners, branches, partners] = await Promise.all([
    db.opportunity.findMany({ where, include: { owner: true, partner: true, patient: true }, orderBy: SORTS[sort].orderBy, take: 500 }),
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.partner.findMany({ where: { OR: [{ branchId: { in: user.branchIds } }, { branchId: null }] }, orderBy: { organization: "asc" }, select: { id: true, organization: true } }),
  ]);

  // Búsqueda sin acentos por título, prospecto o convenio.
  const q = sp.q?.trim() ? normalizeText(sp.q) : "";
  const opportunities = q ? rows.filter((o) => normalizeText(`${o.title} ${o.prospectName} ${o.partner?.organization ?? ""}`).includes(q)) : rows;

  const canManage = can(user, "opportunities.manage");
  const partnerOptions = partners.map((p) => ({ id: p.id, name: p.organization }));
  const lists = { owners, branches, partners: partnerOptions };
  const open = opportunities.filter((o) => !["WON", "LOST"].includes(o.stage));
  const won = opportunities.filter((o) => o.stage === "WON");
  const pipeline = open.reduce((a, o) => a + o.estimatedCents, 0);
  const closed = opportunities.filter((o) => ["WON", "LOST"].includes(o.stage)).length;

  const items: BoardItem[] = opportunities.map((o) => ({
    id: o.id,
    title: o.title,
    prospectName: o.prospectName,
    clientType: o.clientType,
    estimatedCents: o.estimatedCents,
    stage: o.stage,
    position: o.position,
    ownerName: o.owner?.name ?? null,
    nextFollowUpAt: o.nextFollowUpAt?.toISOString() ?? null,
    nextFollowUpLabel: o.nextFollowUpAt ? formatDate(o.nextFollowUpAt).slice(0, 6) : null,
    lostReason: o.lostReason,
    form: {
      id: o.id,
      title: o.title,
      prospectName: o.prospectName,
      prospectPhone: o.prospectPhone,
      clientType: o.clientType,
      estimatedCents: o.estimatedCents,
      ownerId: o.ownerId,
      branchId: o.branchId,
      nextFollowUpAt: toLocalInput(o.nextFollowUpAt),
      notes: o.notes,
      partnerId: o.partnerId,
      patientId: o.patientId,
    },
  }));

  const viewHref = (v: string) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, val]) => val) as [string, string][]);
    p.set("view", v);
    return `/oportunidades?${p.toString()}`;
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        title="Oportunidades"
        description="Embudo comercial de pacientes, médicos, empresas, escuelas e instituciones."
        actions={
          <>
            <div className="inline-flex rounded-lg border bg-card p-1" role="group" aria-label="Vista">
              <Link href={viewHref("tablero")} aria-current={view === "tablero" ? "page" : undefined} className={cn(buttonVariants({ variant: view === "tablero" ? "soft" : "ghost", size: "sm" }))}>
                <LayoutGrid /> Tablero
              </Link>
              <Link href={viewHref("tabla")} aria-current={view === "tabla" ? "page" : undefined} className={cn(buttonVariants({ variant: view === "tabla" ? "soft" : "ghost", size: "sm" }))}>
                <Rows3 /> Tabla
              </Link>
            </div>
            {canManage ? (
              <OpportunityFormDialog
                trigger={
                  <Button>
                    <Plus /> Nueva oportunidad
                  </Button>
                }
                initial={{ ownerId: user.id, branchId: user.activeBranchId ?? branches[0]?.id }}
                {...lists}
              />
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Oportunidades abiertas" value={String(open.length)} icon={Target} />
        <KpiCard label="Valor en el embudo" value={formatCompactMoney(pipeline)} icon={CircleDollarSign} tone="turquoise" hint={formatMoney(pipeline)} />
        <KpiCard label="Ganadas" value={String(won.length)} icon={Trophy} tone="amber" hint={formatMoney(won.reduce((a, o) => a + o.estimatedCents, 0))} />
        <KpiCard label="Tasa de cierre" value={closed ? `${Math.round((won.length / closed) * 100)} %` : "—"} icon={Percent} tone="coral" hint="Ganadas entre cerradas" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput placeholder="Buscar por título, prospecto o convenio" className="lg:max-w-sm" />
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          <FilterSelect param="owner" label="Responsable" allLabel="Todos los responsables" options={owners.map((o) => ({ value: o.id, label: o.name }))} />
          <FilterSelect param="type" label="Tipo de cliente" allLabel="Todos los tipos" options={Object.entries(CLIENT_TYPE).map(([value, label]) => ({ value, label }))} />
          {branches.length > 1 ? <FilterSelect param="branch" label="Sucursal" allLabel="Todas las sucursales" options={branches.map((b) => ({ value: b.id, label: b.name }))} /> : null}
          {view === "tabla" ? <FilterSelect param="sort" label="Ordenar" allLabel="Más recientes" options={Object.entries(SORTS).filter(([k]) => k !== "recent").map(([value, s]) => ({ value, label: s.label }))} /> : null}
        </div>
      </div>

      {view === "tablero" ? (
        <>
          {canManage ? <p className="-mt-3 text-xs text-muted-foreground">Arrastra las tarjetas entre etapas. Con teclado: tabula hasta una tarjeta, presiona espacio y usa las flechas.</p> : null}
          <OpportunityBoard items={items} canManage={canManage} {...lists} />
        </>
      ) : (
        <Card>
          {opportunities.length === 0 ? (
            <EmptyState icon={Target} title="Sin oportunidades" description="Ajusta los filtros o registra una nueva oportunidad." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Título</TableHead>
                  <TableHead>Prospecto</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo</TableHead>
                  <TableHead className="text-right">Valor estimado</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="hidden lg:table-cell">Responsable</TableHead>
                  <TableHead className="hidden md:table-cell">Próximo seguimiento</TableHead>
                  {canManage ? <TableHead className="pr-5 text-right">Acciones</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((o, i) => {
                  const overdue = o.nextFollowUpAt && o.nextFollowUpAt < new Date() && !["WON", "LOST"].includes(o.stage);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="max-w-[16rem] pl-5">
                        <span className="block truncate font-semibold">{o.title}</span>
                        {o.partner ? (
                          <Link href={`/convenios/${o.partner.id}`} className="block truncate text-xs text-brand-blue hover:underline">
                            {o.partner.organization}
                          </Link>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate">{o.prospectName}</TableCell>
                      <TableCell className="hidden md:table-cell">{CLIENT_TYPE[o.clientType]}</TableCell>
                      <TableCell className="text-right tabular">{formatMoney(o.estimatedCents)}</TableCell>
                      <TableCell>
                        <StatusBadge value={o.stage} map={OPPORTUNITY_STAGE} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{o.owner?.name ?? "—"}</TableCell>
                      <TableCell className={cn("hidden whitespace-nowrap md:table-cell", overdue && "font-semibold text-brand-coral")}>{o.nextFollowUpAt ? formatDateTime(o.nextFollowUpAt) : "—"}</TableCell>
                      {canManage ? (
                        <TableCell className="pr-5 text-right">
                          <OpportunityFormDialog
                            trigger={
                              <Button variant="ghost" size="sm">
                                Editar
                              </Button>
                            }
                            initial={items[i].form}
                            {...lists}
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
