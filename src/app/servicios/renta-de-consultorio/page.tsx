import type { Metadata } from "next";
import { BriefcaseMedical, CalendarClock, Clock, MapPin, Sparkles } from "lucide-react";
import { ContactAction } from "@/components/actions";
import { PageHero } from "@/components/page-hero";
import { CtaBand, FeatureCard, type Feature } from "@/components/sections";
import { Container, Eyebrow, Heading, IconBadge } from "@/components/ui";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Renta de consultorio por hora",
  description:
    "Un espacio profesional, funcional y cómodo para médicos independientes que necesitan un lugar de atención sin asumir el costo de una renta de tiempo completo.",
};

const features: Feature[] = [
  { icon: Clock, title: "Renta por hora", text: "Paga solo el tiempo que utilizas.", tone: "turquoise" },
  { icon: BriefcaseMedical, title: "Espacio profesional", text: "Un lugar cómodo para atender a tus pacientes.", tone: "blue" },
  { icon: MapPin, title: "Ubicaciones estratégicas", text: "Consultorios dentro de nuestras sucursales.", tone: "coral" },
  { icon: CalendarClock, title: "Horarios conforme a disponibilidad", text: "Agenda los bloques que mejor se adapten a ti.", tone: "blue" },
  { icon: Sparkles, title: "Oportunidad para tu práctica", text: "Crece sin asumir una renta de tiempo completo.", tone: "turquoise" },
];

const availability = "Hola, me gustaría consultar la disponibilidad para la renta de consultorio por hora.";
const info = "Hola, me gustaría recibir información sobre la renta de consultorio por hora (condiciones y tarifas).";

export default function ConsultorioPage() {
  return (
    <>
      <PageHero
        eyebrow="Servicios para médicos"
        lead="Renta de consultorio"
        highlight="por hora"
        text="Un espacio profesional, funcional y cómodo para médicos independientes que necesitan un lugar de atención sin asumir el costo de una renta de tiempo completo."
        photo={site.photos.consultorio}
        scene="consultorio"
        alt="Consultorio médico moderno, luminoso y minimalista"
        aside={
          <div className="absolute -bottom-6 right-6 hidden items-center gap-3 rounded-3xl bg-white px-5 py-4 shadow-lift sm:flex">
            <IconBadge icon={CalendarClock} tone="coral" size="sm" />
            <p className="font-display text-sm font-semibold text-brand-blue">
              Por hora <span className="text-brand-turquoise">o por bloques</span>
            </p>
          </div>
        }
      >
        <ContactAction kind="whatsapp" message={availability}>
          Consultar disponibilidad
        </ContactAction>
        <ContactAction kind="whatsapp" message={info} variant="outline">
          Solicitar información
        </ContactAction>
      </PageHero>

      <section className="py-20 sm:py-24" aria-labelledby="rent-benefits">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow>Beneficios</Eyebrow>
            <Heading id="rent-benefits" lead="Tu consulta. Tu agenda." highlight="Tu espacio." className="mt-4" />
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {features.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </div>
        </Container>
      </section>

      <CtaBand
        title="Da el siguiente paso."
        highlight="Conoce la disponibilidad."
        text="Te compartimos horarios, condiciones y ubicaciones disponibles."
      >
        <ContactAction kind="whatsapp" message={availability} variant="ghostLight" className="!border-white !bg-white !text-brand-blue hover:!bg-brand-mint">
          Consultar disponibilidad
        </ContactAction>
        <ContactAction kind="call" variant="ghostLight">
          Llamar ahora
        </ContactAction>
      </CtaBand>
    </>
  );
}
