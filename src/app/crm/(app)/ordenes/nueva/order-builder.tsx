"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowRightLeft, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { createOrderAction } from "@/server/actions/orders";
import { convertQuoteAction, openQuotesForPatientAction } from "@/server/actions/quotes";
import type { PatientOption } from "@/server/actions/lookup";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { PatientPicker } from "@/components/shared/pickers";
import { EmptyState } from "@/components/shared/empty-state";
import { DiscountSummary, LineItemsEditor, useDiscountState, type Line, type PromotionOption } from "../../cotizaciones/_components/line-items";

type OpenQuote = { id: string; folio: string; totalCents: number; validUntil: string; status: string };

export function OrderBuilder({
  branches,
  defaultBranchId,
  roleMaxBps,
  promotions,
  initialPatient,
}: {
  branches: { id: string; name: string }[];
  defaultBranchId: string;
  roleMaxBps: number;
  promotions: PromotionOption[];
  initialPatient: PatientOption | null;
}) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientOption | null>(initialPatient);
  const [branchId, setBranchId] = useState(initialPatient?.branchId ?? defaultBranchId);
  const [lines, setLines] = useState<Line[]>([]);
  const [discountPct, setDiscountPct] = useState("0");
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const d = useDiscountState(lines, discountPct, promotionId, promotions, roleMaxBps);
  const [quotesForPatient, setQuotes] = useState<OpenQuote[]>([]);

  useEffect(() => {
    let alive = true;
    if (!patient) {
      setQuotes([]);
      return;
    }
    openQuotesForPatientAction(patient.id).then((q) => alive && setQuotes(q));
    return () => {
      alive = false;
    };
  }, [patient]);

  const submit = () => {
    if (!patient) return setErrors({ patientId: "Elige un paciente." });
    if (d.error) return toast.error(d.error);
    start(async () => {
      const r = await createOrderAction({
        patientId: patient.id,
        branchId,
        items: lines.map((l) => ({ studyId: l.studyId, quantity: l.quantity })),
        discountBps: d.discountBps,
        promotionId,
        notes: notes || null,
      });
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
        return;
      }
      toast.success(`Orden ${r.data.folio} creada`);
      router.push(`/crm/ordenes/${r.data.id}`);
    });
  };

  const link = (quoteId: string) =>
    start(async () => {
      const r = await convertQuoteAction(quoteId);
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.data.created ? `Orden ${r.data.folio} creada desde la cotización` : `La cotización ya tenía la orden ${r.data.folio}`);
      router.push(`/crm/ordenes/${r.data.orderId}`);
    });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="grid min-w-0 grid-cols-1 content-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Paciente y sucursal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[1fr_16rem]">
            <FormField id="patientId" label="Paciente" required error={errors.patientId}>
              <PatientPicker
                value={patient}
                onChange={(p) => {
                  setPatient(p);
                  setErrors({});
                  if (p && branches.some((b) => b.id === p.branchId)) setBranchId(p.branchId);
                }}
                invalid={!!errors.patientId}
              />
            </FormField>
            <FormField id="branchId" label="Sucursal" required>
              <NativeSelect id="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estudios</CardTitle>
          </CardHeader>
          <CardContent>
            <LineItemsEditor lines={lines} onChange={setLines} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vincular cotización</CardTitle>
            <p className="text-xs text-muted-foreground">Crea la orden con los precios guardados en una cotización vigente del paciente.</p>
          </CardHeader>
          <CardContent>
            {quotesForPatient.length === 0 ? (
              <EmptyState title={patient ? "Sin cotizaciones vigentes" : "Elige un paciente"} description={patient ? "Este paciente no tiene cotizaciones abiertas." : "Se mostrarán sus cotizaciones vigentes."} className="py-6" />
            ) : (
              <ul className="grid gap-2">
                {quotesForPatient.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <span className="min-w-0">
                      <span className="block font-semibold text-brand-ink">{q.folio}</span>
                      <span className="block text-xs text-muted-foreground">
                        Vence {formatDate(q.validUntil)}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold tabular">{formatMoney(q.totalCents)}</span>
                      <Button size="sm" variant="soft" onClick={() => link(q.id)} disabled={pending}>
                        <ArrowRightLeft /> Usar cotización
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit xl:sticky xl:top-24">
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <DiscountSummary
            discountPct={discountPct}
            onDiscountPct={setDiscountPct}
            promotionId={promotionId}
            onPromotion={setPromotionId}
            promotions={promotions}
            maxBps={d.maxBps}
            roleMaxBps={roleMaxBps}
            error={d.error ?? errors.discount ?? null}
            totals={d.totals}
          />
          <FormField id="notes" label="Notas administrativas" hint="Sin datos clínicos.">
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </FormField>
          <Button onClick={submit} loading={pending} disabled={!lines.length}>
            <ClipboardCheck /> Crear orden confirmada
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
