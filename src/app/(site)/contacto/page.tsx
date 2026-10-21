import type { Metadata } from "next";
import { Building, CalendarCheck, Headset, MessagesSquare, Search } from "lucide-react";
import { ContactAction } from "@/components/site/actions";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { Container, IconBadge } from "@/components/site/ui";
import { site } from "@/config/site";
import { db } from "@/lib/db";
import { REQUEST_TYPES, type RequestType } from "@/lib/validation/public-request";
import { RequestForm } from "@/components/site/request-form";

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

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const defaultType = (tipo && tipo in REQUEST_TYPES ? tipo : "informacion") as RequestType;
  const branches = await db.branch.findMany({ where: { active: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
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
      <section id="solicitud" className="scroll-mt-28 py-16 sm:py-20" aria-labelledby="solicitud-title">
        <Container>
          <div className="grid gap-10 rounded-[2.5rem] bg-science p-6 shadow-soft sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:p-14">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-brand-turquoise">Solicitud en línea</p>
              <h2 id="solicitud-title" className="mt-3 font-display text-3xl font-bold text-brand-blue sm:text-4xl">
                Déjanos tus datos y <span className="text-brand-turquoise">te contactamos</span>
              </h2>
              <p className="mt-4 text-lg">Información de estudios, citas, colaboración médica, propuestas para empresas o renta de consultorio.</p>
              <p className="mt-4 text-sm">Tu solicitud llega directamente a nuestro equipo. No compartas información de salud en este formulario.</p>
            </div>
            <div className="rounded-4xl bg-white p-6 shadow-soft sm:p-8">
              <RequestForm branches={branches} defaultType={defaultType} />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
