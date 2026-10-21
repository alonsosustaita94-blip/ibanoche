import type { Metadata } from "next";

// El CRM es privado: no debe aparecer en buscadores.
export const metadata: Metadata = {
  title: { default: "IBANOCHE CRM", template: "%s · IBANOCHE CRM" },
  description: "Administración y gestión comercial inteligente.",
  robots: { index: false, follow: false },
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
