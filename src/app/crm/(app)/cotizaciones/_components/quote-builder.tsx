"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Save, Send } from "lucide-react";
import { toast } from "sonner";
import { saveQuoteAction } from "@/server/actions/quotes";
import type { PatientOption } from "@/server/actions/lookup";
import { formatDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormField } from "@/components/shared/form-field";
import { PatientPicker } from "@/components/shared/pickers";
import { DiscountSummary, LineItemsEditor, useDiscountState, type Line, type PromotionOption } from "./line-items";

export type QuoteBuilderProps = {
  quoteId?: string;
  folio?: string;
  branches: { id: string; name: string }[];
  defaultBranchId: string;
  responsibleName: string;
  validityDays: number;
  roleMaxBps: number;
  promotions: PromotionOption[];
  initial?: {
    patient: PatientOption | null;
    prospectName: string | null;
    prospectPhone: string | null;
    branchId: string;
    lines: Line[];
    discountBps: number;
    promotionId: string | null;
    notes: string | null;
  };
};

export function QuoteBuilder(props: QuoteBuilderProps) {
  const { initial } = props;
  const router = useRouter();
  const [mode, setMode] = useState<"patient" | "prospect">(initial && !initial.patient && initial.prospectName ? "prospect" : "patient");
  const [patient, setPatient] = useState<PatientOption | null>(initial?.patient ?? null);
  const [prospectName, setProspectName] = useState(initial?.prospectName ?? "");
  const [prospectPhone, setProspectPhone] = useState(initial?.prospectPhone ?? "");
  const [branchId, setBranchId] = useState(initial?.branchId ?? props.defaultBranchId);
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? []);
  const [discountPct, setDiscountPct] = useState(initial ? String(initial.discountBps / 100) : "0");
  const [promotionId, setPromotionId] = useState<string | null>(initial?.promotionId ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const d = useDiscountState(lines, discountPct, promotionId, props.promotions, props.roleMaxBps);
  const validUntil = new Date(Date.now() + props.validityDays * 86400000);

  const save = (status: "DRAFT" | "SENT") => {
    if (d.error) return toast.error(d.error);
    if (!lines.length) return toast.error("Agrega al menos un estudio.");
    start(async () => {
      const r = await saveQuoteAction(props.quoteId ?? null, {
        patientId: mode === "patient" ? patient?.id ?? null : null,
        prospectName: mode === "prospect" ? prospectName : null,
        prospectPhone: mode === "prospect" ? prospectPhone || null : null,
        branchId,
        items: lines.map((l) => ({ studyId: l.studyId, quantity: l.quantity })),
        discountBps: d.discountBps,
        promotionId,
        notes: notes || null,
        status,
      });
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
        return;
      }
      toast.success(props.quoteId ? `Cotización ${r.data.folio} actualizada` : `Cotización ${r.data.folio} guardada`);
      router.push(`/crm/cotizaciones/${r.data.id}`);
      router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="grid min-w-0 grid-cols-1 content-start gap-6">
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Cotización</p>
              <p className="font-mono text-sm font-semibold text-brand-ink">{props.folio ?? "Se asigna al guardar"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p className="text-sm font-semibold text-brand-ink">{formatDate(new Date())}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vigencia</p>
              <p className="text-sm font-semibold text-brand-ink">
                {props.validityDays} días · hasta {formatDate(validUntil)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Responsable</p>
              <p className="truncate text-sm font-semibold text-brand-ink">{props.responsibleName}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paciente y sucursal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "patient" | "prospect")}>
              <TabsList>
                <TabsTrigger value="patient">Paciente registrado</TabsTrigger>
                <TabsTrigger value="prospect">Prospecto</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
              {mode === "patient" ? (
                <FormField id="patientId" label="Paciente" required error={errors.patientId}>
                  <PatientPicker
                    value={patient}
                    onChange={(p) => {
                      setPatient(p);
                      if (p && props.branches.some((b) => b.id === p.branchId)) setBranchId(p.branchId);
                    }}
                    invalid={!!errors.patientId}
                  />
                </FormField>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id="prospectName" label="Nombre del prospecto" required error={errors.patientId ?? errors.prospectName}>
                    <Input id="prospectName" value={prospectName} onChange={(e) => setProspectName(e.target.value)} maxLength={120} />
                  </FormField>
                  <FormField id="prospectPhone" label="Teléfono" error={errors.prospectPhone}>
                    <Input id="prospectPhone" type="tel" value={prospectPhone} onChange={(e) => setProspectPhone(e.target.value)} />
                  </FormField>
                </div>
              )}
              <FormField id="branchId" label="Sucursal" required error={errors.branchId}>
                <NativeSelect id="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  {props.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            </div>
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
      </div>

      <div className="grid min-w-0 grid-cols-1 content-start gap-6 xl:sticky xl:top-24">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <DiscountSummary
              discountPct={discountPct}
              onDiscountPct={setDiscountPct}
              promotionId={promotionId}
              onPromotion={setPromotionId}
              promotions={props.promotions}
              maxBps={d.maxBps}
              roleMaxBps={props.roleMaxBps}
              error={d.error ?? errors.discount ?? null}
              totals={d.totals}
            />
            <FormField id="notes" label="Notas para el paciente" hint="Sin datos clínicos.">
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </FormField>
            <p className="text-xs text-muted-foreground">Los precios se toman de la tarifa pública vigente y se conservan en la cotización aunque la tarifa cambie después.</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Button variant="outline" onClick={() => save("DRAFT")} loading={pending} disabled={!lines.length}>
                <Save /> Guardar borrador
              </Button>
              <Button onClick={() => save("SENT")} loading={pending} disabled={!lines.length}>
                <Send /> Guardar y marcar enviada
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
