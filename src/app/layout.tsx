import type { Metadata, Viewport } from "next";
import { Montserrat, Open_Sans } from "next/font/google";
import "./globals.css";
import { NoticeProvider } from "@/components/actions";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { site } from "@/config/site";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} | ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
    locale: "es_MX",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#12549A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${montserrat.variable} ${openSans.variable}`}>
      <body>
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
      </body>
    </html>
  );
}
