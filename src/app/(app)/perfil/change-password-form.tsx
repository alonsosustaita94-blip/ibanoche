"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { changePasswordAction } from "@/server/actions/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";

export function ChangePasswordForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
        <CardDescription>Al cambiarla se cierran tus sesiones en otros dispositivos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={ref}
          className="grid gap-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await changePasswordAction(fd);
              if (!r.ok) {
                setErrors(r.fieldErrors ?? {});
                toast.error(r.error);
                return;
              }
              setErrors({});
              ref.current?.reset();
              toast.success(r.message ?? "Contraseña actualizada");
            });
          }}
        >
          <FormField id="current" label="Contraseña actual" error={errors.current}>
            <Input id="current" name="current" type="password" autoComplete="current-password" aria-invalid={!!errors.current} />
          </FormField>
          <FormField id="password" label="Nueva contraseña" error={errors.password} hint="Mínimo 10 caracteres con letras y números.">
            <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} />
          </FormField>
          <FormField id="confirm" label="Confirmar nueva contraseña" error={errors.confirm}>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} />
          </FormField>
          <Button type="submit" loading={pending} className="mt-1">
            Actualizar contraseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
