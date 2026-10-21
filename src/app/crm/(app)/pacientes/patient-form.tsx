"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { savePatientAction } from "@/server/actions/patients";
import type { DuplicateCandidate } from "@/server/services/patients";
import { CONTACT_SOURCE, PATIENT_TYPE } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";

export type PatientFormValues = {
  id?: string;
  firstName?: string;
  lastName?: string;
  secondLastName?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  type?: string;
  status?: string;
  source?: string;
  branchId?: string;
  partnerId?: string | null;
  contactConsent?: boolean;
  prefersWhatsApp?: boolean;
  prefersEmail?: boolean;
  prefersPhone?: boolean;
  adminNotes?: string | null;
};

export function PatientFormDialog({
  initial,
  branches,
  partners,
  defaultBranchId,
}: {
  initial?: PatientFormValues;
  branches: { id: string; name: string }[];
  partners: { id: string; organization: string }[];
  defaultBranchId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(null);
  const [pending, start] = useTransition();
  const editing = Boolean(initial?.id);
  const v = initial ?? {};

  const submit = (formData: FormData, confirm = false) => {
    if (confirm) formData.set("confirmDuplicate", "true");
    start(async () => {
      const r = await savePatientAction(initial?.id ?? null, formData);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
        return;
      }
      if ("duplicates" in r.data) {
        setDuplicates(r.data.duplicates);
        return;
      }
      toast.success(editing ? "Paciente actualizado" : "Paciente registrado");
      setOpen(false);
      setDuplicates(null);
      router.push(`/crm/pacientes/${r.data.id}`);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setErrors({});
          setDuplicates(null);
        }
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="outline">
            <Pencil /> Editar datos
          </Button>
        ) : (
          <Button>
            <UserPlus /> Nuevo paciente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar paciente" : "Nuevo paciente"}</DialogTitle>
          <DialogDescription>Solo datos administrativos y de contacto. No registres información clínica.</DialogDescription>
        </DialogHeader>
        <form
          id="patient-form"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="firstName" label="Nombre(s)" required error={errors.firstName}>
              <Input id="firstName" name="firstName" defaultValue={v.firstName} aria-invalid={!!errors.firstName} autoComplete="off" />
            </FormField>
            <FormField id="lastName" label="Apellido paterno" required error={errors.lastName}>
              <Input id="lastName" name="lastName" defaultValue={v.lastName} aria-invalid={!!errors.lastName} autoComplete="off" />
            </FormField>
            <FormField id="secondLastName" label="Apellido materno" error={errors.secondLastName}>
              <Input id="secondLastName" name="secondLastName" defaultValue={v.secondLastName ?? ""} autoComplete="off" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="birthDate" label="Fecha de nacimiento" error={errors.birthDate}>
              <Input id="birthDate" name="birthDate" type="date" defaultValue={v.birthDate ?? ""} aria-invalid={!!errors.birthDate} />
            </FormField>
            <FormField id="phone" label="Teléfono" error={errors.phone} hint="10 dígitos">
              <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={v.phone ?? ""} aria-invalid={!!errors.phone} />
            </FormField>
            <FormField id="email" label="Correo" error={errors.email}>
              <Input id="email" name="email" type="email" defaultValue={v.email ?? ""} aria-invalid={!!errors.email} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="branchId" label="Sucursal habitual" required error={errors.branchId}>
              <NativeSelect id="branchId" name="branchId" defaultValue={v.branchId ?? defaultBranchId ?? branches[0]?.id}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="type" label="Tipo de paciente" error={errors.type}>
              <NativeSelect id="type" name="type" defaultValue={v.type ?? "PARTICULAR"}>
                {Object.entries(PATIENT_TYPE).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="source" label="Medio de contacto" error={errors.source}>
              <NativeSelect id="source" name="source" defaultValue={v.source ?? "WALK_IN"}>
                {Object.entries(CONTACT_SOURCE).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="partnerId" label="Convenio o empresa (opcional)" error={errors.partnerId}>
              <NativeSelect id="partnerId" name="partnerId" defaultValue={v.partnerId ?? ""}>
                <option value="">Sin convenio</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.organization}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            {editing ? (
              <FormField id="status" label="Estado">
                <NativeSelect id="status" name="status" defaultValue={v.status ?? "ACTIVE"}>
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                </NativeSelect>
              </FormField>
            ) : null}
          </div>

          <fieldset className="grid gap-3 rounded-lg border bg-muted/40 p-4">
            <legend className="px-1 font-display text-xs font-bold text-brand-ink">Autorización y preferencias de contacto</legend>
            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox name="contactConsent" value="true" defaultChecked={v.contactConsent ?? false} className="mt-0.5" />
              <span>
                El paciente autoriza que lo contactemos para recordatorios y seguimiento administrativo.
                <span className="block text-xs text-muted-foreground">Requerido para enviarle mensajes que no haya solicitado.</span>
              </span>
            </label>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox name="prefersWhatsApp" value="true" defaultChecked={v.prefersWhatsApp ?? true} /> WhatsApp
              </label>
              <label className="flex items-center gap-2">
                <Checkbox name="prefersPhone" value="true" defaultChecked={v.prefersPhone ?? false} /> Llamada
              </label>
              <label className="flex items-center gap-2">
                <Checkbox name="prefersEmail" value="true" defaultChecked={v.prefersEmail ?? false} /> Correo
              </label>
            </div>
          </fieldset>

          <FormField id="adminNotes" label="Notas administrativas" error={errors.adminNotes} hint="Sin datos clínicos, diagnósticos ni resultados.">
            <Textarea id="adminNotes" name="adminNotes" defaultValue={v.adminNotes ?? ""} rows={2} />
          </FormField>

          {duplicates ? (
            <div role="alert" className="rounded-lg border border-brand-amber/40 bg-brand-amberSoft p-4">
              <p className="flex items-center gap-2 font-display text-sm font-bold text-brand-amber">
                <AlertTriangle className="h-4 w-4" /> Posible paciente duplicado
              </p>
              <ul className="mt-2 grid gap-1.5 text-sm">
                {duplicates.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <a href={`/crm/pacientes/${d.id}`} className="font-semibold text-brand-blue hover:underline" target="_blank" rel="noreferrer">
                        {d.name}
                      </a>{" "}
                      <span className="text-muted-foreground">
                        · {d.folio} · {d.reason}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Revisa si ya existe antes de registrar una nueva ficha.</p>
            </div>
          ) : null}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          {duplicates ? (
            <Button
              variant="secondary"
              loading={pending}
              onClick={() => {
                const form = document.getElementById("patient-form") as HTMLFormElement;
                submit(new FormData(form), true);
              }}
            >
              Guardar de todos modos
            </Button>
          ) : (
            <Button type="submit" form="patient-form" loading={pending}>
              {editing ? "Guardar cambios" : "Registrar paciente"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
