import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FlaskConical, HeartPulse, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/layout/brand";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSessionUser()) redirect("/crm/dashboard");
  const { next } = await searchParams;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-blue via-[#155fa8] to-brand-turquoise p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[40px] border-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-48 w-48 rounded-[3rem] bg-brand-coral/60" aria-hidden />
        <BrandMark inverted size="lg" />
        <div className="mt-auto max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Administración y gestión comercial <span className="text-brand-mint">inteligente.</span>
          </h1>
          <p className="mt-4 text-white/80">
            Pacientes, agenda, cotizaciones, caja y seguimiento comercial del laboratorio en un solo lugar.
          </p>
          <ul className="mt-8 grid gap-3 text-sm text-white/85">
            <li className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-brand-mint" /> Acceso por roles y registro de cambios</li>
            <li className="flex items-center gap-3"><HeartPulse className="h-4 w-4 text-brand-mint" /> Sin resultados ni datos clínicos</li>
            <li className="flex items-center gap-3"><FlaskConical className="h-4 w-4 text-brand-mint" /> Preparado para Emilia IA</li>
          </ul>
        </div>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <h2 className="mt-8 font-display text-2xl font-bold text-brand-ink">Inicia sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">Usa tu cuenta del laboratorio.</p>
          <LoginForm next={next} />
        </div>
      </main>
    </div>
  );
}
