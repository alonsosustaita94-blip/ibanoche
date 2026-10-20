"use server";

import { db } from "@/lib/db";
import { can, requireUser, scopeBranchIds } from "@/lib/auth/guard";
import { fullName, normalizePhone, searchTextWhere } from "@/lib/utils";

export type SearchHit = { type: "patient" | "study" | "quote" | "order"; id: string; title: string; subtitle: string; href: string };

/** Búsqueda global respetando permisos y sucursales del usuario. */
export async function globalSearchAction(raw: string): Promise<SearchHit[]> {
  const user = await requireUser();
  const q = raw.trim().slice(0, 80);
  if (q.length < 2) return [];
  const branchIds = scopeBranchIds(user);
  const phone = normalizePhone(q);
  const hits: SearchHit[] = [];

  if (can(user, "patients.view")) {
    const patients = await db.patient.findMany({
      where: {
        branchId: { in: branchIds },
        OR: [searchTextWhere(q), ...(phone && phone.length >= 4 ? [{ phoneNormalized: { contains: phone } }] : [])],
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    });
    hits.push(...patients.map((p) => ({ type: "patient" as const, id: p.id, title: fullName(p), subtitle: `${p.folio} · ${p.phone ?? "sin teléfono"}`, href: `/crm/pacientes/${p.id}` })));
  }
  if (can(user, "catalog.view")) {
    const studies = await db.study.findMany({
      where: searchTextWhere(q),
      take: 4,
      include: { category: true },
    });
    hits.push(...studies.map((s) => ({ type: "study" as const, id: s.id, title: s.name, subtitle: `${s.code} · ${s.category.name}`, href: `/crm/catalogo?q=${encodeURIComponent(s.code)}` })));
  }
  if (can(user, "quotes.view")) {
    const quotes = await db.quote.findMany({ where: { branchId: { in: branchIds }, folio: { contains: q, mode: "insensitive" } }, take: 3 });
    hits.push(...quotes.map((x) => ({ type: "quote" as const, id: x.id, title: x.folio, subtitle: "Cotización", href: `/crm/cotizaciones/${x.id}` })));
  }
  if (can(user, "orders.view")) {
    const orders = await db.order.findMany({ where: { branchId: { in: branchIds }, folio: { contains: q, mode: "insensitive" } }, take: 3 });
    hits.push(...orders.map((x) => ({ type: "order" as const, id: x.id, title: x.folio, subtitle: "Orden", href: `/crm/ordenes/${x.id}` })));
  }
  return hits;
}
