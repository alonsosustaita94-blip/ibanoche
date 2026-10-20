import type { Metadata } from "next";
import { ClipboardList, Clock, FileText, MessagesSquare } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { BenefitStrip, CtaBand } from "@/components/sections";
import { StudyExplorer } from "@/components/study-explorer";
import { Container, Eyebrow, Heading, Photo } from "@/components/ui";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Estudios clínicos",
  description:
    "Consulta nuestro catálogo de análisis clínicos, genéticos y especializados. Encuentra el estudio que necesitas y conoce sus requisitos de preparación.",
};

const benefits = [
  { icon: FileText, title: "Información clara", tone: "blue" as const },
  { icon: ClipboardList, title: "Requisitos de preparación", tone: "turquoise" as const },
  { icon: Clock, title: "Precios y tiempos de entrega", tone: "coral" as const },
  { icon: MessagesSquare, title: "Asesoría personalizada", tone: "blue" as const },
];

export default function StudiesPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-science">
        <div className="absolute inset-0 lg:left-[42%]">
          <Photo src={site.photos.studies} scene="tubes" alt="Tubos de muestra en el laboratorio" fade="left" className="h-full w-full opacity-40 lg:opacity-100" />
        </div>
        <Container className="relative pb-28 pt-14 sm:pt-20 lg:pb-36 lg:pt-24">
          <div className="max-w-2xl">
            <Eyebrow>Catálogo de estudios</Eyebrow>
            <Heading as="h1" lead="Accede a nuestros" highlight="estudios clínicos" className="mt-5" />
            <p className="mt-6 max-w-xl text-lg leading-relaxed">
              Consulta nuestro catálogo de análisis clínicos, genéticos y especializados. Encuentra el estudio que necesitas y conoce sus
              requisitos de preparación.
            </p>
          </div>
        </Container>
      </section>

      <section className="relative -mt-16 lg:-mt-20" aria-label="Buscador de estudios">
        <Container>
          <div className="mx-auto max-w-5xl">
            <StudyExplorer />
          </div>
        </Container>
      </section>

      <section className="py-16" aria-label="Beneficios">
        <Container>
          <Reveal>
            <BenefitStrip items={benefits} />
          </Reveal>
        </Container>
      </section>

      <CtaBand
        title="¿No encuentras tu estudio?"
        highlight="Te ayudamos."
        text="Nuestro equipo te orienta sobre estudios, preparación y tiempos de entrega."
        message="Hola, no encuentro un estudio en el catálogo y me gustaría recibir información."
      />
    </>
  );
}
