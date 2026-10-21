import type { Metadata } from "next";
import { CtaBand, WhyUs } from "@/components/site/sections";
import { Container, Eyebrow, Heading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Combinamos tecnología, precisión y un trato humano para brindarte resultados confiables que te ayudan a cuidar tu salud y la de tu familia.",
};

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-science">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl animate-fade-up">
            <Eyebrow>Nosotros</Eyebrow>
            <Heading as="h1" lead="Ciencia, confianza y cercanía" highlight="para tu bienestar" className="mt-5" />
            <p className="mt-6 max-w-2xl text-lg leading-relaxed">
              En IBANOCHE realizamos estudios clínicos, genéticos y especializados con atención profesional y humana, para acompañarte
              en el cuidado de tu salud y la de tu familia.
            </p>
          </div>
        </Container>
      </section>
      <WhyUs />
      <CtaBand title="Estamos para" highlight="atenderte." message="Hola, me gustaría conocer más sobre IBANOCHE." />
    </>
  );
}
