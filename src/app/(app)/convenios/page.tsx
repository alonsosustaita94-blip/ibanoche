import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Handshake } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage } from "@/lib/auth/guard";
import { formatDate } from "@/lib/dates";
import { PARTNER_STATUS, PARTNER_TYPE } from "@/lib/labels";
import { cn, normalizeText } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { PartnerFormDialog } from "./partner-forms";

export const metadata: Metadata = { title: "Convenios" };
const PAGE_SIZE = 20;

type SP = { q?: string; status?: string; type?: string; owner?: string; page?: string };

export default async function PartnersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage("partners.view");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const status = sp.status && sp.status in PARTNER_STATUS ? sp.status : undefined;

  const scope: Prisma.PartnerWhereInput = {
    OR: [{ branchId: { in: user.branchIds } }, { branchId: null }],
    ...(sp.type && sp.type in PARTNER_TYPE ? { type: sp.type as Prisma.EnumPartnerTypeFilter["equals"] } : {}),
    ...(sp.owner ? { ownerId: sp.owner } : {}),
  };

  const [all, owners, branches] = await Promise.all([
    db.partner.findMany({ where: scope, include: { owner: true, _count: { select: { patients: true, agreements: { where: { status: "ACTIVE" } } } } }, orderBy: { organization: "asc" } }),
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  // Búsqueda sin acentos por organización, contacto o correo.
  const q = sp.q?.trim() ? normalizeText(sp.q) : "";
  const matched = q ? all.filter((p) => normalizeText(`${p.organization} ${p.contactName} ${p.email ?? ""}`).includes(q)) : all;
  const counts = Object.fromEntries(Object.keys(PARTNER_STATUS).map((k) => [k, matched.filter((p) => p.status === k).length]));
  const filtered = status ? matched.filter((p) => p.status === status) : matched;
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tabHref = (s?: string) => {
    const p = new URLSearchParams(Object.entries({ q: sp.q, type: sp.type, owner: sp.owner }).filter(([, v]) => v) as [string, string][]);
    if (s) p.set("status", s);
    const qs = p.toString();
    return `/convenios${qs ? `?${qs}` : ""}`;
  };
  const tabs = [{ key: undefined, label: "Todos", n: matched.length }, ...Object.entries(PARTNER_STATUS).map(([k, l]) => ({ key: k, label: l.label, n: counts[k] }))];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        title="Convenios"
        description="Médicos referidores, clínicas, hospitales, empresas, escuelas e instituciones."
        actions={can(user, "partners.manage") ? <PartnerFormDialog owners={owners} branches={branches} /> : null}
      />
      <Card>
        <nav aria-label="Estado del convenio" className="flex gap-1 overflow-x-auto border-b px-3 pt-3 scrollbar-thin">
          {tabs.map((t) => {
            const active = t.key === status;
            return (
              <Link
                key={t.label}
                href={tabHref(t.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px whitespace-nowrap border-b-2 px-3 pb-2.5 font-display text-xs font-semibold transition-colors",
                  active ? "border-brand-blue text-brand-blue" : "border-transparent text-muted-foreground hover:text-brand-blue",
                )}
              >
                {t.label} <span className="tabular">({t.n})</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <SearchInput placeholder="Buscar organización, contacto o correo" className="lg:max-w-sm" />
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <FilterSelect param="type" label="Tipo" allLabel="Todos los tipos" options={Object.entries(PARTNER_TYPE).map(([value, label]) => ({ value, label }))} />
            <FilterSelect param="owner" label="Ejecutivo" allLabel="Todos los ejecutivos" options={owners.map((o) => ({ value: o.id, label: o.name }))} />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Handshake} title={q ? `Sin resultados para “${sp.q}”` : "Sin convenios"} description="Ajusta los filtros o registra un nuevo convenio." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Organización</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
                  <TableHead className="hidden 2xl:table-cell">Correo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden xl:table-cell">Ejecutivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden xl:table-cell">Inicio</TableHead>
                  <TableHead className="pr-5 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[16rem] pl-5">
                      <Link href={`/convenios/${p.id}`} className="block truncate font-semibold hover:text-brand-blue">
                        {p.organization}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {p._count.patients} pacientes · {p._count.agreements} acuerdos vigentes
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate">{p.contactName}</TableCell>
                    <TableCell className="hidden whitespace-nowrap tabular lg:table-cell">{p.phone ?? "—"}</TableCell>
                    <TableCell className="hidden max-w-[14rem] truncate 2xl:table-cell">{p.email ?? "—"}</TableCell>
                    <TableCell>{PARTNER_TYPE[p.type]}</TableCell>
                    <TableCell className="hidden whitespace-nowrap xl:table-cell">{p.owner?.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge value={p.status} map={PARTNER_STATUS} />
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap xl:table-cell">{formatDate(p.startDate)}</TableCell>
                    <TableCell className="pr-5 text-right">
                      <Link href={`/convenios/${p.id}`} className="whitespace-nowrap text-sm font-semibold text-brand-blue hover:underline">
                        Ver ficha
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} params={{ q: sp.q, status: sp.status, type: sp.type, owner: sp.owner }} basePath="/convenios" />
          </>
        )}
      </Card>
    </div>
  );
}
