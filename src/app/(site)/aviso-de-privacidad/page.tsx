import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { Container, Eyebrow, Heading } from "@/components/site/ui";

export const metadata: Metadata = { title: "Aviso de privacidad" };

/**
 * Página reservada para el aviso de privacidad. El texto legal debe redactarlo
 * y validarlo el responsable conforme a la LFPDPPP; no se incluye un texto genérico.
 */
export default function PrivacyPage() {
  return (
    <section className="bg-science py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-3xl rounded-[2.5rem] bg-white p-8 shadow-soft sm:p-12">
          <Eyebrow>Datos personales</Eyebrow>
          <Heading as="h1" lead="Aviso de" highlight="privacidad" className="mt-4" />
          <div className="mt-8 flex gap-4 rounded-3xl bg-brand-ice p-5 text-brand-blue">
            <FileText className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
            <p>
              El aviso de privacidad integral de IBANOCHE está en preparación y se publicará en esta página tras su revisión legal. Si tienes dudas sobre el
              uso de tus datos, contáctanos por los medios que aparecen en el sitio.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
