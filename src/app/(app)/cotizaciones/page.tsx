import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, QuoteStatus } from "@prisma/client";
import { FilePlus2, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage, resolveBranchFilter } from "@/lib/auth/guard";
import { formatDate } from "@/lib/dates";
import { QUOTE_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { cn, fullName, searchTextWhere } from "@/lib/utils";
import { expireQuotes } from "@/server/services/quotes";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";

export const metadata: Metadata = { title: "Cotizaciones" };
const PAGE_SIZE = 20;
type SP = { q?: string; status?: string; branch?: string; page?: string };

export default async function QuotesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage("quotes.view");
  const sp = await searchParams;
  await expireQuotes();
  const page = parsePage(sp.page);
  const branchIds = resolveBranchFilter(user, sp.branch);
  const status = sp.status && sp.status in QUOTE_STATUS ? (sp.status as QuoteStatus) : undefined;
  const q = sp.q?.trim();

  const base: Prisma.QuoteWhereInput = {
    branchId: { in: branchIds },
    ...(q
      ? {
          OR: [
            { folio: { contains: q, mode: "insensitive" } },
            { prospectName: { contains: q, mode: "insensitive" } },
            { patient: searchTextWhere(q) },
          ],
        }
      : {}),
  };
  const where: Prisma.QuoteWhereInput = { ...base, ...(status ? { status } : {}) };

  const [quotes, total, counts, branches] = await Promise.all([
    db.quote.findMany({
      where,
      include: { patient: true, branch: true, responsible: true },
      orderBy: { issuedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.quote.count({ where }),
    db.quote.groupBy({ by: ["status"], _count: true, where: base }),
    db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" } }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const all = counts.reduce((a, c) => a + c._count, 0);
  const tabHref = (s?: string) => {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.branch) p.set("branch", sp.branch);
    if (s) p.set("status", s);
    return `/cotizaciones?${p.toString()}`;
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title="Cotizaciones"
        description="Precios conservados al momento de cotizar. Convierte en orden cuando el paciente acepte."
        actions={
          can(user, "quotes.manage") ? (
            <Link href="/cotizaciones/nueva" className={buttonVariants()}>
              <FilePlus2 /> Nueva cotización
            </Link>
          ) : null
        }
      />
      <Card className="min-w-0">
        <nav aria-label="Filtrar por estado" className="flex gap-1 overflow-x-auto border-b px-3 pt-3 scrollbar-thin">
          {[{ key: undefined, label: "Todas", n: all }, ...Object.entries(QUOTE_STATUS).map(([key, v]) => ({ key, label: v.label, n: countOf(key) }))].map((t) => (
            <Link
              key={t.label}
              href={tabHref(t.key)}
              aria-current={status === t.key ? "page" : undefined}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-3 pb-2.5 font-display text-xs font-semibold transition-colors",
                status === t.key ? "border-brand-blue text-brand-blue" : "border-transparent text-muted-foreground hover:text-brand-blue",
              )}
            >
              {t.label} <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] tabular">{t.n}</span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <SearchInput placeholder="Buscar por folio, paciente o prospecto" />
          {branches.length > 1 ? (
            <div className="sm:ml-auto">
              <FilterSelect param="branch" label="Sucursal" allLabel="Todas las sucursales" options={branches.map((b) => ({ value: b.id, label: b.name }))} />
            </div>
          ) : null}
        </div>
        {quotes.length === 0 ? (
          <EmptyState icon={FileText} title={q ? `Sin resultados para “${q}”` : "No hay cotizaciones en esta vista"} description="Crea una cotización para un paciente o un prospecto." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Folio</TableHead>
                  <TableHead>Paciente / prospecto</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Vigencia</TableHead>
                  <TableHead className="hidden xl:table-cell">Sucursal</TableHead>
                  <TableHead className="hidden lg:table-cell">Responsable</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-5">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell className="pl-5">
                      <Link href={`/cotizaciones/${x.id}`} className="whitespace-nowrap font-semibold text-brand-blue hover:underline">
                        {x.folio}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[14rem]">
                      <span className="block truncate font-semibold">{x.patient ? fullName(x.patient) : x.prospectName}</span>
                      {x.patient ? null : <span className="text-xs text-muted-foreground">Prospecto</span>}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap md:table-cell">{formatDate(x.issuedAt)}</TableCell>
                    <TableCell className="hidden whitespace-nowrap md:table-cell">{formatDate(x.validUntil)}</TableCell>
                    <TableCell className="hidden xl:table-cell">{x.branch.name}</TableCell>
                    <TableCell className="hidden max-w-[10rem] truncate lg:table-cell">{x.responsible?.name ?? "Emilia / sistema"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular">{formatMoney(x.totalCents)}</TableCell>
                    <TableCell className="pr-5">
                      <StatusBadge value={x.status} map={QUOTE_STATUS} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} params={{ q: sp.q, status: sp.status, branch: sp.branch }} basePath="/cotizaciones" />
          </>
        )}
      </Card>
    </div>
  );
}
