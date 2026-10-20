"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveNotificationSettingsAction, savePaymentSettingsAction } from "@/server/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/checkbox";

type Item = { key: string; label: string; description: string };

function ToggleCard({
  title,
  description,
  items,
  values,
  disabled,
  action,
}: {
  title: string;
  description: string;
  items: Item[];
  values: Record<string, boolean>;
  disabled: boolean;
  action: (fd: FormData) => Promise<{ ok: boolean; message?: string; error?: string }>;
}) {
  const [state, setState] = useState(values);
  const [pending, start] = useTransition();
  const dirty = items.some((i) => state[i.key] !== values[i.key]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-1">
        {items.map((i) => (
          <label key={i.key} className="flex items-center justify-between gap-4 rounded-lg px-1 py-3 hover:bg-muted/50">
            <span>
              <span className="block text-sm font-semibold text-brand-ink">{i.label}</span>
              <span className="block text-xs text-muted-foreground">{i.description}</span>
            </span>
            <Switch checked={state[i.key]} disabled={disabled} onCheckedChange={(v) => setState((s) => ({ ...s, [i.key]: v }))} aria-label={i.label} />
          </label>
        ))}
        {disabled ? null : (
          <div className="mt-3 flex justify-end">
            <Button
              loading={pending}
              disabled={!dirty}
              onClick={() => {
                const fd = new FormData();
                for (const i of items) fd.set(i.key, state[i.key] ? "true" : "false");
                start(async () => {
                  const r = await action(fd);
                  if (r.ok) toast.success(r.message ?? "Guardado");
                  else toast.error(r.error);
                });
              }}
            >
              Guardar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PaymentsForm({ values, disabled }: { values: { CASH: boolean; CARD: boolean; TRANSFER: boolean }; disabled: boolean }) {
  return (
    <ToggleCard
      title="Métodos de pago"
      description="Métodos disponibles en Caja / POS. Debe quedar al menos uno activo."
      disabled={disabled}
      values={values}
      action={savePaymentSettingsAction}
      items={[
        { key: "CASH", label: "Efectivo", description: "Se incluye en el efectivo esperado del corte de caja." },
        { key: "CARD", label: "Tarjeta", description: "Registro manual del cobro hecho en la terminal bancaria." },
        { key: "TRANSFER", label: "Transferencia", description: "Registro con la referencia del comprobante." },
      ]}
    />
  );
}

export function NotificationsForm({ values, disabled }: { values: { appointmentReminders: boolean; quoteFollowUp: boolean; dailySummary: boolean }; disabled: boolean }) {
  return (
    <ToggleCard
      title="Notificaciones"
      description="Avisos internos del CRM. Los recordatorios a pacientes solo se envían con su autorización de contacto y cuando exista un canal conectado."
      disabled={disabled}
      values={values}
      action={saveNotificationSettingsAction}
      items={[
        { key: "appointmentReminders", label: "Recordatorios de cita a pacientes", description: "Requiere WhatsApp conectado (no configurado)." },
        { key: "quoteFollowUp", label: "Seguimiento de cotizaciones", description: "Avisa al personal sobre cotizaciones próximas a vencer." },
        { key: "dailySummary", label: "Resumen diario", description: "Resumen de citas, cobros y pendientes para supervisores." },
      ]}
    />
  );
}
