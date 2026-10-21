import { cn } from "@/lib/utils";

/** Marca del producto. Logotipo tipográfico provisional (sustituible por el oficial). */
export function BrandMark({ inverted = false, compact = false, className }: { inverted?: boolean; compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          inverted ? "bg-white/15" : "bg-gradient-to-br from-brand-blue to-brand-turquoise",
        )}
        aria-hidden
      >
        <span className="absolute h-4 w-1.5 rounded-sm bg-white" />
        <span className="absolute h-1.5 w-4 rounded-sm bg-white" />
        <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-brand-coral" />
      </span>
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span className={cn("font-display text-[1.05rem] font-extrabold tracking-wide", inverted ? "text-white" : "text-brand-blue")}>
            IBANOCHE <span className={inverted ? "text-brand-mint" : "text-brand-turquoise"}>CRM</span>
          </span>
          <span className={cn("mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em]", inverted ? "text-white/70" : "text-muted-foreground")}>
            Laboratorio de análisis clínicos
          </span>
        </span>
      )}
    </span>
  );
}
