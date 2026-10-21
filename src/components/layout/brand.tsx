import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logotipo oficial de IBANOCHE en el CRM.
 * - Normal: versión horizontal a color con la etiqueta "CRM".
 * - inverted: versión blanca para fondos oscuros.
 * - compact: solo el símbolo.
 */
export function BrandMark({
  inverted = false,
  compact = false,
  size = "md",
  className,
}: {
  inverted?: boolean;
  compact?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  if (compact) {
    return (
      <Image
        src={inverted ? "/brand/ibanoche-simbolo-blanco.png" : "/brand/ibanoche-simbolo.png"}
        alt="IBANOCHE"
        width={283}
        height={300}
        className={cn("h-9 w-auto", className)}
      />
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src={inverted ? "/brand/ibanoche-horizontal-blanco.png" : "/brand/ibanoche-horizontal.png"}
        alt="IBANOCHE, Laboratorio de Análisis Clínicos"
        width={1209}
        height={312}
        priority
        className={size === "lg" ? "h-14 w-auto" : "h-10 w-auto"}
      />
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 font-display text-[0.6rem] font-bold tracking-wider",
          inverted ? "bg-white/20 text-white" : "bg-brand-mint text-[#1f8f94]",
        )}
      >
        CRM
      </span>
    </span>
  );
}
