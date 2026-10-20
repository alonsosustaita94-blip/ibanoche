"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { loginAction, type LoginState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined);
  return (
    <form action={action} className="mt-6 grid gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormField id="email" label="Correo">
        <Input id="email" name="email" type="email" autoComplete="username" required placeholder="nombre@ibanoche.mx" />
      </FormField>
      <FormField id="password" label="Contraseña">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </FormField>
      {state?.error ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-brand-blush px-3 py-2 text-sm text-[#c23444]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" loading={pending}>
        Entrar
      </Button>
    </form>
  );
}
