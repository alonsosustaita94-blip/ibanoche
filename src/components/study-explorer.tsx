"use client";

import { useMemo, useRef, useState } from "react";
import { Dna, FlaskConical, Layers, Microscope, Search, SearchX, X } from "lucide-react";
import { categories, searchStudies, type CategoryId } from "@/data/studies";
import { ContactAction } from "./actions";
import { buttonStyles } from "./ui";

const categoryIcon = { generales: FlaskConical, geneticos: Dna, especializados: Microscope, perfiles: Layers };
const toneCard = {
  blue: "bg-brand-ice text-brand-blue",
  turquoise: "bg-brand-mint text-brand-turquoise",
  coral: "bg-brand-blush text-brand-coral",
};
const toneIcon = {
  blue: "bg-brand-blue text-white",
  turquoise: "bg-brand-turquoise text-white",
  coral: "bg-brand-coral text-white",
};

export function StudyExplorer() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchStudies(query, category), [query, category]);
  const active = categories.find((c) => c.id === category);
  const showing = query !== "" || category !== null;

  const scrollToResults = () =>
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(input.trim());
    scrollToResults();
  };

  const reset = () => {
    setInput("");
    setQuery("");
    setCategory(null);
  };

  return (
    <div>
      <form onSubmit={onSubmit} role="search" className="relative z-10 rounded-full bg-white p-2 shadow-lift ring-1 ring-brand-gray">
        <label htmlFor="study-search" className="sr-only">
          Buscar un estudio
        </label>
        <div className="flex items-center gap-2">
          <Search className="ml-4 h-5 w-5 shrink-0 text-brand-turquoise" aria-hidden />
          <input
            id="study-search"
            type="search"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setQuery(e.target.value.trim());
            }}
            placeholder="Busca un estudio (ej. glucosa, perfil hepático, etc.)"
            className="min-w-0 flex-1 bg-transparent py-3 text-base text-brand-blue placeholder:text-brand-text/70 focus:outline-none"
            autoComplete="off"
          />
          <button type="submit" className={`${buttonStyles.turquoise} !min-h-[3rem] shrink-0 !px-5 sm:!px-8`}>
            <span className="hidden sm:inline">Buscar</span>
            <Search className="h-5 w-5 sm:hidden" aria-label="Buscar" />
          </button>
        </div>
      </form>

      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.map((c) => {
          const Icon = categoryIcon[c.id];
          const selected = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setCategory(selected ? null : c.id);
                scrollToResults();
              }}
              className={`card-lift group flex flex-col items-start rounded-4xl p-5 text-left ring-2 transition sm:p-7 ${toneCard[c.tone]} ${
                selected ? "ring-current" : "ring-transparent"
              } focus-visible:outline-none focus-visible:ring-brand-turquoise`}
            >
              <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-soft transition group-hover:scale-105 ${toneIcon[c.tone]}`}>
                <Icon className="h-7 w-7" strokeWidth={1.8} aria-hidden />
              </span>
              <span className="mt-5 font-display text-base font-bold leading-snug text-brand-blue sm:text-lg">{c.name}</span>
              <span className="mt-2 hidden text-sm leading-snug text-brand-text sm:block">{c.description}</span>
            </button>
          );
        })}
      </div>

      <div ref={resultsRef} className="scroll-mt-28" aria-live="polite">
        {showing ? (
          <div className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="font-display text-lg font-semibold text-brand-blue">
                {results.length} {results.length === 1 ? "estudio" : "estudios"}
                {active ? <span className="text-brand-turquoise"> · {active.name}</span> : null}
                {query ? <span className="text-brand-text"> para “{query}”</span> : null}
              </p>
              <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-blue transition hover:bg-brand-gray">
                <X className="h-4 w-4" aria-hidden /> Limpiar filtros
              </button>
            </div>

            {results.length ? (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((s, i) => {
                  const cat = categories.find((c) => c.id === s.category)!;
                  const Icon = categoryIcon[s.category];
                  return (
                    <li key={s.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                      <article className="card-lift flex h-full flex-col rounded-3xl border border-brand-gray bg-white p-6 shadow-soft">
                        <div className="flex items-start gap-4">
                          <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneCard[cat.tone]}`}>
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-display text-base font-bold leading-snug text-brand-blue">{s.name}</h3>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-turquoise">{cat.name}</p>
                          </div>
                        </div>
                        <p className="mt-4 rounded-2xl bg-brand-gray px-4 py-3 text-sm">
                          Precio, tiempo de entrega y preparación: <span className="font-semibold text-brand-blue">consultar disponibilidad</span>
                        </p>
                        <ContactAction
                          kind="whatsapp"
                          variant="outline"
                          className="mt-5 !min-h-[2.75rem] w-full !text-sm"
                          message={`Hola, me gustaría recibir información sobre el estudio: ${s.name}.`}
                        >
                          Consultar información
                        </ContactAction>
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-6 flex flex-col items-center rounded-4xl border border-dashed border-brand-blue/20 bg-brand-gray px-6 py-14 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-coral shadow-soft">
                  <SearchX className="h-6 w-6" aria-hidden />
                </span>
                <p className="mt-5 font-display text-lg font-bold text-brand-blue">No encontramos “{query}” en el catálogo de ejemplo</p>
                <p className="mt-2 max-w-md text-sm">Revisa la ortografía o escríbenos. Te ayudamos a encontrar el estudio que necesitas.</p>
                <ContactAction kind="whatsapp" className="mt-6" message={`Hola, busco información sobre el estudio: ${query}.`}>
                  Preguntar por WhatsApp
                </ContactAction>
              </div>
            )}
            <p className="mt-6 text-center text-xs text-brand-text/80">
              Catálogo de demostración. Los precios, tiempos de entrega e indicaciones se publicarán cuando el laboratorio los valide.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
