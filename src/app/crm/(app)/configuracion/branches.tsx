"use client";

import { useState, useTransition } from "react";
import { Building2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveBranchAction } from "@/server/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormField } from "@/components/shared/form-field";

type Branch = { id: string; code: string; name: string; address: string | null; phone: string | null; active: boolean; isDemo: boolean; users: number; patients: number };

function BranchDialog({ branch }: { branch?: Branch }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setErrors({}); }}>
      <DialogTrigger asChild>
        {branch ? (
          <Button variant="ghost" size="sm">
            <Pencil /> Editar
          </Button>
        ) : (
          <Button>
            <Plus /> Nueva sucursal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{branch ? "Editar sucursal" : "Nueva sucursal"}</DialogTitle>
          <DialogDescription>{branch ? "Los cambios se registran en la auditoría." : "Se crea con un horario inicial de lunes a sábado que puedes ajustar en Horarios."}</DialogDescription>
        </DialogHeader>
        <form
          id="branch-form"
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await saveBranchAction(branch?.id ?? null, fd);
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
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <FormField id="code" label="Clave" required error={errors.code}>
              <Input id="code" name="code" defaultValue={branch?.code} aria-invalid={!!errors.code} className="uppercase" />
            </FormField>
            <FormField id="name" label="Nombre" required error={errors.name}>
              <Input id="name" name="name" defaultValue={branch?.name} aria-invalid={!!errors.name} />
            </FormField>
          </div>
          <FormField id="address" label="Dirección" error={errors.address}>
            <Input id="address" name="address" defaultValue={branch?.address ?? ""} />
          </FormField>
          <FormField id="phone" label="Teléfono" error={errors.phone}>
            <Input id="phone" name="phone" type="tel" defaultValue={branch?.phone ?? ""} />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="active" value="true" defaultChecked={branch?.active ?? true} /> Sucursal activa
          </label>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="branch-form" loading={pending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BranchesPanel({ branches, disabled }: { branches: Branch[]; disabled: boolean }) {
  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Sucursales</CardTitle>
          <CardDescription>Cada usuario solo ve la información de las sucursales que tiene asignadas.</CardDescription>
        </div>
        {disabled ? null : <BranchDialog />}
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Sucursal</TableHead>
            <TableHead className="hidden md:table-cell">Dirección</TableHead>
            <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
            <TableHead className="text-right">Usuarios</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Pacientes</TableHead>
            <TableHead>Estado</TableHead>
            {disabled ? null : <TableHead className="pr-5" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="pl-5">
                <span className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-ice text-brand-blue">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{b.name}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{b.code}</span>
                  </span>
                  {b.isDemo ? <Badge tone="amber">Demo</Badge> : null}
                </span>
              </TableCell>
              <TableCell className="hidden max-w-[16rem] truncate md:table-cell">{b.address ?? "—"}</TableCell>
              <TableCell className="hidden whitespace-nowrap sm:table-cell">{b.phone ?? "—"}</TableCell>
              <TableCell className="text-right tabular">{b.users}</TableCell>
              <TableCell className="hidden text-right tabular sm:table-cell">{b.patients}</TableCell>
              <TableCell>
                <Badge tone={b.active ? "green" : "gray"} dot>
                  {b.active ? "Activa" : "Inactiva"}
                </Badge>
              </TableCell>
              {disabled ? null : (
                <TableCell className="pr-5 text-right">
                  <BranchDialog branch={b} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
