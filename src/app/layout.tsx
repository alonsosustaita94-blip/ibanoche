import type { Metadata, Viewport } from "next";
import { Montserrat, Open_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { site } from "@/config/site";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-montserrat", display: "swap" });
const openSans = Open_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-open-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${site.name} | ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { title: `${site.name} | ${site.tagline}`, description: site.description, locale: "es_MX", type: "website" },
};

export const viewport: Viewport = { themeColor: "#12549A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${montserrat.variable} ${openSans.variable}`}>
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton toastOptions={{ className: "font-sans" }} />
      </body>
    </html>
  );
}
