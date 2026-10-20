import type { Metadata } from "next";
import { BranchCard, CtaBand } from "@/components/sections";
import { Container, Eyebrow, Heading } from "@/components/ui";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Sucursales",
  description: "Conoce las sucursales de IBANOCHE: Torres Médicas 4 y Centro Médico de Diagnóstico.",
};

export default function BranchesPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-science">
        <Container className="py-14 sm:py-20">
          <div className="max-w-2xl animate-fade-up">
            <Eyebrow>Ubicaciones</Eyebrow>
            <Heading as="h1" lead="Nuestras" highlight="sucursales" className="mt-5" />
            <p className="mt-6 text-lg leading-relaxed">Visítanos en la sucursal más cercana. Te atendemos con la misma calidad en cada una.</p>
          </div>
        </Container>
      </section>
      <section className="-mt-4 pb-16 pt-10" aria-label="Lista de sucursales">
        <Container>
          <div className="grid gap-8 md:grid-cols-2">
            {site.branches.map((b, i) => (
              <BranchCard key={b.id} branch={b} index={i} />
            ))}
          </div>
        </Container>
      </section>
      <CtaBand
        title="¿Necesitas ayuda para"
        highlight="llegar?"
        text="Escríbenos y te compartimos la ubicación y los horarios de atención."
        message="Hola, me gustaría conocer la ubicación y horarios de sus sucursales."
      />
    </>
  );
}
