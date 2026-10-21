"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Aparición suave al entrar en pantalla. El contenido es visible por defecto:
 * solo se oculta brevemente si el navegador admite la animación y el usuario
 * no ha pedido reducir el movimiento.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      setState("shown");
      return;
    }
    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cls = state === "hidden" ? "opacity-0 translate-y-5" : state === "shown" ? "animate-fade-up" : "";
  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`${cls} ${className}`}
      style={state === "shown" && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
