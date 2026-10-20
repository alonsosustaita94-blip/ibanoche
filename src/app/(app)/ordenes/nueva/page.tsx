import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requirePage } from "@/lib/auth/guard";
import { fullName } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { loadActivePromotions } from "../../cotizaciones/_components/data";
import { OrderBuilder } from "./order-builder";

export const metadata: Metadata = { title: "Nueva orden" };

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ patientId?: string }> }) {
  const user = await requirePage("orders.manage");
  const { patientId } = await searchParams;
  const [branches, promotions, patient] = await Promise.all([
    db.branch.findMany({ where: { id: { in: user.branchIds }, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    loadActivePromotions(),
    patientId ? db.patient.findFirst({ where: { id: patientId, branchId: { in: user.branchIds } } }) : null,
  ]);

  return (
    <div className="grid gap-6">
      <Link href="/ordenes" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-brand-blue">
        <ArrowLeft className="h-4 w-4" /> Órdenes
      </Link>
      <PageHeader title="Nueva orden" description="Registra los estudios solicitados. El cobro se hace en Caja." />
      <OrderBuilder
        branches={branches}
        defaultBranchId={user.activeBranchId ?? branches[0]?.id ?? ""}
        roleMaxBps={user.maxDiscountBps}
        promotions={promotions}
        initialPatient={patient ? { id: patient.id, name: fullName(patient), folio: patient.folio, phone: patient.phone, branchId: patient.branchId, contactConsent: patient.contactConsent } : null}
      />
    </div>
  );
}
