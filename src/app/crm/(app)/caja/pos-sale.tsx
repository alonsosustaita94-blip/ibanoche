"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { posSaleAction } from "@/server/actions/pos";
import type { PatientOption } from "@/server/actions/lookup";
import { newIdempotencyKey } from "@/lib/idempotency";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/shared/form-field";
import { PatientPicker } from "@/components/shared/pickers";
import { DiscountSummary, LineItemsEditor, useDiscountState, type Line, type PromotionOption } from "../cotizaciones/_components/line-items";
import { usePaymentForm } from "./payment-form";

export function PosSale({ branchId, roleMaxBps, promotions, sessionOpen }: { branchId: string; roleMaxBps: number; promotions: PromotionOption[]; sessionOpen: boolean }) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientOption | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [discountPct, setDiscountPct] = useState("0");
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);
  const [pending, start] = useTransition();
  const d = useDiscountState(lines, discountPct, promotionId, promotions, roleMaxBps);
  const pay = usePaymentForm(d.error ? 0 : d.totals.totalCents);

  // Si cambia la venta se usa una llave nueva; los reintentos de la misma venta conservan la llave.
  useEffect(() => setKey(newIdempotencyKey()), [patient, lines, d.discountBps, promotionId, branchId]);

  const charge = () => {
    if (!patient) return toast.error("Elige un paciente.");
    if (d.error) return toast.error(d.error);
    if (pay.error) return toast.error(pay.error);
    start(async () => {
      const r = await posSaleAction({
        patientId: patient.id,
        branchId,
        items: lines.map((l) => ({ studyId: l.studyId, quantity: l.quantity })),
        discountBps: d.discountBps,
        promotionId,
        parts: pay.parts,
        idempotencyKey: key,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.data.duplicate ? "Esta venta ya estaba registrada" : "Cobro registrado");
      router.push(`/crm/caja/recibo/${r.data.groupId}`);
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_24rem]">
      <div className="grid min-w-0 grid-cols-1 content-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField id="pos-patient" label="Paciente" required>
              <PatientPicker id="pos-patient" value={patient} onChange={setPatient} />
            </FormField>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estudios</CardTitle>
          </CardHeader>
          <CardContent>
            <LineItemsEditor lines={lines} onChange={setLines} compact />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Descuento y total</CardTitle>
          </CardHeader>
          <CardContent>
            <DiscountSummary
              discountPct={discountPct}
              onDiscountPct={setDiscountPct}
              promotionId={promotionId}
              onPromotion={setPromotionId}
              promotions={promotions}
              maxBps={d.maxBps}
              roleMaxBps={roleMaxBps}
              error={d.error}
              totals={d.totals}
            />
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit xl:sticky xl:top-24">
        <CardHeader>
          <CardTitle>Cobro</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {pay.fields}
          <Button size="lg" onClick={charge} loading={pending} disabled={!sessionOpen || !patient || !lines.length || !!d.error || !!pay.error}>
            <ShoppingCart /> Cobrar {formatMoney(Math.max(0, pay.charge))}
          </Button>
          {!sessionOpen ? <p className="text-xs font-medium text-destructive">Abre la caja para registrar cobros.</p> : null}
          <p className="text-xs text-muted-foreground">Se crea la orden confirmada y se registra el cobro en la caja abierta.</p>
        </CardContent>
      </Card>
    </div>
  );
}
