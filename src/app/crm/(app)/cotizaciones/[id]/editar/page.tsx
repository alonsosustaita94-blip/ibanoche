import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requirePage } from "@/lib/auth/guard";
import { fullName } from "@/lib/utils";
import { currentPublicPrices } from "@/server/services/pricing";
import { PageHeader } from "@/components/shared/page-header";
import { QuoteBuilder } from "../../_components/quote-builder";
import { loadActivePromotions, quoteValidityDays } from "../../_components/data";

export const metadata: Metadata = { title: "Editar cotización" };

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("quotes.manage");
  const { id } = await params;
  const quote = await db.quote.findFirst({ where: { id, branchId: { in: user.branchIds } }, include: { items: true, patient: true } });
  if (!quote) notFound();
  if (quote.status !== "DRAFT") redirect(`/crm/cotizaciones/${quote.id}`);
  const [branches, promotions, validityDays, prices] = await Promise.all([
    db.branch.findMany({ where: { id: { in: user.branchIds }, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    loadActivePromotions(),
    quoteValidityDays(),
    currentPublicPrices(quote.items.map((i) => i.studyId)),
  ]);
  // Al editar un borrador se usan los precios vigentes (el servidor vuelve a calcularlos).
  const lines = quote.items
    .filter((i) => prices.has(i.studyId))
    .map((i) => ({ studyId: i.studyId, code: i.studyCode, name: i.studyName, unitPriceCents: prices.get(i.studyId)!.amountCents, quantity: i.quantity }));

  return (
    <div className="grid gap-6">
      <Link href={`/crm/cotizaciones/${quote.id}`} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-brand-blue">
        <ArrowLeft className="h-4 w-4" /> {quote.folio}
      </Link>
      <PageHeader title={`Editar ${quote.folio}`} description="Los borradores se recalculan con la tarifa pública vigente." />
      <QuoteBuilder
        quoteId={quote.id}
        folio={quote.folio}
        branches={branches}
        defaultBranchId={quote.branchId}
        responsibleName={user.name}
        validityDays={validityDays}
        roleMaxBps={user.maxDiscountBps}
        promotions={promotions}
        initial={{
          patient: quote.patient
            ? { id: quote.patient.id, name: fullName(quote.patient), folio: quote.patient.folio, phone: quote.patient.phone, branchId: quote.patient.branchId, contactConsent: quote.patient.contactConsent }
            : null,
          prospectName: quote.prospectName,
          prospectPhone: quote.prospectPhone,
          branchId: quote.branchId,
          lines,
          discountBps: quote.discountBps,
          promotionId: quote.promotionId,
          notes: quote.notes,
        }}
      />
    </div>
  );
}
