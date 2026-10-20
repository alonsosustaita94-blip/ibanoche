import type { Metadata, Viewport } from "next";
import { Montserrat, Open_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-montserrat", display: "swap" });
const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-open-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "IBANOCHE CRM", template: "%s · IBANOCHE CRM" },
  description: "Administración y gestión comercial inteligente.",
  robots: { index: false, follow: false },
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
