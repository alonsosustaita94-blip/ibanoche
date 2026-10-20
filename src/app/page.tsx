import Link from "next/link";
import {
  ArrowRight,
  BriefcaseMedical,
  FlaskConical,
  Microscope,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { ContactAction } from "@/components/actions";
import { Reveal } from "@/components/reveal";
import { BenefitStrip, BranchTeaser, CtaBand, WhyUs } from "@/components/sections";
import { ButtonLink, Container, Eyebrow, Heading, IconBadge, OrganicCorner, Photo } from "@/components/ui";
import { site } from "@/config/site";

const heroBenefits = [
  { icon: ShieldCheck, title: "Resultados confiables", tone: "blue" as const },
  { icon: UserRound, title: "Atención personalizada", tone: "turquoise" as const },
  { icon: Microscope, title: "Tecnología de diagnóstico", tone: "blue" as const },
  { icon: Users, title: "Cuidado para toda la familia", tone: "coral" as const },
];

const services = [
  {
    href: "/estudios",
    icon: FlaskConical,
    tone: "blue" as const,
    title: "Estudios clínicos",
    text: "Análisis clínicos generales, genéticos, especializados y perfiles.",
  },
  {
    href: "/profesionales",
    icon: Stethoscope,
    tone: "turquoise" as const,
    title: "Para profesionales",
    text: "Un aliado en el diagnóstico clínico para médicos y especialistas.",
  },
  {
    href: "/servicios/renta-de-consultorio",
    icon: BriefcaseMedical,
    tone: "coral" as const,
    title: "Renta de consultorio",
    text: "Espacios profesionales por hora para tu práctica médica.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-science">
        <div className="relative h-64 sm:h-96 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[56%]">
          <Photo
            src={site.photos.hero}
            scene="lab"
            alt="Personal de laboratorio trabajando con pipeta y tubos de ensayo"
            fade="left"
            className="h-full w-full [mask-image:linear-gradient(to_top,transparent,black_30%)] lg:[mask-image:linear-gradient(to_right,transparent,black_28%)]"
          />
        </div>
        <OrganicCorner position="bottom-left" className="hidden opacity-90 lg:block" />
        <Container className="relative">
          <div className="relative z-10 pb-16 pt-2 sm:-mt-6 lg:mt-0 lg:pt-0 lg:max-w-[600px] lg:py-28">
            <p className="animate-fade-up font-display text-sm font-semibold uppercase tracking-[0.14em] text-brand-blue sm:text-base">
              Estudios clínicos, genéticos y especializados con
            </p>
            <h1
              className="mt-4 animate-fade-up text-balance font-display text-[2.6rem] font-bold uppercase leading-[1.02] text-brand-blue sm:text-6xl lg:text-[4.2rem]"
              style={{ animationDelay: "80ms" }}
            >
              Atención <span className="text-brand-turquoise">profesional</span> y <span className="text-brand-turquoise">humana.</span>
            </h1>
            <div className="mt-6 h-1 w-20 animate-fade-up rounded-full bg-gradient-to-r from-brand-turquoise to-brand-coral" style={{ animationDelay: "140ms" }} aria-hidden />
            <p className="mt-6 max-w-md animate-fade-up text-lg leading-relaxed sm:text-xl" style={{ animationDelay: "180ms" }}>
              Resultados confiables para el cuidado de tu salud y la de tu familia.
            </p>
            <div className="mt-9 flex animate-fade-up flex-col gap-3 sm:flex-row" style={{ animationDelay: "240ms" }}>
              <ButtonLink href="/estudios" icon={Search}>
                Consultar estudios
              </ButtonLink>
              <ContactAction kind="whatsapp" message="Hola, me gustaría información sobre los estudios de IBANOCHE.">
                Contactar por WhatsApp
              </ContactAction>
            </div>
          </div>
        </Container>
      </section>

      {/* BENEFICIOS + SUCURSALES */}
      <section className="relative z-10 -mt-8 lg:-mt-12" aria-label="Beneficios y sucursales">
        <Container>
          <Reveal>
            <BenefitStrip items={heroBenefits} />
          </Reveal>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {site.branches.map((b, i) => (
              <BranchTeaser key={b.id} branch={b} index={i} />
            ))}
          </div>
        </Container>
      </section>

      <WhyUs />

      {/* SERVICIOS */}
      <section className="bg-brand-gray py-20 sm:py-24" aria-labelledby="services-title">
        <Container>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Eyebrow>Nuestros servicios</Eyebrow>
              <Heading id="services-title" lead="Todo lo que necesitas," highlight="en un solo lugar." className="mt-4" />
            </div>
            <Link href="/servicios" className="group inline-flex items-center gap-2 font-display font-semibold text-brand-blue transition hover:text-brand-turquoise">
              Ver todos los servicios
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.href} delay={i * 90} className="h-full">
                <Link href={s.href} className="card-lift group flex h-full flex-col rounded-4xl bg-white p-8 shadow-soft">
                  <IconBadge icon={s.icon} tone={s.tone} size="lg" />
                  <h3 className="mt-6 font-display text-xl font-bold text-brand-blue">{s.title}</h3>
                  <p className="mt-3 flex-1">{s.text}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-display text-sm font-semibold text-brand-turquoise">
                    Conocer más
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <div className="pt-16">
        <CtaBand
          title="Más que un laboratorio,"
          highlight="un aliado para tu salud."
          text="Resolvemos tus dudas sobre estudios, preparación y entrega de resultados."
          message="Hola, me gustaría recibir asesoría sobre un estudio de laboratorio."
        />
      </div>
    </>
  );
}
