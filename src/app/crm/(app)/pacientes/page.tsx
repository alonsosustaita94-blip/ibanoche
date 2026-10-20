import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { can, requirePage, resolveBranchFilter } from "@/lib/auth/guard";
import { formatDate } from "@/lib/dates";
import { PATIENT_STATUS, PATIENT_TYPE } from "@/lib/labels";
import { fullName, normalizePhone, searchTextWhere } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { PatientFormDialog } from "./patient-form";

export const metadata: Metadata = { title: "Pacientes" };
const PAGE_SIZE = 20;

type SP = { q?: string; status?: string; type?: string; branch?: string; page?: string };

export default async function PatientsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePage("patients.view");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const branchIds = resolveBranchFilter(user, sp.branch);
  const q = sp.q?.trim();
  const phone = q ? normalizePhone(q) : null;

  const where: Prisma.PatientWhereInput = {
    branchId: { in: branchIds },
    ...(sp.status === "ACTIVE" || sp.status === "INACTIVE" ? { status: sp.status } : {}),
    ...(sp.type && sp.type in PATIENT_TYPE ? { type: sp.type as Prisma.EnumPatientTypeFilter["equals"] } : {}),
    ...(q
      ? {
          OR: [
            searchTextWhere(q),
            ...(phone && phone.length >= 4 ? [{ phoneNormalized: { contains: phone } }] : []),
          ],
        }
      : {}),
  };

  const [patients, total, branches, partners] = await Promise.all([
    db.patient.findMany({ where, include: { branch: true }, orderBy: [{ updatedAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.patient.count({ where }),
    db.branch.findMany({ where: { id: { in: user.branchIds } }, orderBy: { name: "asc" } }),
    db.partner.findMany({ where: { status: "ACTIVE" }, orderBy: { organization: "asc" }, select: { id: true, organization: true } }),
  ]);
  const canManage = can(user, "patients.manage");

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Pacientes"
        description="Fichas administrativas y de contacto. Sin información clínica."
        actions={canManage ? <PatientFormDialog branches={branches} partners={partners} defaultBranchId={user.activeBranchId ?? undefined} /> : null}
      />
      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <SearchInput placeholder="Buscar por nombre, teléfono, correo o folio" className="lg:max-w-sm" />
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <FilterSelect param="status" label="Estado" allLabel="Todos los estados" options={[{ value: "ACTIVE", label: "Activos" }, { value: "INACTIVE", label: "Inactivos" }]} />
            <FilterSelect param="type" label="Tipo" allLabel="Todos los tipos" options={Object.entries(PATIENT_TYPE).map(([value, label]) => ({ value, label }))} />
            {branches.length > 1 ? (
              <FilterSelect param="branch" label="Sucursal" allLabel="Todas las sucursales" options={branches.map((b) => ({ value: b.id, label: b.name }))} />
            ) : null}
          </div>
        </div>
        {patients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={q ? `Sin resultados para “${q}”` : "Aún no hay pacientes"}
            description={q ? "Prueba con otro nombre, teléfono o folio." : "Registra al primer paciente para empezar."}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Folio</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="hidden lg:table-cell">Correo</TableHead>
                  <TableHead className="hidden md:table-cell">Última visita</TableHead>
                  <TableHead className="hidden xl:table-cell">Sucursal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="pr-5 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-5 font-mono text-xs text-muted-foreground">{p.folio}</TableCell>
                    <TableCell>
                      <Link href={`/crm/pacientes/${p.id}`} className="flex items-center gap-2.5 font-semibold hover:text-brand-blue">
                        <Avatar name={fullName(p)} />
                        <span className="min-w-0">
                          <span className="block truncate">{fullName(p)}</span>
                          <span className="block text-xs font-normal text-muted-foreground">{PATIENT_TYPE[p.type]}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular">{p.phone ?? "—"}</TableCell>
                    <TableCell className="hidden max-w-[14rem] truncate lg:table-cell">{p.email ?? "—"}</TableCell>
                    <TableCell className="hidden whitespace-nowrap md:table-cell">{formatDate(p.lastVisitAt)}</TableCell>
                    <TableCell className="hidden xl:table-cell">{p.branch.name}</TableCell>
                    <TableCell>
                      <StatusBadge value={p.status} map={PATIENT_STATUS} />
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Link href={`/crm/pacientes/${p.id}`} className="text-sm font-semibold text-brand-blue hover:underline">
                        Ver perfil
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} params={{ q: sp.q, status: sp.status, type: sp.type, branch: sp.branch }} basePath="/crm/pacientes" />
          </>
        )}
      </Card>
    </div>
  );
}
