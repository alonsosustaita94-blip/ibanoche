"use server";

import { db } from "@/lib/db";
import { requireUser, scopeBranchIds } from "@/lib/auth/guard";
import { fullName, normalizePhone, searchTextWhere } from "@/lib/utils";

export type PatientOption = { id: string; name: string; folio: string; phone: string | null; branchId: string; contactConsent: boolean };
export type StudyOption = { id: string; code: string; name: string; category: string; publicPriceCents: number | null };

/** Búsqueda de pacientes para selectores (respeta sucursales del usuario). */
export async function searchPatientsAction(q: string): Promise<PatientOption[]> {
  const user = await requireUser("patients.view");
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return [];
  const phone = normalizePhone(query);
  const rows = await db.patient.findMany({
    where: {
      branchId: { in: user.branchIds },
      status: "ACTIVE",
      OR: [searchTextWhere(query), ...(phone && phone.length >= 4 ? [{ phoneNormalized: { contains: phone } }] : [])],
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
  return rows.map((p) => ({ id: p.id, name: fullName(p), folio: p.folio, phone: p.phone, branchId: p.branchId, contactConsent: p.contactConsent }));
}

export async function getPatientOptionAction(id: string): Promise<PatientOption | null> {
  const user = await requireUser("patients.view");
  const p = await db.patient.findFirst({ where: { id, branchId: { in: user.branchIds } } });
  return p ? { id: p.id, name: fullName(p), folio: p.folio, phone: p.phone, branchId: p.branchId, contactConsent: p.contactConsent } : null;
}

/** Búsqueda de estudios activos con su precio público vigente. */
export async function searchStudiesAction(q: string): Promise<StudyOption[]> {
  await requireUser("catalog.view");
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return [];
  const rows = await db.study.findMany({
    where: { active: true, ...searchTextWhere(query) },
    include: { category: true, prices: { where: { kind: "PUBLIC", validTo: null }, take: 1 } },
    orderBy: { name: "asc" },
    take: 10,
  });
  return rows.map((s) => ({ id: s.id, code: s.code, name: s.name, category: s.category.name, publicPriceCents: s.prices[0]?.amountCents ?? null }));
}

/** Para mostrar el alcance actual en formularios (sucursal por omisión). */
export async function currentBranchScopeAction() {
  const user = await requireUser();
  return { activeBranchId: user.activeBranchId, branchIds: scopeBranchIds(user) };
}
