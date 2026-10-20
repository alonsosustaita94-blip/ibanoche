import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NoAccess() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-blush text-brand-coral">
        <ShieldAlert className="h-6 w-6" />
      </span>
      <h1 className="font-display text-xl font-bold text-brand-ink">No tienes acceso a esta sección</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Tu rol no incluye este módulo. Si lo necesitas, pide a un administrador que actualice tus permisos.</p>
      <Link href="/crm/dashboard" className={buttonVariants()}>
        Volver al dashboard
      </Link>
    </main>
  );
}
