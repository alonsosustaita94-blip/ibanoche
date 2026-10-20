import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tones = {
  blue: "bg-brand-ice text-brand-blue",
  turquoise: "bg-brand-mint text-[#1f8f94]",
  coral: "bg-brand-blush text-[#c23444]",
  amber: "bg-brand-amberSoft text-brand-amber",
};

/** Tarjeta de indicador. `delta` es la variación porcentual vs. el periodo anterior (null si no aplica). */
export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  delta,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  delta?: number | null;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        {delta !== undefined && delta !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.7rem] font-semibold tabular",
              delta >= 0 ? "bg-brand-greenSoft text-brand-green" : "bg-brand-blush text-[#c23444]",
            )}
            title="Variación contra el periodo anterior"
          >
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(0)} %
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-brand-ink tabular">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
      {hint ? <p className="mt-1 text-[0.7rem] text-muted-foreground/80">{hint}</p> : null}
    </Card>
  );
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
