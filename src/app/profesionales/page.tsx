import type { Metadata } from "next";
import { BookOpenCheck, Handshake, PackageCheck, ShieldCheck, UserRound } from "lucide-react";
import { ContactAction } from "@/components/actions";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { FeatureCard, type Feature } from "@/components/sections";
import { Container, Eyebrow, Heading, IconBadge } from "@/components/ui";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Profesionales de la salud",
  description: "IBANOCHE, tu aliado en el diagnóstico clínico. Servicios de laboratorio para médicos y profesionales de la salud.",
};

const features: Feature[] = [
  { icon: BookOpenCheck, title: "Catálogo para profesionales", text: "Información de estudios organizada para consulta médica.", tone: "blue" },
  { icon: PackageCheck, title: "Coordinación de muestras", text: "Acompañamiento en la logística de tus pacientes y sus muestras.", tone: "turquoise" },
  { icon: ShieldCheck, title: "Resultados confiables", text: "Procesos cuidadosos para apoyar tus decisiones clínicas.", tone: "blue" },
  { icon: UserRound, title: "Atención personalizada", text: "Comunicación directa con nuestro equipo.", tone: "coral" },
  { icon: Handshake, title: "Alianzas profesionales", text: "Opciones de colaboración para tu práctica médica.", tone: "turquoise" },
];

const message = "Hola, soy profesional de la salud y me gustaría recibir información sobre colaboración con IBANOCHE.";

export default function ProfessionalsPage() {
  return (
    <>
      <PageHero
        eyebrow="Para médicos y especialistas"
        lead="Tu aliado en el"
        highlight="diagnóstico clínico."
        text="Trabajamos junto a médicos y profesionales de la salud con información clara, coordinación profesional y comunicación continua."
        photo={site.photos.professionals}
        scene="professionals"
        alt="Dos profesionales médicos revisando resultados juntos"
        aside={
          <div className="absolute -bottom-6 left-6 hidden items-center gap-3 rounded-3xl bg-white px-5 py-4 shadow-lift sm:flex">
            <IconBadge icon={Handshake} tone="turquoise" size="sm" />
            <p className="font-display text-sm font-semibold text-brand-blue">Colaboración profesional</p>
          </div>
        }
      >
        <ContactAction kind="whatsapp" message={message}>
          Solicitar información
        </ContactAction>
      </PageHero>

      <section className="py-20 sm:py-24" aria-labelledby="pro-benefits">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow>Beneficios</Eyebrow>
            <Heading id="pro-benefits" lead="Un laboratorio que" highlight="trabaja contigo." className="mt-4" />
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {features.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-4" aria-label="Juntos por una mejor salud">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-brand-blue px-7 py-12 shadow-lift sm:px-14">
              <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(40%_120%_at_90%_50%,#32B8BE,transparent)]" aria-hidden />
              <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full border-[22px] border-white/10" aria-hidden />
              <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-brand-mint">Alianzas profesionales</p>
                  <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
                    Juntos por una <span className="text-brand-turquoise">mejor salud</span>
                  </h2>
                </div>
                <ContactAction kind="whatsapp" message={message} className="shrink-0">
                  Solicitar información
                </ContactAction>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
