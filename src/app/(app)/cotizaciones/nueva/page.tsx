import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requirePage } from "@/lib/auth/guard";
import { fullName } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { QuoteBuilder } from "../_components/quote-builder";
import { loadActivePromotions, quoteValidityDays } from "../_components/data";

export const metadata: Metadata = { title: "Nueva cotización" };

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ patientId?: string }> }) {
  const user = await requirePage("quotes.manage");
  const { patientId } = await searchParams;
  const [branches, promotions, validityDays, patient] = await Promise.all([
    db.branch.findMany({ where: { id: { in: user.branchIds }, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    loadActivePromotions(),
    quoteValidityDays(),
    patientId ? db.patient.findFirst({ where: { id: patientId, branchId: { in: user.branchIds } } }) : null,
  ]);
  const defaultBranchId = patient?.branchId ?? user.activeBranchId ?? branches[0]?.id ?? "";

  return (
    <div className="grid gap-6">
      <Link href="/cotizaciones" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-brand-blue">
        <ArrowLeft className="h-4 w-4" /> Cotizaciones
      </Link>
      <PageHeader title="Nueva cotización" description="Agrega estudios del catálogo con su precio público vigente." />
      <QuoteBuilder
        branches={branches}
        defaultBranchId={defaultBranchId}
        responsibleName={user.name}
        validityDays={validityDays}
        roleMaxBps={user.maxDiscountBps}
        promotions={promotions}
        initial={
          patient
            ? {
                patient: { id: patient.id, name: fullName(patient), folio: patient.folio, phone: patient.phone, branchId: patient.branchId, contactConsent: patient.contactConsent },
                prospectName: null,
                prospectPhone: null,
                branchId: patient.branchId,
                lines: [],
                discountBps: 0,
                promotionId: null,
                notes: null,
              }
            : undefined
        }
      />
    </div>
  );
}
