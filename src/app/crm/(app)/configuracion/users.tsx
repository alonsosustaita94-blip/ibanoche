"use client";

import { useState, useTransition } from "react";
import { KeyRound, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createUserAction, resetUserPasswordAction, updateUserAction } from "@/server/actions/users";
import { formatDateTime } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormField } from "@/components/shared/form-field";

type UserRow = {
  id: string;
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  active: boolean;
  isDemo: boolean;
  lastLoginAt: string | null;
  branchIds: string[];
  branchNames: string[];
};
type Option = { id: string; name: string };
type RoleOption = { key: string; name: string };

const PASSWORD_HINT = "Mínimo 10 caracteres con letras y números.";

function BranchChecklist({ branches, value, onChange, error }: { branches: Option[]; value: string[]; onChange: (v: string[]) => void; error?: string }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-xs font-semibold text-brand-ink">
        Sucursales asignadas <span className="text-destructive">*</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {branches.map((b) => (
          <label key={b.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <Checkbox checked={value.includes(b.id)} onCheckedChange={(c) => onChange(c ? [...value, b.id] : value.filter((x) => x !== b.id))} />
            {b.name}
          </label>
        ))}
      </div>
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </fieldset>
  );
}

function UserDialog({ user, roles, branches, isSelf }: { user?: UserRow; roles: RoleOption[]; branches: Option[]; isSelf?: boolean }) {
  const [open, setOpen] = useState(false);
  const [branchIds, setBranchIds] = useState<string[]>(user?.branchIds ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const editing = Boolean(user);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setErrors({});
        if (o) setBranchIds(user?.branchIds ?? []);
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="sm">
            <Pencil /> Editar
          </Button>
        ) : (
          <Button>
            <UserPlus /> Nuevo usuario
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {editing ? "Si cambias el rol, las sucursales o desactivas la cuenta, se cerrarán sus sesiones abiertas." : "Comparte la contraseña temporal por un medio seguro."}
          </DialogDescription>
        </DialogHeader>
        <form
          id="user-form"
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const payload = {
              name: fd.get("name"),
              email: fd.get("email"),
              roleKey: fd.get("roleKey"),
              password: fd.get("password"),
              active: fd.get("active") ?? "false",
              branchIds,
            };
            start(async () => {
              const r = editing ? await updateUserAction(user!.id, payload) : await createUserAction(payload);
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="u-name" label="Nombre completo" required error={errors.name}>
              <Input id="u-name" name="name" defaultValue={user?.name} aria-invalid={!!errors.name} />
            </FormField>
            <FormField id="u-email" label="Correo" required={!editing} error={errors.email} hint={editing ? "El correo no se puede cambiar." : undefined}>
              <Input id="u-email" name="email" type="email" defaultValue={user?.email} disabled={editing} aria-invalid={!!errors.email} autoComplete="off" />
            </FormField>
            <FormField id="u-role" label="Rol" required error={errors.roleKey} hint={isSelf ? "No puedes cambiar tu propio rol." : undefined}>
              <NativeSelect id="u-role" name="roleKey" defaultValue={user?.roleKey ?? "RECEPTION"} disabled={isSelf}>
                {roles.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </NativeSelect>
              {isSelf ? <input type="hidden" name="roleKey" value={user?.roleKey} /> : null}
            </FormField>
            {editing ? (
              <FormField id="u-active" label="Estado">
                <label className="flex h-10 items-center gap-2 text-sm">
                  <Checkbox name="active" value="true" defaultChecked={user?.active} disabled={isSelf} /> Cuenta activa
                </label>
                {isSelf ? <input type="hidden" name="active" value="true" /> : null}
              </FormField>
            ) : (
              <FormField id="u-password" label="Contraseña temporal" required error={errors.password} hint={PASSWORD_HINT}>
                <Input id="u-password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} />
              </FormField>
            )}
          </div>
          <BranchChecklist branches={branches} value={branchIds} onChange={setBranchIds} error={errors.branchIds} />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" loading={pending}>
            {editing ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user }: { user: UserRow }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => {
        setOpen(o);
        setError(undefined);
      }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Restablecer contraseña de ${user.name}`}>
          <KeyRound />
        </Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>Se cerrarán todas las sesiones de {user.name}.</DialogDescription>
        </DialogHeader>
        <form
          id="reset-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const password = new FormData(e.currentTarget).get("password");
            start(async () => {
              const r = await resetUserPasswordAction(user.id, { password });
              if (!r.ok) {
                setError(r.fieldErrors?.password ?? r.error);
                return;
              }
              toast.success(r.message ?? "Contraseña restablecida");
              setOpen(false);
            });
          }}
        >
          <FormField id="reset-password" label="Nueva contraseña temporal" error={error} hint={PASSWORD_HINT}>
            <Input id="reset-password" name="password" type="password" autoComplete="new-password" aria-invalid={!!error} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="reset-form" loading={pending}>
            Restablecer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersPanel({ users, roles, branches, currentUserId }: { users: UserRow[]; roles: RoleOption[]; branches: Option[]; currentUserId: string }) {
  return (
    <Card>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>Accesos al CRM por rol y sucursal.</CardDescription>
        </div>
        <UserDialog roles={roles} branches={branches} />
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Nombre</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead className="hidden lg:table-cell">Sucursales</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="hidden md:table-cell">Último acceso</TableHead>
            <TableHead className="pr-5 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} className={u.active ? "" : "opacity-60"}>
              <TableCell className="pl-5">
                <span className="flex items-center gap-2.5">
                  <Avatar name={u.name} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {u.name} {u.id === currentUserId ? <span className="text-xs font-normal text-muted-foreground">(tú)</span> : null}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <Badge tone={u.roleKey === "ADMIN" ? "solid" : "blue"}>{u.roleName}</Badge>
              </TableCell>
              <TableCell className="hidden min-w-[9rem] max-w-[16rem] lg:table-cell">
                <span className="line-clamp-2 text-xs" title={u.branchNames.join(", ")}>
                  {u.branchIds.length && u.branchIds.length === branches.length ? `Todas (${branches.length})` : u.branchNames.map((n) => n.replace("Sucursal ", "")).join(", ") || "—"}
                </span>
              </TableCell>
              <TableCell>
                <Badge tone={u.active ? "green" : "gray"} dot>
                  {u.active ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
              <TableCell className="hidden whitespace-nowrap text-xs md:table-cell">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Nunca"}</TableCell>
              <TableCell className="pr-5 text-right">
                <span className="inline-flex items-center gap-1">
                  <UserDialog user={u} roles={roles} branches={branches} isSelf={u.id === currentUserId} />
                  <ResetPasswordDialog user={u} />
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
