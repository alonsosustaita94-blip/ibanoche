"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { savePromotionAction } from "@/server/actions/settings";
import { formatDate } from "@/lib/dates";
import { bpsToPercent } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";

type Promotion = { id: string; name: string; discountBps: number; active: boolean; validFrom: string | null; validTo: string | null };

function status(p: Promotion) {
  const today = new Date().toISOString().slice(0, 10);
  if (!p.active) return { label: "Inactiva", tone: "gray" as const };
  if (p.validTo && p.validTo < today) return { label: "Vencida", tone: "amber" as const };
  if (p.validFrom && p.validFrom > today) return { label: "Programada", tone: "blue" as const };
  return { label: "Vigente", tone: "green" as const };
}

function PromotionDialog({ promotion }: { promotion?: Promotion }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setErrors({});
      }}
    >
      <DialogTrigger asChild>
        {promotion ? (
          <Button variant="ghost" size="sm">
            <Pencil /> Editar
          </Button>
        ) : (
          <Button>
            <Plus /> Nueva promoción
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{promotion ? "Editar promoción" : "Nueva promoción"}</DialogTitle>
          <DialogDescription>Una promoción vigente permite aplicar su descuento aunque supere el máximo del rol.</DialogDescription>
        </DialogHeader>
        <form
          id="promo-form"
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await savePromotionAction(promotion?.id ?? null, fd);
              if (!r.ok) {
                setErrors(r.fieldErrors ?? {});
                toast.error(r.error);
                return;
              }
              toast.success(r.message ?? "Guardado");
              setOpen(false);
            });
          }}
        >
          <FormField id="p-name" label="Nombre" required error={errors.name}>
            <Input id="p-name" name="name" defaultValue={promotion?.name} aria-invalid={!!errors.name} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="p-discount" label="Descuento (%)" required error={errors.discount}>
              <Input id="p-discount" name="discount" type="number" min={0.5} max={100} step={0.5} defaultValue={promotion ? promotion.discountBps / 100 : ""} aria-invalid={!!errors.discount} />
            </FormField>
            <FormField id="p-from" label="Desde" error={errors.validFrom}>
              <Input id="p-from" name="validFrom" type="date" defaultValue={promotion?.validFrom ?? ""} />
            </FormField>
            <FormField id="p-to" label="Hasta" error={errors.validTo}>
              <Input id="p-to" name="validTo" type="date" defaultValue={promotion?.validTo ?? ""} aria-invalid={!!errors.validTo} />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="active" value="true" defaultChecked={promotion?.active ?? true} /> Promoción activa
          </label>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="promo-form" loading={pending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PromotionsPanel({ promotions, roles, disabled }: { promotions: Promotion[]; roles: { name: string; max: string }[]; disabled: boolean }) {
  return (
    <div className="grid gap-4 2xl:grid-cols-[1fr_18rem]">
      <Card className="min-w-0">
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Promociones</CardTitle>
            <CardDescription>Descuentos autorizados que el personal puede aplicar.</CardDescription>
          </div>
          {disabled ? null : <PromotionDialog />}
        </CardHeader>
        {promotions.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Promoción</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead className="hidden sm:table-cell">Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                {disabled ? null : <TableHead className="pr-5" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((p) => {
                const s = status(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="min-w-[14rem] pl-5 font-semibold">
                      <span className="flex items-center gap-2">
                        <Tag className="h-4 w-4 shrink-0 text-brand-coral" /> {p.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular">{bpsToPercent(p.discountBps)}</TableCell>
                    <TableCell className="hidden whitespace-nowrap text-xs sm:table-cell">
                      {p.validFrom || p.validTo ? `${p.validFrom ? formatDate(`${p.validFrom}T12:00:00`) : "Sin inicio"} – ${p.validTo ? formatDate(`${p.validTo}T12:00:00`) : "Sin fin"}` : "Permanente"}
                    </TableCell>
                    <TableCell>
                      <Badge tone={s.tone} dot>
                        {s.label}
                      </Badge>
                    </TableCell>
                    {disabled ? null : (
                      <TableCell className="pr-5 text-right">
                        <PromotionDialog promotion={p} />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState icon={Tag} title="Sin promociones" description="Crea una promoción para autorizar un descuento temporal." />
        )}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Descuento máximo por rol</CardTitle>
          <CardDescription>Se edita en Usuarios y roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm">
            {roles.map((r) => (
              <li key={r.name} className="flex justify-between gap-3">
                <span className="text-brand-ink">{r.name}</span>
                <span className="font-semibold tabular text-brand-blue">{r.max}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
