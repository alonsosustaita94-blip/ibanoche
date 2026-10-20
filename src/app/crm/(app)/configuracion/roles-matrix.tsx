"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveRolePermissionsAction } from "@/server/actions/users";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Role = { key: string; name: string; description: string | null; permissions: string[]; maxDiscountBps: number };

const LOCKED: Record<string, string[]> = { ADMIN: ["users.manage", "settings.manage", "settings.view"] };

export function RolesMatrix({ roles, permissions }: { roles: Role[]; permissions: { key: string; label: string }[] }) {
  const initial = useMemo(() => Object.fromEntries(roles.map((r) => [r.key, { perms: new Set(r.permissions), discount: String(r.maxDiscountBps / 100) }])), [roles]);
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [, start] = useTransition();

  const dirty = (key: string) => {
    const r = roles.find((x) => x.key === key)!;
    const s = state[key];
    return s.discount !== String(r.maxDiscountBps / 100) || s.perms.size !== r.permissions.length || r.permissions.some((p) => !s.perms.has(p));
  };

  const toggle = (role: string, perm: string, on: boolean) =>
    setState((s) => {
      const perms = new Set(s[role].perms);
      if (on) perms.add(perm);
      else perms.delete(perm);
      return { ...s, [role]: { ...s[role], perms } };
    });

  const save = (role: string) => {
    setSaving(role);
    start(async () => {
      const r = await saveRolePermissionsAction({ roleKey: role, permissions: [...state[role].perms], maxDiscount: state[role].discount });
      setSaving(null);
      if (r.ok) toast.success(r.message ?? "Guardado");
      else toast.error(r.fieldErrors?.maxDiscount ?? r.error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles y permisos</CardTitle>
        <CardDescription>Los permisos se validan en el servidor en cada acción. El descuento máximo aplica en cotizaciones, órdenes y caja.</CardDescription>
      </CardHeader>
      <div className="overflow-x-auto px-5 pb-5 scrollbar-thin">
        <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card py-2 pr-3 text-left text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">Permiso</th>
              {roles.map((r) => (
                <th key={r.key} className="px-2 py-2 text-center align-bottom">
                  <span className="block font-display text-xs font-bold text-brand-ink">{r.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => (
              <tr key={p.key} className="hover:bg-muted/50">
                <td className="sticky left-0 z-10 border-t bg-card py-2 pr-3">
                  <span className="block text-brand-ink">{p.label}</span>
                  <span className="block font-mono text-[0.65rem] text-muted-foreground">{p.key}</span>
                </td>
                {roles.map((r) => {
                  const locked = LOCKED[r.key]?.includes(p.key);
                  return (
                    <td key={r.key} className="border-t px-2 py-2 text-center">
                      <Checkbox
                        checked={state[r.key].perms.has(p.key)}
                        disabled={locked}
                        onCheckedChange={(v) => toggle(r.key, p.key, v === true)}
                        aria-label={`${p.label} para ${r.name}`}
                        title={locked ? "Permiso obligatorio del administrador" : undefined}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="sticky left-0 z-10 border-t bg-card py-3 pr-3 font-semibold text-brand-ink">Descuento máximo (%)</td>
              {roles.map((r) => (
                <td key={r.key} className="border-t px-2 py-3 text-center">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={state[r.key].discount}
                    onChange={(e) => setState((s) => ({ ...s, [r.key]: { ...s[r.key], discount: e.target.value } }))}
                    className="mx-auto h-8 w-20 text-center"
                    aria-label={`Descuento máximo para ${r.name}`}
                  />
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 z-10 bg-card" />
              {roles.map((r) => (
                <td key={r.key} className="px-2 pt-2 text-center">
                  <Button size="sm" variant={dirty(r.key) ? "default" : "outline"} disabled={!dirty(r.key)} loading={saving === r.key} onClick={() => save(r.key)} className={cn(!dirty(r.key) && "opacity-60")}>
                    Guardar
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
