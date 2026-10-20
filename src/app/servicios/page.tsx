import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseMedical, Building, Dna, FlaskConical, Layers, Microscope, Stethoscope } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { CtaBand } from "@/components/sections";
import { Container, Eyebrow, Heading, IconBadge, Photo } from "@/components/ui";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Servicios",
  description: "Estudios clínicos, genéticos y especializados, servicios para profesionales y renta de consultorio por hora.",
};

const studyLines = [
  { icon: FlaskConical, tone: "blue" as const, title: "Análisis clínicos generales" },
  { icon: Dna, tone: "turquoise" as const, title: "Estudios genéticos" },
  { icon: Microscope, tone: "coral" as const, title: "Estudios especializados" },
  { icon: Layers, tone: "blue" as const, title: "Perfiles" },
];

const services = [
  {
    href: "/profesionales",
    icon: Stethoscope,
    tone: "turquoise" as const,
    title: "Profesionales de la salud",
    text: "Catálogo para profesionales, coordinación de muestras y alianzas.",
  },
  {
    href: "/servicios/renta-de-consultorio",
    icon: BriefcaseMedical,
    tone: "coral" as const,
    title: "Renta de consultorio por hora",
    text: "Espacios profesionales para médicos independientes.",
  },
  {
    href: "/contacto",
    icon: Building,
    tone: "blue" as const,
    title: "Empresas e instituciones",
    text: "Solicita una propuesta de servicios de laboratorio para tu organización.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-science">
        <Container className="py-14 sm:py-20">
          <div className="max-w-2xl animate-fade-up">
            <Eyebrow>Servicios</Eyebrow>
            <Heading as="h1" lead="Ciencia y cercanía" highlight="para cuidar tu salud" className="mt-5" />
            <p className="mt-6 text-lg leading-relaxed">
              Estudios clínicos, genéticos y especializados, además de servicios pensados para profesionales de la salud.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="lab-title">
        <Container>
          <div className="grid items-center gap-10 overflow-hidden rounded-[2.5rem] bg-white shadow-soft ring-1 ring-brand-gray lg:grid-cols-2">
            <Photo src={site.photos.studies} scene="tubes" alt="Tubos de muestra en el laboratorio" className="h-72 w-full lg:h-full lg:min-h-[420px]" />
            <div className="p-8 sm:p-12 lg:pl-2">
              <Eyebrow>Laboratorio</Eyebrow>
              <Heading id="lab-title" lead="Estudios" highlight="clínicos" className="mt-4" />
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {studyLines.map((s) => (
                  <li key={s.title} className="flex items-center gap-3">
                    <IconBadge icon={s.icon} tone={s.tone} size="sm" />
                    <span className="font-display text-[0.95rem] font-semibold text-brand-blue">{s.title}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/estudios"
                className="group mt-10 inline-flex items-center gap-2 rounded-full bg-brand-blue px-7 py-3.5 font-display font-semibold text-white shadow-soft transition hover:bg-brand-navy"
              >
                Consultar estudios
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.href} delay={i * 90} className="h-full">
                <Link href={s.href} className="card-lift group flex h-full flex-col rounded-4xl bg-brand-gray p-8">
                  <IconBadge icon={s.icon} tone={s.tone} size="lg" />
                  <h2 className="mt-6 font-display text-xl font-bold text-brand-blue">{s.title}</h2>
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

      <CtaBand
        title="¿Tienes dudas sobre"
        highlight="nuestros servicios?"
        message="Hola, me gustaría recibir información sobre los servicios de IBANOCHE."
      />
    </>
  );
}
