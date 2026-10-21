"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Ban, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { addOrderNoteAction, changeOrderStatusAction, requestInvoiceAction, voidPaymentAction } from "@/server/actions/orders";
import { ORDER_STATUS } from "@/lib/labels";
import { CFDI_USES, TAX_REGIMES } from "@/lib/validation/order";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { notifyResult } from "@/components/shared/action-toast";

export function OrderStatusActions({ orderId, transitions }: { orderId: string; transitions: string[] }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  if (!transitions.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((to) =>
        to === "CANCELLED" ? (
          <ConfirmDialog
            key={to}
            trigger={
              <Button variant="outline" className="text-destructive">
                <Ban /> Cancelar orden
              </Button>
            }
            title="¿Cancelar la orden?"
            description="La cancelación queda registrada en la bitácora. Si la orden tiene pagos, anúlalos primero."
            confirmLabel="Cancelar orden"
            variant="destructive"
            onConfirm={async () => {
              if (reason.trim().length < 3) {
                toast.error("Indica el motivo de la cancelación.");
                return false;
              }
              const r = await changeOrderStatusAction(orderId, to, reason);
              if (notifyResult(r)) router.refresh();
              return r.ok;
            }}
          >
            <FormField id="cancel-reason" label="Motivo" required>
              <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} />
            </FormField>
          </ConfirmDialog>
        ) : (
          <ConfirmDialog
            key={to}
            trigger={<Button variant={to === "COMPLETED" ? "secondary" : "soft"}>Marcar {ORDER_STATUS[to].label.toLowerCase()}</Button>}
            title={`¿Cambiar a “${ORDER_STATUS[to].label}”?`}
            onConfirm={async () => {
              const r = await changeOrderStatusAction(orderId, to);
              if (notifyResult(r)) router.refresh();
              return r.ok;
            }}
          />
        ),
      )}
    </div>
  );
}

export function OrderNoteForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          if (notifyResult(await addOrderNoteAction(orderId, note))) {
            setNote("");
            router.refresh();
          }
        });
      }}
    >
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota administrativa (sin datos clínicos)" aria-label="Nota administrativa" maxLength={1000} />
      <Button type="submit" variant="outline" loading={pending} disabled={note.trim().length < 3} className="shrink-0">
        Agregar nota
      </Button>
    </form>
  );
}

export function VoidPaymentButton({ paymentId, folio }: { paymentId: string; folio: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm" className="text-destructive">
          Anular
        </Button>
      }
      title={`¿Anular el cobro ${folio}?`}
      description="El cobro no se borra: queda marcado como anulado y se recalcula el saldo de la orden."
      confirmLabel="Anular cobro"
      variant="destructive"
      onConfirm={async () => {
        const r = await voidPaymentAction(paymentId, reason);
        if (notifyResult(r)) router.refresh();
        return r.ok;
      }}
    >
      <FormField id={`void-${paymentId}`} label="Motivo" required>
        <Textarea id={`void-${paymentId}`} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} />
      </FormField>
    </ConfirmDialog>
  );
}

export function InvoiceRequestForm({ orderId, defaultEmail }: { orderId: string; defaultEmail: string | null }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <form
      ref={ref}
      className="grid gap-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        start(async () => {
          const r = await requestInvoiceAction({ ...data, orderId });
          if (!r.ok) {
            setErrors(r.fieldErrors ?? {});
            toast.error(r.error);
            return;
          }
          toast.success("Solicitud de factura registrada");
          router.refresh();
        });
      }}
    >
      <FormField id="rfc" label="RFC" required error={errors.rfc}>
        <Input id="rfc" name="rfc" className="uppercase" maxLength={13} aria-invalid={!!errors.rfc} />
      </FormField>
      <FormField id="legalName" label="Razón social" required error={errors.legalName}>
        <Input id="legalName" name="legalName" maxLength={200} aria-invalid={!!errors.legalName} />
      </FormField>
      <FormField id="taxRegime" label="Régimen fiscal" required error={errors.taxRegime}>
        <NativeSelect id="taxRegime" name="taxRegime" defaultValue="">
          <option value="" disabled>
            Elige…
          </option>
          {TAX_REGIMES.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="cfdiUse" label="Uso de CFDI" required error={errors.cfdiUse}>
        <NativeSelect id="cfdiUse" name="cfdiUse" defaultValue="D01">
          {CFDI_USES.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="zipCode" label="Código postal fiscal" required error={errors.zipCode}>
        <Input id="zipCode" name="zipCode" inputMode="numeric" maxLength={5} aria-invalid={!!errors.zipCode} />
      </FormField>
      <FormField id="invoiceEmail" label="Correo para la factura" required error={errors.email}>
        <Input id="invoiceEmail" name="email" type="email" defaultValue={defaultEmail ?? ""} aria-invalid={!!errors.email} />
      </FormField>
      <div>
        <Button type="submit" variant="outline" loading={pending}>
          <FileCheck2 /> Registrar solicitud de factura
        </Button>
      </div>
    </form>
  );
}
