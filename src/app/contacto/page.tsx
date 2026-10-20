import type { Metadata } from "next";
import { Building, CalendarCheck, Headset, MessagesSquare, Search } from "lucide-react";
import { ContactAction } from "@/components/actions";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { Container, IconBadge } from "@/components/ui";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "¿Tienes dudas sobre algún estudio, preparación, precios o nuestros servicios? Nuestro equipo está listo para atenderte.",
};

const blocks = [
  {
    icon: Search,
    tone: "blue" as const,
    title: "Consulta estudios y precios",
    text: "Pregúntanos por el estudio que necesitas.",
    message: "Hola, me gustaría consultar estudios y precios.",
  },
  {
    icon: MessagesSquare,
    tone: "turquoise" as const,
    title: "Asesoría personalizada",
    text: "Resolvemos tus dudas sobre preparación y resultados.",
    message: "Hola, me gustaría recibir asesoría personalizada.",
  },
  {
    icon: CalendarCheck,
    tone: "coral" as const,
    title: "Agenda tu servicio",
    text: "Elige el día y la sucursal que prefieras.",
    message: "Hola, me gustaría agendar un servicio.",
  },
  {
    icon: Building,
    tone: "blue" as const,
    title: "Solicita una propuesta empresarial",
    text: "Servicios de laboratorio para empresas e instituciones.",
    message: "Hola, me gustaría solicitar una propuesta empresarial.",
  },
];

const toneBg = {
  blue: "bg-gradient-to-b from-brand-ice to-white",
  turquoise: "bg-gradient-to-b from-brand-mint to-white",
  coral: "bg-gradient-to-b from-brand-blush to-white",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Estamos para ayudarte"
        lead="Tu salud es nuestra"
        highlight="prioridad"
        text="¿Tienes dudas sobre algún estudio, preparación, precios o nuestros servicios? Nuestro equipo está listo para atenderte y brindarte una asesoría personalizada."
        photo={site.photos.contact}
        scene="support"
        alt="Profesional de atención al paciente con diadema"
        aside={
          <div className="absolute -bottom-8 left-4 right-4 rounded-3xl bg-white/95 p-5 shadow-lift backdrop-blur sm:left-auto sm:right-6 sm:max-w-xs">
            <div className="flex items-center gap-3">
              <IconBadge icon={Headset} tone="turquoise" size="sm" />
              <p className="font-display text-sm font-bold text-brand-blue">¿Necesitas ayuda?</p>
            </div>
            <p className="mt-2 text-sm">Escríbenos y te respondemos con información clara sobre tu estudio.</p>
          </div>
        }
      >
        <ContactAction kind="whatsapp" message="Hola, tengo una duda y me gustaría recibir asesoría.">
          Contactar por WhatsApp
        </ContactAction>
        <ContactAction kind="call" variant="primary">
          Llamar ahora
        </ContactAction>
      </PageHero>

      <section className="pb-8 pt-20" aria-label="Opciones de contacto">
        <Container>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {blocks.map((b, i) => (
              <Reveal key={b.title} delay={i * 90} className="h-full">
                <article className={`card-lift flex h-full flex-col rounded-4xl border border-white p-7 shadow-soft ${toneBg[b.tone]}`}>
                  <IconBadge icon={b.icon} tone={b.tone} size="lg" />
                  <h2 className="mt-6 font-display text-lg font-bold leading-snug text-brand-blue">{b.title}</h2>
                  <p className="mt-2 flex-1 text-[0.95rem]">{b.text}</p>
                  <ContactAction kind="whatsapp" message={b.message} variant="outline" className="mt-6 !min-h-[2.75rem] w-full !text-sm">
                    Escribir
                  </ContactAction>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
