import { NoticeProvider } from "@/components/site/actions";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";

/** Sitio web público de IBANOCHE. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site min-h-dvh bg-white text-[1rem] leading-relaxed text-brand-text">
      <NoticeProvider>
        <a
          href="#contenido"
          className="sr-only z-[70] rounded-full bg-brand-blue px-5 py-3 font-display text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Saltar al contenido
        </a>
        <Header />
        <main id="contenido">{children}</main>
        <Footer />
      </NoticeProvider>
    </div>
  );
}
