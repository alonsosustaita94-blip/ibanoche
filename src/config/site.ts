/**
 * Configuración central del sitio.
 *
 * Todos los datos de contacto están vacíos (null) a propósito: el sitio no
 * publica teléfonos, correos ni direcciones inventadas. Mientras un dato sea
 * null, los botones que dependen de él abren un aviso de demostración en lugar
 * de una acción real. Al completarlos, los botones funcionan automáticamente.
 */

export type Branch = {
  id: string;
  name: string;
  address: string | null;
  schedule: string | null;
  phone: string | null; // Formato internacional, ej. "+522221234567"
  whatsapp: string | null; // Solo dígitos con lada país, ej. "522221234567"
  mapsUrl: string | null;
  image: string | null; // Ruta en /public, ej. "/images/sucursal-torres.jpg"
};

export const site = {
  name: "IBANOCHE",
  tagline: "Laboratorio de Análisis Clínicos",
  description:
    "Estudios clínicos, genéticos y especializados con atención profesional y humana. Resultados confiables para el cuidado de tu salud y la de tu familia.",

  contact: {
    phone: null as string | null,
    email: null as string | null,
    whatsapp: null as string | null,
  },

  // Texto de ejemplo visible en la barra superior mientras no haya datos reales.
  placeholders: {
    phone: "Teléfono (dato de ejemplo)",
    email: "correo@ejemplo.com (dato de ejemplo)",
    address: "Dirección pendiente de completar",
    schedule: "Horario pendiente de completar",
  },

  social: {
    facebook: null as string | null,
    instagram: null as string | null,
    tiktok: null as string | null,
  },

  /**
   * Fotografías del sitio. Mientras sean null se muestra una ilustración
   * científica en colores de marca. Para usar una foto real, coloca el
   * archivo en /public/images y escribe aquí su ruta.
   */
  photos: {
    hero: null as string | null,
    studies: null as string | null,
    whyUs: null as string | null,
    professionals: null as string | null,
    consultorio: null as string | null,
    contact: null as string | null,
  },

  branches: [
    {
      id: "torres-medicas-4",
      name: "Torres Médicas 4",
      address: null,
      schedule: null,
      phone: null,
      whatsapp: null,
      mapsUrl: null,
      image: null,
    },
    {
      id: "centro-medico-diagnostico",
      name: "Centro Médico de Diagnóstico",
      address: null,
      schedule: null,
      phone: null,
      whatsapp: null,
      mapsUrl: null,
      image: null,
    },
  ] satisfies Branch[],
};

export const nav = [
  { href: "/", label: "Inicio" },
  { href: "/estudios", label: "Estudios clínicos" },
  { href: "/servicios", label: "Servicios" },
  { href: "/profesionales", label: "Profesionales" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
] as const;

/** Construye un enlace de WhatsApp con mensaje contextual, o null si no hay número. */
export function whatsappUrl(message: string, number = site.contact.whatsapp): string | null {
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
