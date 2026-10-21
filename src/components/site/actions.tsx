"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Info, MapPin, Phone, X } from "lucide-react";
import { site, whatsappUrl } from "@/config/site";
import { buttonStyles } from "./ui";

/** Icono de WhatsApp (globo de diálogo con auricular). */
export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z" />
      <path d="M9 8.6c0 3.3 2.9 6.2 6.2 6.4l1.1-1.3-1.8-.9-.8.8c-1.1-.4-2.2-1.5-2.6-2.6l.8-.8-.9-1.8-1.3 1.1" />
    </svg>
  );
}

type Notice = { title: string; body: string; detail?: string };

const NoticeContext = createContext<(n: Notice) => void>(() => {});

export function NoticeProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!notice) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNotice(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notice]);

  return (
    <NoticeContext.Provider value={setNotice}>
      {children}
      {notice ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-brand-navy/40 p-4 backdrop-blur-sm sm:items-center" onClick={() => setNotice(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-title"
            className="w-full max-w-md animate-fade-up rounded-3xl bg-white p-7 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-mint text-brand-turquoise">
                <Info className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="notice-title" className="font-display text-lg font-bold text-brand-blue">
                  {notice.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-brand-text">{notice.body}</p>
                {notice.detail ? (
                  <p className="mt-3 rounded-2xl bg-brand-gray px-4 py-3 text-sm italic text-brand-blue">{notice.detail}</p>
                ) : null}
              </div>
              <button
                ref={closeRef}
                onClick={() => setNotice(null)}
                className="rounded-full p-1.5 text-brand-text transition hover:bg-brand-gray hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-turquoise"
                aria-label="Cerrar aviso"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <button onClick={() => setNotice(null)} className={`${buttonStyles.primary} mt-6 w-full`}>
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </NoticeContext.Provider>
  );
}

export const useNotice = () => useContext(NoticeContext);

type ActionKind = "whatsapp" | "call" | "maps";

const icons = { whatsapp: WhatsAppIcon, call: Phone, maps: MapPin };

/**
 * Botón de contacto. Si el dato está configurado abre la acción real
 * (WhatsApp con mensaje contextual, llamada o mapa). Si no, explica que se
 * trata de una demostración pendiente de configurar.
 */
export function ContactAction({
  kind,
  message = "Hola, me gustaría recibir información sobre los servicios de IBANOCHE.",
  number,
  phone,
  mapsUrl,
  variant = "turquoise",
  className = "",
  children,
}: {
  kind: ActionKind;
  message?: string;
  number?: string | null;
  phone?: string | null;
  mapsUrl?: string | null;
  variant?: keyof typeof buttonStyles;
  className?: string;
  children: React.ReactNode;
}) {
  const notify = useNotice();
  const Icon = icons[kind];

  let href: string | null = null;
  if (kind === "whatsapp") href = whatsappUrl(message, number ?? site.contact.whatsapp);
  if (kind === "call") {
    const p = phone ?? site.contact.phone;
    href = p ? `tel:${p}` : null;
  }
  if (kind === "maps") href = mapsUrl ?? null;

  const onDemo = useCallback(() => {
    const copy: Record<ActionKind, Notice> = {
      whatsapp: {
        title: "WhatsApp en configuración",
        body: "Este botón abrirá WhatsApp con el siguiente mensaje en cuanto se registre el número oficial del laboratorio.",
        detail: `“${message}”`,
      },
      call: {
        title: "Teléfono en configuración",
        body: "Este botón iniciará una llamada cuando se registre el número telefónico oficial.",
      },
      maps: {
        title: "Ubicación en configuración",
        body: "Este botón abrirá Google Maps cuando se registre la ubicación oficial de la sucursal.",
      },
    };
    notify(copy[kind]);
  }, [kind, message, notify]);

  const cls = `${buttonStyles[variant]} ${className}`;
  const content = (
    <>
      <Icon className="h-5 w-5" aria-hidden />
      {children}
    </>
  );

  if (href) {
    const external = kind !== "call";
    return (
      <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onDemo} className={cls}>
      {content}
    </button>
  );
}
