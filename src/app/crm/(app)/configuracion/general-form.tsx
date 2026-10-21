"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveGeneralSettingsAction } from "@/server/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";

type Values = { businessName: string; timezone: string; currency: string; quoteValidityDays: number; minAdvanceMinutes: number; maxDaysAhead: number };

export function GeneralForm({ values, disabled }: { values: Values; disabled: boolean }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await saveGeneralSettingsAction(fd);
          setErrors(r.ok ? {} : (r.fieldErrors ?? {}));
          if (r.ok) toast.success(r.message ?? "Guardado");
          else toast.error(r.error);
        });
      }}
      noValidate
    >
      <fieldset disabled={disabled} className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Información general</CardTitle>
            <CardDescription>Datos del negocio que aparecen en cotizaciones y comprobantes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField id="businessName" label="Nombre del negocio" required error={errors.businessName} className="sm:col-span-3">
              <Input id="businessName" name="businessName" defaultValue={values.businessName} aria-invalid={!!errors.businessName} />
            </FormField>
            <FormField id="timezone" label="Zona horaria" hint="Definida por el servidor (APP_TIMEZONE).">
              <Input id="timezone" value={values.timezone} readOnly disabled />
            </FormField>
            <FormField id="currency" label="Moneda">
              <Input id="currency" value="MXN — Peso mexicano" readOnly disabled />
              <input type="hidden" name="currency" value="MXN" />
            </FormField>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reglas de operación</CardTitle>
            <CardDescription>Vigencia de cotizaciones y reglas para agendar citas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField id="quoteValidityDays" label="Vigencia de cotizaciones (días)" error={errors.quoteValidityDays}>
              <Input id="quoteValidityDays" name="quoteValidityDays" type="number" min={1} max={90} defaultValue={values.quoteValidityDays} />
            </FormField>
            <FormField id="minAdvanceMinutes" label="Anticipación mínima para citas (min)" error={errors.minAdvanceMinutes}>
              <Input id="minAdvanceMinutes" name="minAdvanceMinutes" type="number" min={0} max={2880} defaultValue={values.minAdvanceMinutes} />
            </FormField>
            <FormField id="maxDaysAhead" label="Agendar hasta (días adelante)" error={errors.maxDaysAhead}>
              <Input id="maxDaysAhead" name="maxDaysAhead" type="number" min={1} max={365} defaultValue={values.maxDaysAhead} />
            </FormField>
          </CardContent>
        </Card>
      </fieldset>
      {disabled ? null : (
        <div className="flex justify-end">
          <Button type="submit" loading={pending}>
            Guardar cambios
          </Button>
        </div>
      )}
    </form>
  );
}
