import Link from "next/link";
import { Clock, Lock, Mail, MapPin, Phone } from "lucide-react";
import { nav, site } from "@/config/site";
import { Logo } from "./ui";

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-brand-blue text-white/80">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-turquoise/20 blur-3xl" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-5">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed">
            Estudios clínicos, genéticos y especializados con atención profesional y humana.
          </p>
        </div>

        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">Navegación</h2>
          <ul className="mt-5 grid gap-3 text-sm">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="transition hover:text-brand-turquoise">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">Servicios</h2>
          <ul className="mt-5 grid gap-3 text-sm">
            <li><Link href="/estudios" className="transition hover:text-brand-turquoise">Catálogo de estudios</Link></li>
            <li><Link href="/profesionales" className="transition hover:text-brand-turquoise">Para profesionales</Link></li>
            <li><Link href="/servicios/renta-de-consultorio" className="transition hover:text-brand-turquoise">Renta de consultorio</Link></li>
            <li><Link href="/sucursales" className="transition hover:text-brand-turquoise">Sucursales</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">Contacto</h2>
          <ul className="mt-5 grid gap-3 text-sm">
            <li className="flex gap-3"><Phone className="h-4 w-4 shrink-0 text-brand-turquoise" aria-hidden />{site.contact.phone ?? site.placeholders.phone}</li>
            <li className="flex gap-3"><Mail className="h-4 w-4 shrink-0 text-brand-turquoise" aria-hidden /><span className="min-w-0 break-words">{site.contact.email ?? site.placeholders.email}</span></li>
            <li className="flex gap-3"><MapPin className="h-4 w-4 shrink-0 text-brand-turquoise" aria-hidden />{site.placeholders.address}</li>
            <li className="flex gap-3"><Clock className="h-4 w-4 shrink-0 text-brand-turquoise" aria-hidden />{site.placeholders.schedule}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} IBANOCHE · Laboratorio de Análisis Clínicos</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/60">
            <Link href="/aviso-de-privacidad" className="transition hover:text-white">
              Aviso de privacidad
            </Link>
            <Link href="/crm/login" className="inline-flex items-center gap-1.5 transition hover:text-white">
              <Lock className="h-3.5 w-3.5" aria-hidden /> Acceso personal
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
