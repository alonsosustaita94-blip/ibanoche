"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveStudyAction } from "@/server/actions/catalog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import type { CategoryOption, StudyRow } from "./types";

export function StudyFormDialog({
  categories,
  canViewCost,
  initial,
  open: controlledOpen,
  onOpenChange,
}: {
  categories: CategoryOption[];
  canViewCost: boolean;
  initial?: StudyRow;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const router = useRouter();
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const editing = Boolean(initial);
  const v = initial;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setErrors({});
      }}
    >
      {controlledOpen === undefined ? (
        <Button onClick={() => setOpen(true)}>
          <Plus /> Agregar estudio
        </Button>
      ) : null}
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${v?.code}` : "Agregar estudio"}</DialogTitle>
          <DialogDescription>Datos administrativos del estudio. No registres resultados ni valores clínicos.</DialogDescription>
        </DialogHeader>
        <form
          id="study-form"
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await saveStudyAction(initial?.id ?? null, fd);
              if (!r.ok) {
                setErrors(r.fieldErrors ?? {});
                toast.error(r.error);
                return;
              }
              toast.success(editing ? "Estudio actualizado" : "Estudio agregado al catálogo");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <FormField id="code" label="Código" required error={errors.code}>
              <Input id="code" name="code" defaultValue={v?.code} className="uppercase" aria-invalid={!!errors.code} autoComplete="off" />
            </FormField>
            <FormField id="name" label="Nombre del estudio" required error={errors.name}>
              <Input id="name" name="name" defaultValue={v?.name} aria-invalid={!!errors.name} autoComplete="off" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="categoryId" label="Categoría" required error={errors.categoryId}>
              <NativeSelect id="categoryId" name="categoryId" defaultValue={v?.categoryId ?? categories[0]?.id}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="synonyms" label="Sinónimos" hint="Separados por coma. Mejoran la búsqueda." error={errors.synonyms}>
              <Input id="synonyms" name="synonyms" defaultValue={v?.synonyms.join(", ")} placeholder="bh, hemograma" />
            </FormField>
          </div>

          {!editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="publicPrice" label="Precio público (MXN)" required error={errors.publicPrice} hint="Se registra como la primera tarifa vigente.">
                <Input id="publicPrice" name="publicPrice" inputMode="decimal" placeholder="0.00" aria-invalid={!!errors.publicPrice} />
              </FormField>
              {canViewCost ? (
                <FormField id="internalCost" label="Costo interno (MXN)" error={errors.internalCost} hint="Solo visible para roles autorizados.">
                  <Input id="internalCost" name="internalCost" inputMode="decimal" placeholder="Opcional" />
                </FormField>
              ) : null}
            </div>
          ) : null}

          <fieldset className="grid gap-4 rounded-lg border bg-muted/40 p-4">
            <legend className="px-1 font-display text-xs font-bold text-brand-ink">Información validada por el laboratorio</legend>
            <p className="flex items-start gap-2 text-xs text-brand-amber">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Captura únicamente textos aprobados por el laboratorio. No redactes indicaciones por tu cuenta; si no están aprobadas, déjalas vacías.
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <FormField id="sampleType" label="Tipo de muestra" error={errors.sampleType}>
                <Input id="sampleType" name="sampleType" defaultValue={v?.sampleType ?? ""} />
              </FormField>
              <label className="flex h-10 items-center gap-2 text-sm">
                <Checkbox name="sampleTypeValidated" value="true" defaultChecked={v?.sampleTypeValidated} /> Validado
              </label>
            </div>
            <div className="grid gap-2">
              <FormField id="instructions" label="Indicaciones de preparación" error={errors.instructions}>
                <Textarea id="instructions" name="instructions" rows={3} defaultValue={v?.instructions ?? ""} />
              </FormField>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="instructionsApproved" value="true" defaultChecked={v?.instructionsApproved} /> Indicaciones aprobadas para publicarse
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <FormField id="turnaround" label="Tiempo de entrega administrativo" error={errors.turnaround}>
                <Input id="turnaround" name="turnaround" defaultValue={v?.turnaround ?? ""} placeholder="Ej. mismo día" />
              </FormField>
              <label className="flex h-10 items-center gap-2 text-sm">
                <Checkbox name="turnaroundConfirmed" value="true" defaultChecked={v?.turnaroundConfirmed} /> Confirmado
              </label>
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="active" value="true" defaultChecked={v?.active ?? true} /> Estudio activo (disponible para cotizar y vender)
          </label>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="study-form" loading={pending}>
            {editing ? "Guardar cambios" : "Agregar estudio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
