import type { SceneName } from "./illustrations";
import { Container, Eyebrow, Heading, OrganicCorner, Photo } from "./ui";

/** Portada de página: texto a la izquierda, fotografía a la derecha. */
export function PageHero({
  eyebrow,
  lead,
  highlight,
  text,
  photo,
  scene,
  alt,
  children,
  aside,
}: {
  eyebrow: string;
  lead: string;
  highlight?: string;
  text: string;
  photo: string | null;
  scene: SceneName;
  alt: string;
  children?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-science">
      <OrganicCorner position="bottom-left" className="hidden opacity-80 lg:block" />
      <Container className="relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:py-24">
        <div className="relative z-10 animate-fade-up">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading as="h1" lead={lead} highlight={highlight} className="mt-5" />
          <p className="mt-6 max-w-xl text-lg leading-relaxed">{text}</p>
          {children ? <div className="mt-9 flex flex-col gap-3 sm:flex-row">{children}</div> : null}
        </div>
        <div className="relative animate-fade-up" style={{ animationDelay: "120ms" }}>
          <Photo src={photo} scene={scene} alt={alt} className="aspect-[4/3] w-full rounded-[2.5rem] shadow-lift" />
          {aside}
        </div>
      </Container>
    </section>
  );
}
