import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

/** Acceso a Emilia. Indica con claridad que la IA aún no está conectada. */
export function EmiliaCard() {
  const connected = Boolean(process.env.EMILIA_AGENT_URL);
  return (
    <Link
      href="/emilia"
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br from-brand-blue to-brand-turquoise p-5 text-white shadow-card transition hover:shadow-pop"
    >
      <span className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border-[18px] border-white/10" aria-hidden />
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-base font-bold">Emilia</p>
          <p className="text-xs text-white/80">Tu asistente IA, siempre contigo</p>
        </div>
      </div>
      <p className="mt-6 text-sm text-white/90">
        {connected ? "Conectada al CRM. Revisa las conversaciones activas." : "Integración preparada. La IA aún no está conectada: las conversaciones visibles son simuladas."}
      </p>
      <span className="mt-4 inline-flex items-center gap-1 font-display text-sm font-semibold">
        Abrir bandeja <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
