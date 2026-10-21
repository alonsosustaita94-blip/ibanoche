"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, Plus, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { createApiKeyAction, revokeApiKeyAction } from "@/server/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";

type Client = { id: string; name: string; keyPrefix: string; scopes: string[]; branchName: string | null; lastUsedAt: string | null; createdAt: string; active: boolean };
type Scope = { key: string; label: string };

function CreateKeyDialog({ scopes, branches }: { scopes: Scope[]; branches: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(scopes.map((s) => s.key));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const reset = () => {
    setSelected(scopes.map((s) => s.key));
    setErrors({});
    setCreated(null);
    setCopied(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus /> Nueva llave
        </Button>
      </DialogTrigger>
      <DialogContent size="lg" onInteractOutside={(e) => created && e.preventDefault()}>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Copia la llave ahora</DialogTitle>
              <DialogDescription>Por seguridad solo se muestra esta vez. Guárdala en el gestor de secretos del servicio de Emilia.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/60 p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-xs text-brand-ink" data-testid="new-api-key">
                {created}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(created);
                    setCopied(true);
                  } catch {
                    toast.error("No se pudo copiar. Selecciona el texto y cópialo manualmente.");
                  }
                }}
              >
                {copied ? <Check /> : <Copy />} {copied ? "Copiada" : "Copiar"}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Ya la guardé</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nueva llave de API</DialogTitle>
              <DialogDescription>Concede solo los permisos que el servicio necesita.</DialogDescription>
            </DialogHeader>
            <form
              id="key-form"
              className="grid gap-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                start(async () => {
                  const r = await createApiKeyAction({ name: fd.get("name"), branchId: fd.get("branchId"), scopes: selected });
                  if (!r.ok) {
                    setErrors(r.fieldErrors ?? {});
                    toast.error(r.error);
                    return;
                  }
                  setCreated(r.data.key);
                });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="k-name" label="Nombre" required error={errors.name}>
                  <Input id="k-name" name="name" defaultValue="Emilia IA" aria-invalid={!!errors.name} />
                </FormField>
                <FormField id="k-branch" label="Restringir a sucursal">
                  <NativeSelect id="k-branch" name="branchId" defaultValue="">
                    <option value="">Todas las sucursales</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-xs font-semibold text-brand-ink">Permisos</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {scopes.map((s) => (
                    <label key={s.key} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                      <Checkbox checked={selected.includes(s.key)} onCheckedChange={(c) => setSelected((v) => (c ? [...v, s.key] : v.filter((x) => x !== s.key)))} />
                      <span>
                        {s.label}
                        <span className="block font-mono text-[0.65rem] text-muted-foreground">{s.key}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.scopes ? <p className="text-xs font-medium text-destructive">{errors.scopes}</p> : null}
              </fieldset>
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" form="key-form" loading={pending}>
                Crear llave
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ApiKeysPanel({ clients, scopes, branches, disabled }: { clients: Client[]; scopes: Scope[]; branches: { id: string; name: string }[]; disabled: boolean }) {
  const label = (k: string) => scopes.find((s) => s.key === k)?.label ?? k;
  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Llaves de API de Emilia</CardTitle>
          <CardDescription>Solo se guarda una huella (hash) de cada llave. Cada llamada se valida por permiso y queda en la auditoría.</CardDescription>
        </div>
        {disabled ? null : <CreateKeyDialog scopes={scopes} branches={branches} />}
      </CardHeader>
      {clients.length ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Llave</TableHead>
              <TableHead className="hidden lg:table-cell">Permisos</TableHead>
              <TableHead className="hidden md:table-cell">Último uso</TableHead>
              <TableHead>Estado</TableHead>
              {disabled ? null : <TableHead className="pr-5" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id} className={c.active ? "" : "opacity-60"}>
                <TableCell className="pl-5">
                  <span className="flex items-center gap-2.5">
                    <KeyRound className="h-4 w-4 shrink-0 text-brand-turquoise" />
                    <span className="min-w-0">
                      <span className="block font-semibold">{c.name}</span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {c.keyPrefix}… · {c.branchName ?? "Todas las sucursales"}
                      </span>
                    </span>
                  </span>
                </TableCell>
                <TableCell className="hidden max-w-[22rem] lg:table-cell">
                  <span className="flex flex-wrap gap-1">
                    {c.scopes.map((s) => (
                      <Badge key={s} tone="blue">
                        {label(s)}
                      </Badge>
                    ))}
                  </span>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-xs md:table-cell">{c.lastUsedAt ?? "Sin uso"}</TableCell>
                <TableCell>
                  <Badge tone={c.active ? "green" : "gray"} dot>
                    {c.active ? "Activa" : "Revocada"}
                  </Badge>
                </TableCell>
                {disabled ? null : (
                  <TableCell className="pr-5 text-right">
                    {c.active ? (
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-brand-blush hover:text-destructive">
                            <ShieldOff /> Revocar
                          </Button>
                        }
                        title="Revocar llave"
                        description={`El servicio que use ${c.keyPrefix}… dejará de tener acceso de inmediato. Esta acción no se puede deshacer.`}
                        confirmLabel="Revocar"
                        variant="destructive"
                        onConfirm={async () => {
                          const r = await revokeApiKeyAction(c.id);
                          if (r.ok) toast.success(r.message ?? "Revocada");
                          else toast.error(r.error);
                          return r.ok;
                        }}
                      />
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState icon={KeyRound} title="Sin llaves de API" />
      )}
    </Card>
  );
}
