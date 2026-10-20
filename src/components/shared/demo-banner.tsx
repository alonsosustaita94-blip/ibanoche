import { FlaskConical } from "lucide-react";

/** Aviso permanente de entorno de demostración. */
export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-brand-amberSoft print:hidden px-4 py-1.5 text-center text-[0.72rem] font-semibold text-brand-amber">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Entorno de demostración · Todos los pacientes, precios y movimientos son ficticios
    </div>
  );
}
