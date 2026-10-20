import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { site } from "@/config/site";
import { scenes, type SceneName } from "./illustrations";

/** Logotipo tipográfico temporal. Se reemplazará por el logotipo oficial. */
export function Logo({ inverted = false, className = "" }: { inverted?: boolean; className?: string }) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`} aria-label={`${site.name}, ${site.tagline}`}>
      <span
        className={`font-display text-[1.6rem] font-bold tracking-[0.04em] ${inverted ? "text-white" : "text-brand-blue"}`}
      >
        IBANOCHE
      </span>
      <span
        className={`mt-1 font-display text-[0.5rem] font-semibold uppercase tracking-[0.2em] ${inverted ? "text-brand-mint" : "text-brand-turquoise"}`}
      >
        • {site.tagline} •
      </span>
    </span>
  );
}

type Tone = "blue" | "turquoise" | "coral";

const toneBg: Record<Tone, string> = {
  blue: "bg-brand-ice text-brand-blue",
  turquoise: "bg-brand-mint text-brand-turquoise",
  coral: "bg-brand-blush text-brand-coral",
};

export function IconBadge({ icon: Icon, tone = "blue", size = "md" }: { icon: LucideIcon; tone?: Tone; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-10 w-10" : "h-12 w-12";
  const iconDims = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-5 w-5" : "h-6 w-6";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full ${dims} ${toneBg[tone]}`}>
      <Icon className={iconDims} strokeWidth={1.8} aria-hidden />
    </span>
  );
}

/** Título de dos tonos: primera parte en azul, resaltado en turquesa. */
export function Heading({
  as: Tag = "h2",
  lead,
  highlight,
  className = "",
  id,
}: {
  id?: string;
  as?: "h1" | "h2" | "h3";
  lead?: string;
  highlight?: string;
  className?: string;
}) {
  const size =
    Tag === "h1"
      ? "text-[2.1rem] leading-[1.08] sm:text-5xl lg:text-[3.6rem]"
      : "text-[1.75rem] leading-tight sm:text-4xl lg:text-[2.6rem]";
  return (
    <Tag id={id} className={`text-balance font-display font-bold text-brand-blue ${size} ${className}`}>
      {lead}
      {lead && highlight ? " " : null}
      {highlight ? <span className="text-brand-turquoise">{highlight}</span> : null}
    </Tag>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-brand-turquoise">
      <span className="h-0.5 w-8 rounded-full bg-brand-turquoise" aria-hidden />
      {children}
    </p>
  );
}

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

const buttonBase =
  "inline-flex min-h-[3.25rem] items-center whitespace-nowrap justify-center gap-2.5 rounded-full px-7 font-display text-[0.95rem] font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-turquoise/40 active:scale-[0.98]";

export const buttonStyles = {
  primary: `${buttonBase} bg-brand-blue text-white shadow-soft hover:bg-brand-navy hover:shadow-lift`,
  turquoise: `${buttonBase} bg-brand-turquoise text-white shadow-glow hover:bg-[#28A3A9]`,
  outline: `${buttonBase} border-2 border-brand-blue/15 bg-white text-brand-blue hover:border-brand-turquoise hover:text-brand-turquoise`,
  ghostLight: `${buttonBase} border-2 border-white/40 text-white hover:bg-white hover:text-brand-blue`,
};

export function ButtonLink({
  href,
  variant = "primary",
  icon: Icon,
  children,
}: {
  href: string;
  variant?: keyof typeof buttonStyles;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonStyles[variant]}>
      {Icon ? <Icon className="h-5 w-5" aria-hidden /> : null}
      {children}
    </Link>
  );
}

/**
 * Espacio fotográfico. Muestra la foto configurada o, si aún no existe,
 * una ilustración científica en colores de marca.
 */
export function Photo({
  src,
  scene,
  alt,
  className = "",
  fade,
  variant,
}: {
  src?: string | null;
  scene: SceneName;
  alt: string;
  className?: string;
  fade?: "left" | "bottom";
  variant?: number;
}) {
  const Scene = scenes[scene] as (p: { className?: string; variant?: number }) => React.ReactElement;
  const mask =
    fade === "left"
      ? "[mask-image:linear-gradient(to_right,transparent,black_28%)]"
      : fade === "bottom"
        ? "[mask-image:linear-gradient(to_top,transparent,black_30%)]"
        : "";
  return (
    <div className={`relative overflow-hidden ${mask} ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src.startsWith("/") ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${src}` : src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <Scene className="h-full w-full" variant={variant} />
      )}
    </div>
  );
}

/** Formas orgánicas de esquina del manual de marca. */
export function OrganicCorner({ position = "bottom-left", className = "" }: { position?: "bottom-left" | "top-right" | "bottom-right"; className?: string }) {
  const pos =
    position === "bottom-left"
      ? "-bottom-10 -left-10"
      : position === "top-right"
        ? "-right-10 -top-10 rotate-180"
        : "-bottom-10 -right-10 -scale-x-100";
  return (
    <div className={`pointer-events-none absolute ${pos} h-44 w-44 ${className}`} aria-hidden>
      <div className="absolute bottom-0 left-0 h-36 w-36 rounded-[2.5rem] rounded-tr-[5rem] bg-gradient-to-br from-brand-turquoise/80 to-brand-blue/70" />
      <div className="absolute bottom-0 left-0 h-20 w-24 rounded-[2rem] rounded-tr-[4rem] bg-brand-coral/80" />
    </div>
  );
}
