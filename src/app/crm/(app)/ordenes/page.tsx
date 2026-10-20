import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { ClipboardList, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage, resolveBranchFilter } from "@/lib/auth/guard";
import { formatDate } from "@/lib/dates";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { cn, fullName, searchTextWhere } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";

export const metadata: Metadata = { title: "Órdenes" };
const PAGE_SIZE = 20;
type SP = { q?: string; status?: string; payment?: string; branch?: string; page?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage("orders.view");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const branchIds = resolveBranchFilter(user, sp.branch);
  const status = sp.status && sp.status in ORDER_STATUS ? (sp.status as OrderStatus) : undefined;
  const payment = sp.payment && sp.payment in PAYMENT_STATUS ? (sp.payment as PaymentStatus) : undefined;
  const q = sp.q?.trim();

  const base: Prisma.OrderWhereInput = {
    branchId: { in: branchIds },
    ...(payment ? { paymentStatus: payment } : {}),
    ...(q ? { OR: [{ folio: { contains: q, mode: "insensitive" } }, { patient: searchTextWhere(q) }] } : {}),
  };
  const where: Prisma.OrderWhereInput = { ...base, ...(status ? { status } : {}) };

  const [orders, total, counts, branches] = await Promise.all([
    db.order.findMany({
      where,
      include: { patient: true, branch: true, responsible: true, items: { select: { studyName: true }, take: 1 }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: true, where: base }),
    db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" } }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const all = counts.reduce((a, c) => a + c._count, 0);
  const tabHref = (s?: string) => {
    const p = new URLSearchParams();
    for (const k of ["q", "payment", "branch"] as const) if (sp[k]) p.set(k, sp[k]!);
    if (s) p.set("status", s);
    return `/crm/ordenes?${p.toString()}`;
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title="Órdenes"
        description="Registro administrativo del servicio. Sin resultados ni datos clínicos."
        actions={
          can(user, "orders.manage") ? (
            <Link href="/crm/ordenes/nueva" className={buttonVariants()}>
              <Plus /> Nueva orden
            </Link>
          ) : null
        }
      />
      <Card className="min-w-0">
        <nav aria-label="Filtrar por estado" className="flex gap-1 overflow-x-auto border-b px-3 pt-3 scrollbar-thin">
          {[{ key: undefined, label: "Todas", n: all }, ...Object.entries(ORDER_STATUS).map(([key, v]) => ({ key, label: v.label, n: countOf(key) }))].map((t) => (
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
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <SearchInput placeholder="Buscar por folio o paciente" />
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <FilterSelect param="payment" label="Estado de pago" allLabel="Cualquier pago" options={Object.entries(PAYMENT_STATUS).map(([value, v]) => ({ value, label: v.label }))} />
            {branches.length > 1 ? (
              <FilterSelect param="branch" label="Sucursal" allLabel="Todas las sucursales" options={branches.map((b) => ({ value: b.id, label: b.name }))} />
            ) : null}
          </div>
        </div>
        {orders.length === 0 ? (
          <EmptyState icon={ClipboardList} title={q ? `Sin resultados para “${q}”` : "No hay órdenes en esta vista"} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Folio</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="hidden lg:table-cell">Estudios</TableHead>
                  <TableHead className="hidden xl:table-cell">Sucursal</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden sm:table-cell">Pago</TableHead>
                  <TableHead className="hidden pr-5 2xl:table-cell">Responsable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-5">
                      <Link href={`/crm/ordenes/${o.id}`} className="whitespace-nowrap font-semibold text-brand-blue hover:underline">
                        {o.folio}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate font-semibold">{fullName(o.patient)}</TableCell>
                    <TableCell className="hidden max-w-[14rem] lg:table-cell">
                      <span className="block truncate">{o.items[0]?.studyName ?? "—"}</span>
                      {o._count.items > 1 ? <span className="text-xs text-muted-foreground">+{o._count.items - 1} más</span> : null}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">{o.branch.name}</TableCell>
                    <TableCell className="hidden whitespace-nowrap md:table-cell">{formatDate(o.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular">{formatMoney(o.totalCents)}</TableCell>
                    <TableCell>
                      <StatusBadge value={o.status} map={ORDER_STATUS} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge value={o.paymentStatus} map={PAYMENT_STATUS} />
                    </TableCell>
                    <TableCell className="hidden max-w-[10rem] truncate pr-5 2xl:table-cell">{o.responsible?.name ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} params={{ q: sp.q, status: sp.status, payment: sp.payment, branch: sp.branch }} basePath="/crm/ordenes" />
          </>
        )}
      </Card>
    </div>
  );
}
