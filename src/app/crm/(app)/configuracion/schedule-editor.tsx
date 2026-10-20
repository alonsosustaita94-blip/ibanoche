"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveScheduleAction } from "@/server/actions/settings";
import { WEEKDAYS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Switch } from "@/components/ui/checkbox";
import { Input, NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Row = { weekday: number; active: boolean; opensAt: string; closesAt: string; slotMinutes: number; capacity: number; homeService: boolean };
type Branch = { id: string; name: string; schedules: Row[] };

// Lunes primero; domingo al final.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

function rowsFor(branch: Branch | undefined): Row[] {
  return ORDER.map(
    (weekday) =>
      branch?.schedules.find((s) => s.weekday === weekday) ?? { weekday, active: false, opensAt: "07:00", closesAt: "14:00", slotMinutes: 30, capacity: 2, homeService: false },
  );
}

export function ScheduleEditor({ branches, initialBranchId, disabled }: { branches: Branch[]; initialBranchId?: string; disabled: boolean }) {
  const [branchId, setBranchId] = useState(initialBranchId ?? branches[0]?.id);
  const [rows, setRows] = useState<Row[]>(() => rowsFor(branches.find((b) => b.id === initialBranchId)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const update = (weekday: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));

  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Horarios de atención</CardTitle>
          <CardDescription>Definen los horarios y el cupo disponibles en la agenda y para Emilia.</CardDescription>
        </div>
        <NativeSelect
          aria-label="Sucursal"
          className="sm:w-64"
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value);
            setRows(rowsFor(branches.find((b) => b.id === e.target.value)));
            setErrors({});
          }}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
      </CardHeader>
      <div className="overflow-x-auto px-5 pb-5 scrollbar-thin">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="text-left text-[0.68rem] uppercase tracking-wider text-muted-foreground">
              <th className="py-2 font-semibold">Día</th>
              <th className="py-2 font-semibold">Abre</th>
              <th className="py-2 font-semibold">Cierra</th>
              <th className="py-2 font-semibold">Intervalo (min)</th>
              <th className="py-2 font-semibold">Capacidad por intervalo</th>
              <th className="py-2 font-semibold">A domicilio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const err = Object.entries(errors).find(([k]) => k.startsWith(`rows.${i}.`))?.[1];
              return (
                <tr key={r.weekday} className={cn("border-t", !r.active && "text-muted-foreground")}>
                  <td className="py-2.5 pr-3">
                    <label className="flex items-center gap-2.5 font-semibold">
                      <Switch checked={r.active} disabled={disabled} onCheckedChange={(v) => update(r.weekday, { active: v })} aria-label={`Abrir ${WEEKDAYS[r.weekday]}`} />
                      {WEEKDAYS[r.weekday]}
                    </label>
                    {err ? <p className="mt-1 text-xs text-destructive">{err}</p> : null}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Input type="time" step={600} value={r.opensAt} disabled={disabled || !r.active} onChange={(e) => update(r.weekday, { opensAt: e.target.value })} className="h-9 w-28" aria-label={`Apertura ${WEEKDAYS[r.weekday]}`} />
                  </td>
                  <td className="py-2.5 pr-3">
                    <Input type="time" step={600} value={r.closesAt} disabled={disabled || !r.active} onChange={(e) => update(r.weekday, { closesAt: e.target.value })} className="h-9 w-28" aria-label={`Cierre ${WEEKDAYS[r.weekday]}`} />
                  </td>
                  <td className="py-2.5 pr-3">
                    <Input type="number" min={10} max={120} step={5} value={r.slotMinutes} disabled={disabled || !r.active} onChange={(e) => update(r.weekday, { slotMinutes: Number(e.target.value) })} className="h-9 w-24" aria-label={`Intervalo ${WEEKDAYS[r.weekday]}`} />
                  </td>
                  <td className="py-2.5 pr-3">
                    <Input type="number" min={1} max={20} value={r.capacity} disabled={disabled || !r.active} onChange={(e) => update(r.weekday, { capacity: Number(e.target.value) })} className="h-9 w-24" aria-label={`Capacidad ${WEEKDAYS[r.weekday]}`} />
                  </td>
                  <td className="py-2.5">
                    <Checkbox checked={r.homeService} disabled={disabled || !r.active} onCheckedChange={(v) => update(r.weekday, { homeService: v === true })} aria-label={`Servicio a domicilio ${WEEKDAYS[r.weekday]}`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {disabled ? null : (
          <div className="mt-4 flex justify-end">
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await saveScheduleAction({ branchId, rows });
                  if (r.ok) {
                    setErrors({});
                    toast.success(r.message ?? "Guardado");
                  } else {
                    setErrors(r.fieldErrors ?? {});
                    toast.error(r.error);
                  }
                })
              }
            >
              Guardar horario
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
