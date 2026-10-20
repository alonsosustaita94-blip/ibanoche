import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { FlaskConical, Info } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage } from "@/lib/auth/guard";
import { formatMoney } from "@/lib/money";
import { cn, searchTextWhere } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { StudyFormDialog } from "./study-form";
import { StudyRowActions } from "./row-actions";
import type { StudyRow } from "./types";

export const metadata: Metadata = { title: "Catálogo de estudios" };
const PAGE_SIZE = 25;

type SP = { q?: string; category?: string; status?: string; page?: string };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage("catalog.view");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const viewCost = can(user, "catalog.viewCost");
  const canManage = can(user, "catalog.manage");
  const canPrices = can(user, "prices.manage");

  const categories = await db.studyCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { studies: true } } } });
  const category = categories.find((c) => c.key === sp.category);

  const where: Prisma.StudyWhereInput = {
    ...(category ? { categoryId: category.id } : {}),
    ...(sp.status === "active" ? { active: true } : sp.status === "inactive" ? { active: false } : {}),
    ...(sp.q?.trim() ? searchTextWhere(sp.q) : {}),
  };

  const [studies, total] = await Promise.all([
    db.study.findMany({
      where,
      include: {
        category: true,
        // El costo interno solo se consulta con permiso: nunca llega al cliente sin él.
        prices: { where: { validTo: null, kind: viewCost ? { in: ["PUBLIC", "INTERNAL_COST"] } : "PUBLIC" } },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.study.count({ where }),
  ]);

  const rows: StudyRow[] = studies.map((s) => {
    const row: StudyRow = {
      id: s.id,
      code: s.code,
      name: s.name,
      synonyms: s.synonyms,
      categoryId: s.categoryId,
      categoryName: s.category.name,
      sampleType: s.sampleType,
      sampleTypeValidated: s.sampleTypeValidated,
      instructions: s.instructions,
      instructionsApproved: s.instructionsApproved,
      turnaround: s.turnaround,
      turnaroundConfirmed: s.turnaroundConfirmed,
      active: s.active,
      isDemo: s.isDemo,
      publicCents: s.prices.find((p) => p.kind === "PUBLIC")?.amountCents ?? null,
    };
    if (viewCost) row.costCents = s.prices.find((p) => p.kind === "INTERNAL_COST")?.amountCents ?? null;
    return row;
  });

  const chipHref = (key?: string) => {
    const q = new URLSearchParams();
    if (sp.q) q.set("q", sp.q);
    if (sp.status) q.set("status", sp.status);
    if (key) q.set("category", key);
    const s = q.toString();
    return s ? `/catalogo?${s}` : "/catalogo";
  };
  const categoryOptions = categories.map((c) => ({ id: c.id, key: c.key, name: c.name }));
  const showActions = canManage || canPrices;

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title="Catálogo de estudios"
        description="Fuente central de estudios, sinónimos, precios públicos y tiempos administrativos."
        actions={canManage ? <StudyFormDialog categories={categoryOptions} canViewCost={viewCost} /> : null}
      />

      <div className="flex items-start gap-3 rounded-xl border border-brand-amber/30 bg-brand-amberSoft px-4 py-3 text-sm text-brand-ink">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-amber" aria-hidden />
        <p>
          <span className="font-semibold text-brand-amber">Catálogo de demostración.</span> Los estudios y precios mostrados son valores ficticios y no corresponden a las tarifas vigentes de IBANOCHE.
          Las indicaciones de preparación y los tiempos de entrega solo se publican cuando el laboratorio los aprueba.
        </p>
      </div>

      <nav aria-label="Categorías" className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <Link
          href={chipHref()}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 font-display text-xs font-semibold transition",
            !category ? "border-brand-blue bg-brand-blue text-white" : "bg-card text-brand-text hover:border-brand-turquoise hover:text-brand-blue",
          )}
        >
          Todas
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={chipHref(c.key)}
            aria-current={category?.id === c.id ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 font-display text-xs font-semibold transition",
              category?.id === c.id ? "border-brand-blue bg-brand-blue text-white" : "bg-card text-brand-text hover:border-brand-turquoise hover:text-brand-blue",
            )}
          >
            {c.name} <span className="opacity-70">({c._count.studies})</span>
          </Link>
        ))}
      </nav>

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <SearchInput placeholder="Buscar por nombre, código o sinónimo" className="lg:max-w-sm" />
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <FilterSelect
              param="status"
              label="Estado"
              allLabel="Activos e inactivos"
              options={[
                { value: "active", label: "Solo activos" },
                { value: "inactive", label: "Solo inactivos" },
              ]}
            />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={FlaskConical} title={sp.q ? `Sin estudios para “${sp.q}”` : "Sin estudios en esta categoría"} description="Prueba con otro nombre, código o sinónimo." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="hidden pl-5 sm:table-cell">Código</TableHead>
                  <TableHead className="pl-5 sm:pl-3">Estudio</TableHead>
                  <TableHead className="hidden lg:table-cell">Categoría</TableHead>
                  <TableHead className="text-right">Precio público</TableHead>
                  {viewCost ? <TableHead className="hidden text-right md:table-cell">Costo interno</TableHead> : null}
                  <TableHead className="hidden xl:table-cell">Tipo de muestra</TableHead>
                  <TableHead className="hidden xl:table-cell">Indicaciones</TableHead>
                  <TableHead className="hidden 2xl:table-cell">Entrega</TableHead>
                  <TableHead>Estado</TableHead>
                  {showActions ? <TableHead className="pr-5 text-right">Acciones</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id} className={s.active ? "" : "bg-muted/40"}>
                    <TableCell className="hidden whitespace-nowrap pl-5 font-mono text-xs text-muted-foreground sm:table-cell">{s.code}</TableCell>
                    <TableCell className="min-w-[11rem] pl-5 sm:min-w-[14rem] sm:pl-3">
                      <span className="block font-semibold">{s.name}</span>
                      {s.synonyms.length ? <span className="block max-w-xs truncate text-xs text-muted-foreground">{s.synonyms.join(", ")}</span> : null}
                      <span className="block text-xs text-muted-foreground lg:hidden">
                        <span className="font-mono sm:hidden">{s.code} · </span>
                        {s.categoryName}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{s.categoryName}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold tabular">{s.publicCents === null ? <span className="text-xs font-normal text-muted-foreground">Sin precio</span> : formatMoney(s.publicCents)}</TableCell>
                    {viewCost ? (
                      <TableCell className="hidden whitespace-nowrap text-right tabular text-muted-foreground md:table-cell">
                        {s.costCents === null || s.costCents === undefined ? "—" : formatMoney(s.costCents)}
                      </TableCell>
                    ) : null}
                    <TableCell className="hidden xl:table-cell">
                      {s.sampleType && s.sampleTypeValidated ? s.sampleType : <Badge tone="amber">Pendiente de validar</Badge>}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {s.instructionsApproved ? <Badge tone="green">Aprobadas</Badge> : <Badge tone="gray">Pendientes</Badge>}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap 2xl:table-cell">
                      {s.turnaround && s.turnaroundConfirmed ? s.turnaround : <span className="text-xs text-muted-foreground">Por confirmar</span>}
                    </TableCell>
                    <TableCell>
                      <Badge tone={s.active ? "green" : "gray"} dot>
                        {s.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    {showActions ? (
                      <TableCell className="pr-5 text-right">
                        <StudyRowActions study={s} categories={categoryOptions} canManage={canManage} canPrices={canPrices} canViewCost={viewCost} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} params={{ q: sp.q, category: sp.category, status: sp.status }} basePath="/catalogo" />
          </>
        )}
      </Card>
    </div>
  );
}
