"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveOpportunityAction } from "@/server/actions/opportunities";
import { CLIENT_TYPE } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";

export type Option = { id: string; name: string };

export type OpportunityFormValues = {
  id?: string;
  title?: string;
  prospectName?: string;
  prospectPhone?: string | null;
  clientType?: string;
  estimatedCents?: number;
  ownerId?: string | null;
  branchId?: string;
  nextFollowUpAt?: string | null; // "YYYY-MM-DDTHH:mm" local
  notes?: string | null;
  partnerId?: string | null;
  patientId?: string | null;
};

/** Diálogo para crear o editar una oportunidad. */
export function OpportunityFormDialog({
  trigger,
  initial,
  owners,
  branches,
  partners,
  patientName,
  title,
  onSaved,
}: {
  trigger: React.ReactNode;
  initial?: OpportunityFormValues;
  owners: Option[];
  branches: Option[];
  partners: Option[];
  patientName?: string;
  title?: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const v = initial ?? {};
  const editing = Boolean(v.id);
  const formId = `opp-form-${v.id ?? "new"}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setErrors({});
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{title ?? (editing ? "Editar oportunidad" : "Nueva oportunidad")}</DialogTitle>
          <DialogDescription>Seguimiento comercial. No registres información clínica.</DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await saveOpportunityAction(v.id ?? null, fd);
              if (!r.ok) {
                setErrors(r.fieldErrors ?? {});
                toast.error(r.error);
                return;
              }
              toast.success(editing ? "Oportunidad actualizada" : "Oportunidad registrada");
              setOpen(false);
              onSaved?.();
              router.refresh();
            });
          }}
        >
          {v.patientId ? <input type="hidden" name="patientId" value={v.patientId} /> : null}
          <FormField id={`${formId}-title`} label="Título" required error={errors.title}>
            <Input id={`${formId}-title`} name="title" defaultValue={v.title} aria-invalid={!!errors.title} placeholder="Ej. Chequeo anual de personal" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={`${formId}-prospect`} label="Nombre del prospecto" required error={errors.prospectName}>
              <Input id={`${formId}-prospect`} name="prospectName" defaultValue={v.prospectName} aria-invalid={!!errors.prospectName} />
            </FormField>
            <FormField id={`${formId}-phone`} label="Teléfono" error={errors.prospectPhone}>
              <Input id={`${formId}-phone`} name="prospectPhone" type="tel" defaultValue={v.prospectPhone ?? ""} aria-invalid={!!errors.prospectPhone} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id={`${formId}-type`} label="Tipo de cliente" error={errors.clientType}>
              <NativeSelect id={`${formId}-type`} name="clientType" defaultValue={v.clientType ?? "COMPANY"}>
                {Object.entries(CLIENT_TYPE).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id={`${formId}-value`} label="Valor estimado (MXN)" error={errors.estimatedCents}>
              <Input
                id={`${formId}-value`}
                name="estimatedCents"
                inputMode="decimal"
                defaultValue={v.estimatedCents ? (v.estimatedCents / 100).toFixed(2) : ""}
                placeholder="0.00"
                aria-invalid={!!errors.estimatedCents}
              />
            </FormField>
            <FormField id={`${formId}-follow`} label="Próximo seguimiento" error={errors.nextFollowUpAt}>
              <Input id={`${formId}-follow`} name="nextFollowUpAt" type="datetime-local" defaultValue={v.nextFollowUpAt ?? ""} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id={`${formId}-owner`} label="Responsable" error={errors.ownerId}>
              <NativeSelect id={`${formId}-owner`} name="ownerId" defaultValue={v.ownerId ?? ""}>
                <option value="">Sin asignar</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id={`${formId}-branch`} label="Sucursal" required error={errors.branchId}>
              <NativeSelect id={`${formId}-branch`} name="branchId" defaultValue={v.branchId ?? branches[0]?.id}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id={`${formId}-partner`} label="Convenio (opcional)" error={errors.partnerId}>
              <NativeSelect id={`${formId}-partner`} name="partnerId" defaultValue={v.partnerId ?? ""}>
                <option value="">Sin convenio</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          {patientName ? <p className="rounded-lg bg-brand-ice px-3 py-2 text-xs text-brand-blue">Vinculada al paciente {patientName}</p> : null}
          <FormField id={`${formId}-notes`} label="Notas" error={errors.notes}>
            <Textarea id={`${formId}-notes`} name="notes" rows={3} defaultValue={v.notes ?? ""} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {editing ? "Guardar cambios" : "Registrar oportunidad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

