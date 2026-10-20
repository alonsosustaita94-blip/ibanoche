import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Paginación por URL. `params` son los parámetros actuales de búsqueda. */
export function Pagination({
  page,
  pageSize,
  total,
  params,
  basePath,
}: {
  page: number;
  pageSize: number;
  total: number;
  params: Record<string, string | undefined>;
  basePath: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    q.set("page", String(p));
    return `${basePath}?${q.toString()}`;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row">
      <p className="tabular">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={href(page - 1)}
          aria-disabled={page <= 1}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-50")}
        >
          <ChevronLeft /> Anterior
        </Link>
        <span className="px-2 tabular">
          Página {page} de {pages}
        </span>
        <Link
          href={href(page + 1)}
          aria-disabled={page >= pages}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), page >= pages && "pointer-events-none opacity-50")}
        >
          Siguiente <ChevronRight />
        </Link>
      </div>
    </div>
  );
}

export function parsePage(v: string | undefined) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
