"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { cancelAgreementAction, saveAgreementAction, savePartnerAction, setPartnerStatusAction } from "@/server/actions/partners";
import { AGREEMENT_STATUS, PARTNER_STATUS, PARTNER_TYPE } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { notifyResult } from "@/components/shared/action-toast";

type Option = { id: string; name: string };

export type PartnerFormValues = {
  id?: string;
  organization?: string;
  contactName?: string;
  phone?: string | null;
  email?: string | null;
  type?: string;
  status?: string;
  ownerId?: string | null;
  branchId?: string | null;
  startDate?: string | null;
  notes?: string | null;
};

export function PartnerFormDialog({ initial, owners, branches }: { initial?: PartnerFormValues; owners: Option[]; branches: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const v = initial ?? {};
  const editing = Boolean(v.id);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setErrors({});
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="outline">
            <Pencil /> Editar datos
          </Button>
        ) : (
          <Button>
            <Plus /> Nuevo convenio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar convenio" : "Nuevo convenio"}</DialogTitle>
          <DialogDescription>Médicos referidores, clínicas, hospitales, empresas, escuelas e instituciones.</DialogDescription>
        </DialogHeader>
        <form
          id="partner-form"
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await savePartnerAction(v.id ?? null, fd);
              if (!r.ok) {
                setErrors(r.fieldErrors ?? {});
                toast.error(r.error);
                return;
              }
              toast.success(editing ? "Convenio actualizado" : "Convenio registrado");
              setOpen(false);
              if (!editing) router.push(`/convenios/${r.data.id}`);
              router.refresh();
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="organization" label="Organización" required error={errors.organization}>
              <Input id="organization" name="organization" defaultValue={v.organization} aria-invalid={!!errors.organization} />
            </FormField>
            <FormField id="contactName" label="Contacto" required error={errors.contactName}>
              <Input id="contactName" name="contactName" defaultValue={v.contactName} aria-invalid={!!errors.contactName} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="phone" label="Teléfono" error={errors.phone}>
              <Input id="phone" name="phone" type="tel" defaultValue={v.phone ?? ""} aria-invalid={!!errors.phone} />
            </FormField>
            <FormField id="email" label="Correo" error={errors.email}>
              <Input id="email" name="email" type="email" defaultValue={v.email ?? ""} aria-invalid={!!errors.email} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="type" label="Tipo" error={errors.type}>
              <NativeSelect id="type" name="type" defaultValue={v.type ?? "COMPANY"}>
                {Object.entries(PARTNER_TYPE).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="status" label="Estado" error={errors.status}>
              <NativeSelect id="status" name="status" defaultValue={v.status ?? "PROSPECT"}>
                {Object.entries(PARTNER_STATUS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l.label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="startDate" label="Fecha de inicio" error={errors.startDate}>
              <Input id="startDate" name="startDate" type="date" defaultValue={v.startDate ?? ""} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="ownerId" label="Ejecutivo responsable" error={errors.ownerId}>
              <NativeSelect id="ownerId" name="ownerId" defaultValue={v.ownerId ?? ""}>
                <option value="">Sin asignar</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="branchId" label="Sucursal de atención" error={errors.branchId}>
              <NativeSelect id="branchId" name="branchId" defaultValue={v.branchId ?? ""}>
                <option value="">Todas las sucursales</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <FormField id="notes" label="Observaciones" error={errors.notes}>
            <Textarea id="notes" name="notes" rows={3} defaultValue={v.notes ?? ""} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="partner-form" loading={pending}>
            {editing ? "Guardar cambios" : "Registrar convenio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PartnerStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      Estado
      <NativeSelect
        className="h-9 w-44 text-xs font-semibold"
        value={status}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            if (notifyResult(await setPartnerStatusAction(id, e.target.value))) router.refresh();
          })
        }
      >
        {Object.entries(PARTNER_STATUS).map(([k, l]) => (
          <option key={k} value={k}>
            {l.label}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}

export type AgreementValues = {
  id?: string;
  name?: string;
  discountPct?: string;
  validFrom?: string;
  validTo?: string | null;
  status?: string;
  terms?: string | null;
};

export function AgreementFormDialog({ partnerId, initial }: { partnerId: string; initial?: AgreementValues }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const v = initial ?? {};
  const editing = Boolean(v.id);
  const formId = `agreement-${v.id ?? "new"}`;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setErrors({});
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Editar acuerdo" title="Editar acuerdo">
            <Pencil />
          </Button>
        ) : (
          <Button variant="secondary" size="sm">
            <Plus /> Nuevo acuerdo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar acuerdo" : "Nuevo acuerdo"}</DialogTitle>
          <DialogDescription>
            El descuento de un acuerdo vigente se vuelve un descuento autorizado en las cotizaciones y órdenes de los pacientes vinculados a este convenio. Máximo 30 %.
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await saveAgreementAction(v.id ?? null, fd);
              if (!r.ok) {
                setErrors(r.fieldErrors ?? {});
                toast.error(r.error);
                return;
              }
              toast.success(editing ? "Acuerdo actualizado" : "Acuerdo registrado");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="partnerId" value={partnerId} />
          <FormField id={`${formId}-name`} label="Nombre del acuerdo" required error={errors.name}>
            <Input id={`${formId}-name`} name="name" defaultValue={v.name} aria-invalid={!!errors.name} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={`${formId}-discount`} label="Descuento (%)" error={errors.discountBps} hint="Entre 0 y 30">
              <Input id={`${formId}-discount`} name="discountBps" inputMode="decimal" defaultValue={v.discountPct ?? "0"} aria-invalid={!!errors.discountBps} />
            </FormField>
            <FormField id={`${formId}-status`} label="Estado" error={errors.status}>
              <NativeSelect id={`${formId}-status`} name="status" defaultValue={v.status ?? "DRAFT"}>
                {Object.entries(AGREEMENT_STATUS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l.label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={`${formId}-from`} label="Vigente desde" required error={errors.validFrom}>
              <Input id={`${formId}-from`} name="validFrom" type="date" defaultValue={v.validFrom ?? new Date().toISOString().slice(0, 10)} aria-invalid={!!errors.validFrom} />
            </FormField>
            <FormField id={`${formId}-to`} label="Vigente hasta" error={errors.validTo}>
              <Input id={`${formId}-to`} name="validTo" type="date" defaultValue={v.validTo ?? ""} aria-invalid={!!errors.validTo} />
            </FormField>
          </div>
          <FormField id={`${formId}-terms`} label="Condiciones" error={errors.terms}>
            <Textarea id={`${formId}-terms`} name="terms" rows={3} defaultValue={v.terms ?? ""} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CancelAgreementButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-brand-blush hover:text-destructive" aria-label={`Cancelar acuerdo ${name}`} title="Cancelar acuerdo">
          <Ban />
        </Button>
      }
      title="Cancelar acuerdo"
      description={`“${name}” dejará de otorgar descuentos autorizados. Esta acción queda registrada.`}
      confirmLabel="Cancelar acuerdo"
      variant="destructive"
      onConfirm={async () => {
        const ok = notifyResult(await cancelAgreementAction(id));
        if (ok) router.refresh();
        return ok;
      }}
    />
  );
}
