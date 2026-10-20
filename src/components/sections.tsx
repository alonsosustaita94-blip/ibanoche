import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Clock,
  HeartHandshake,
  Microscope,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { site, type Branch } from "@/config/site";
import { ContactAction } from "./actions";
import { Reveal } from "./reveal";
import { Container, Heading, IconBadge, Photo } from "./ui";

type Tone = "blue" | "turquoise" | "coral";
export type Feature = { icon: LucideIcon; title: string; text?: string; tone?: Tone };

/** Franja horizontal de beneficios con iconos (debajo del hero). */
export function BenefitStrip({ items, className = "" }: { items: Feature[]; className?: string }) {
  return (
    <div className={`rounded-4xl border border-brand-gray bg-white p-3 shadow-soft ${className}`}>
      <ul className="grid grid-cols-2 gap-1 lg:grid-cols-4">
        {items.map((f, i) => (
          <li
            key={f.title}
            className={`flex flex-col items-start gap-3 rounded-3xl p-4 sm:flex-row sm:items-center sm:p-5 ${
              i < items.length - 1 ? "lg:border-r lg:border-brand-gray lg:rounded-none" : ""
            }`}
          >
            <IconBadge icon={f.icon} tone={f.tone ?? "blue"} />
            <div className="min-w-0">
              <p className="font-display text-[0.95rem] font-semibold leading-snug text-brand-blue">{f.title}</p>
              {f.text ? <p className="mt-1 text-sm leading-snug">{f.text}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const toneAccent: Record<Tone, string> = {
  blue: "from-brand-blue to-brand-blue/40",
  turquoise: "from-brand-turquoise to-brand-turquoise/40",
  coral: "from-brand-coral to-brand-coral/40",
};
const toneSoft: Record<Tone, string> = {
  blue: "bg-gradient-to-b from-brand-ice/70 to-white",
  turquoise: "bg-gradient-to-b from-brand-mint/80 to-white",
  coral: "bg-gradient-to-b from-brand-blush/80 to-white",
};

/** Tarjeta de beneficio con icono, título, texto y detalle gráfico inferior. */
export function FeatureCard({ feature, index = 0 }: { feature: Feature; index?: number }) {
  const tone = feature.tone ?? "blue";
  return (
    <Reveal delay={index * 90} className="h-full">
      <article className={`card-lift relative flex h-full flex-col overflow-hidden rounded-4xl border border-white p-7 shadow-soft ${toneSoft[tone]}`}>
        <IconBadge icon={feature.icon} tone={tone} size="lg" />
        <h3 className="mt-6 font-display text-lg font-bold leading-snug text-brand-blue">{feature.title}</h3>
        {feature.text ? <p className="mt-3 text-[0.95rem] leading-relaxed">{feature.text}</p> : null}
        <div className="mt-auto pt-7" aria-hidden>
          <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${toneAccent[tone]}`} />
        </div>
      </article>
    </Reveal>
  );
}

export const whyUsFeatures: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Resultados confiables",
    text: "Procesos cuidadosos en cada etapa para que puedas confiar en tus resultados.",
    tone: "blue",
  },
  {
    icon: HeartHandshake,
    title: "Atención profesional y humana",
    text: "Te recibimos con trato cercano, respetuoso y con información clara.",
    tone: "coral",
  },
  {
    icon: Microscope,
    title: "Tecnología de diagnóstico",
    text: "Equipos de laboratorio para estudios clínicos, genéticos y especializados.",
    tone: "turquoise",
  },
  {
    icon: UserRound,
    title: "Asesoría personalizada",
    text: "Resolvemos tus dudas sobre estudios, preparación y entrega de resultados.",
    tone: "blue",
  },
];

/** Sección “¿Por qué elegir IBANOCHE?”. */
export function WhyUs() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28" aria-labelledby="why-title">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Reveal className="relative order-2 lg:order-1">
            <Photo
              src={site.photos.whyUs}
              scene="microscope"
              alt="Profesional de laboratorio atendiendo a un paciente"
              className="aspect-[5/4] w-full rounded-[2.5rem] shadow-lift"
            />
            <div className="absolute -bottom-6 right-6 hidden items-center gap-3 rounded-3xl bg-white px-5 py-4 shadow-lift sm:flex">
              <IconBadge icon={Users} tone="coral" size="sm" />
              <p className="font-display text-sm font-semibold text-brand-blue">
                Cuidado para toda <span className="text-brand-turquoise">la familia</span>
              </p>
            </div>
          </Reveal>
          <Reveal className="order-1 lg:order-2" delay={80}>
            <Heading id="why-title" lead="¿Por qué elegir" highlight="IBANOCHE?" />
            <p className="mt-6 max-w-xl text-lg leading-relaxed">
              Porque combinamos tecnología, precisión y un trato humano para brindarte resultados confiables que te ayudan a
              cuidar lo más importante: <strong className="font-semibold text-brand-blue">tu salud y la de tu familia.</strong>
            </p>
            <Link
              href="/nosotros"
              className="group mt-8 inline-flex items-center gap-2 font-display font-semibold text-brand-blue transition hover:text-brand-turquoise"
            >
              Conoce más sobre nosotros
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
            </Link>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
          {whyUsFeatures.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}

/** Tarjeta compacta de sucursal (inicio). */
export function BranchTeaser({ branch, index }: { branch: Branch; index: number }) {
  return (
    <Reveal delay={index * 100} className="min-w-0">
      <Link
        href={`/sucursales#${branch.id}`}
        className="card-lift group flex items-center gap-5 rounded-4xl border border-brand-gray bg-white p-4 pr-6 shadow-soft"
      >
        <Photo src={branch.image} scene="building" variant={index} alt={`Fachada de ${branch.name}`} className="h-24 w-28 shrink-0 rounded-3xl sm:h-28 sm:w-36" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-brand-turquoise">Sucursal</p>
          <h3 className="mt-1 font-display text-lg font-bold leading-snug text-brand-blue">{branch.name}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 shrink-0 text-brand-turquoise" aria-hidden />
            <span className="truncate">{branch.address ?? site.placeholders.address}</span>
          </p>
        </div>
        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-ice text-brand-blue transition group-hover:bg-brand-turquoise group-hover:text-white sm:inline-flex">
          <ArrowRight className="h-5 w-5" aria-hidden />
        </span>
      </Link>
    </Reveal>
  );
}

/** Tarjeta completa de sucursal (página de sucursales). */
export function BranchCard({ branch, index }: { branch: Branch; index: number }) {
  return (
    <Reveal delay={index * 120} className="h-full">
      <article id={branch.id} className="card-lift flex h-full scroll-mt-28 flex-col overflow-hidden rounded-[2.25rem] border border-brand-gray bg-white shadow-soft">
        <div className="relative">
          <Photo src={branch.image} scene="building" variant={index} alt={`Fachada de ${branch.name}`} className="aspect-[16/10] w-full" />
          <span className="absolute left-5 top-5 rounded-full bg-white/90 px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue backdrop-blur">
            Sucursal {index + 1}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-7 sm:p-8">
          <h2 className="font-display text-2xl font-bold text-brand-blue">{branch.name}</h2>
          <dl className="mt-5 grid gap-4 text-[0.95rem]">
            <div className="flex gap-3">
              <dt className="sr-only">Dirección</dt>
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-turquoise" aria-hidden />
              <dd className={branch.address ? "" : "italic text-brand-text/80"}>{branch.address ?? site.placeholders.address}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="sr-only">Horario</dt>
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-turquoise" aria-hidden />
              <dd className={branch.schedule ? "" : "italic text-brand-text/80"}>{branch.schedule ?? site.placeholders.schedule}</dd>
            </div>
          </dl>
          <div className="mt-auto grid gap-3 pt-8 sm:grid-cols-3">
            <ContactAction kind="call" phone={branch.phone} variant="primary" className="!px-4">
              Llamar
            </ContactAction>
            <ContactAction
              kind="whatsapp"
              number={branch.whatsapp}
              message={`Hola, me gustaría recibir información de la sucursal ${branch.name}.`}
              className="!px-4"
            >
              WhatsApp
            </ContactAction>
            <ContactAction kind="maps" mapsUrl={branch.mapsUrl} variant="outline" className="!px-4">
              Ver mapa
            </ContactAction>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

/** Banda de cierre con llamado a la acción. */
export function CtaBand({
  title,
  highlight,
  text,
  message,
  children,
}: {
  title: string;
  highlight?: string;
  text?: string;
  message?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="py-8">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-blue via-[#1763A8] to-brand-turquoise px-7 py-12 text-white shadow-lift sm:px-14 sm:py-16">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border-[28px] border-white/10" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 right-20 h-36 w-36 rounded-full bg-brand-coral/60" aria-hidden />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
                  {title} {highlight ? <span className="text-brand-mint">{highlight}</span> : null}
                </h2>
                {text ? <p className="mt-4 text-lg text-white/85">{text}</p> : null}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                {children ?? (
                  <>
                    <ContactAction kind="whatsapp" message={message} variant="ghostLight" className="!border-white !bg-white !text-brand-blue hover:!bg-brand-mint">
                      Contactar por WhatsApp
                    </ContactAction>
                    <ContactAction kind="call" variant="ghostLight">
                      Llamar ahora
                    </ContactAction>
                  </>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

