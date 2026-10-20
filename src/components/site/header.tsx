"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Facebook, Instagram, Mail, Menu, Phone, X } from "lucide-react";
import { nav, site } from "@/config/site";
import { ContactAction, useNotice } from "./actions";
import { Logo } from "./ui";

// Compara por segmentos para que también funcione en la versión estática
// publicada en una subcarpeta (p. ej. /sitio/estudios.html).
function activeHref(pathname: string): string | null {
  const segments = pathname.replace(/\.html$/, "").split("/").filter(Boolean);
  const match = nav.find(
    (item) => item.href !== "/" && segments.some((s) => s === item.href.slice(1) || s.startsWith(`${item.href.slice(1)}-`)),
  );
  if (match) return match.href;
  const last = segments.at(-1);
  return !last || last === "index" || last === "inicio" ? "/" : null;
}

function isActive(pathname: string, href: string) {
  return activeHref(pathname) === href;
}

function TopBar() {
  const notify = useNotice();
  const socialDemo = () =>
    notify({
      title: "Redes sociales en configuración",
      body: "Los enlaces a las redes oficiales de IBANOCHE se activarán cuando se registren sus direcciones.",
    });
  return (
    <div className="bg-brand-navy text-white/85">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-between gap-4 px-5 text-xs sm:px-8">
        <div className="flex min-w-0 items-center gap-5">
          <span className="flex min-w-0 items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-brand-turquoise" aria-hidden />
            <span className="truncate">{site.contact.phone ?? site.placeholders.phone}</span>
          </span>
          <span className="hidden items-center gap-2 md:flex">
            <Mail className="h-3.5 w-3.5 text-brand-turquoise" aria-hidden />
            {site.contact.email ?? site.placeholders.email}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 hidden sm:inline">Síguenos</span>
          {[
            { label: "Facebook", Icon: Facebook, url: site.social.facebook },
            { label: "Instagram", Icon: Instagram, url: site.social.instagram },
          ].map(({ label, Icon, url }) =>
            url ? (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="rounded-full p-1.5 transition hover:bg-white/10 hover:text-white">
                <Icon className="h-3.5 w-3.5" />
              </a>
            ) : (
              <button key={label} type="button" onClick={socialDemo} aria-label={`${label} (pendiente)`} className="rounded-full p-1.5 transition hover:bg-white/10 hover:text-white">
                <Icon className="h-3.5 w-3.5" />
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <>
      <TopBar />
      <header
        className={`sticky top-0 z-50 border-b bg-white/95 backdrop-blur transition-shadow duration-300 ${
          scrolled ? "border-transparent shadow-soft" : "border-brand-gray"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
          <Link href="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-turquoise" aria-label="IBANOCHE, ir al inicio">
            <Logo />
          </Link>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-7">
              {nav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`nav-link font-display text-[0.9rem] font-medium transition-colors ${
                        active ? "text-brand-blue" : "text-brand-text hover:text-brand-blue"
                      }`}
                      data-active={active}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <ContactAction kind="whatsapp" className="hidden !min-h-[2.75rem] !px-5 sm:inline-flex">
              WhatsApp
            </ContactAction>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-ice text-brand-blue transition hover:bg-brand-blue hover:text-white lg:hidden"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open ? (
          <div id="mobile-menu" className="absolute inset-x-0 top-full z-40 h-[calc(100dvh-5rem)] overflow-y-auto border-t border-brand-gray bg-white lg:hidden">
            <nav aria-label="Menú móvil" className="px-5 pb-10 pt-4">
              <ul className="divide-y divide-brand-gray">
                {nav.map((item, i) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center justify-between py-4 font-display text-lg font-semibold ${
                          active ? "text-brand-turquoise" : "text-brand-blue"
                        }`}
                      >
                        {item.label}
                        {active ? <span className="h-2 w-2 rounded-full bg-brand-turquoise" aria-hidden /> : null}
                      </Link>
                    </li>
                  );
                })}
                <li className="py-4">
                  <Link href="/sucursales" className="font-display text-lg font-semibold text-brand-blue">
                    Sucursales
                  </Link>
                </li>
              </ul>
              <div className="mt-6 grid gap-3">
                <ContactAction kind="whatsapp" className="w-full">
                  Contactar por WhatsApp
                </ContactAction>
                <ContactAction kind="call" variant="outline" className="w-full">
                  Llamar ahora
                </ContactAction>
              </div>
            </nav>
          </div>
        ) : null}
      </header>
    </>
  );
}
