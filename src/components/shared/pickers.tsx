"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FlaskConical, Loader2, Search, UserRound, X } from "lucide-react";
import { searchPatientsAction, searchStudiesAction, type PatientOption, type StudyOption } from "@/server/actions/lookup";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

function useDebouncedSearch<T>(fn: (q: string) => Promise<T[]>) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const seq = useRef(0);
  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++seq.current;
    timer.current = setTimeout(async () => {
      const r = await fn(q);
      if (id === seq.current) {
        setItems(r);
        setLoading(false);
      }
    }, 250);
  }, [q, fn]);
  return { q, setQ, items, loading };
}

/**
 * Selector de paciente con búsqueda. Incluye un input oculto `name` con el id
 * para usarse dentro de formularios.
 */
export function PatientPicker({
  value,
  onChange,
  name = "patientId",
  id = "patientId",
  invalid,
  disabled,
}: {
  value: PatientOption | null;
  onChange: (p: PatientOption | null) => void;
  name?: string;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const { q, setQ, items, loading } = useDebouncedSearch(searchPatientsAction);
  const [open, setOpen] = useState(false);

  if (value) {
    return (
      <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-input bg-brand-ice/60 px-3">
        <input type="hidden" name={name} value={value.id} />
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <UserRound className="h-4 w-4 shrink-0 text-brand-blue" />
          <span className="truncate font-semibold text-brand-ink">{value.name}</span>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{value.folio}</span>
        </span>
        {disabled ? null : (
          <button type="button" onClick={() => onChange(null)} className="rounded p-1 text-muted-foreground hover:bg-card hover:text-brand-ink" aria-label="Quitar paciente">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <Popover open={open && q.trim().length >= 2} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <input type="hidden" name={name} value="" />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            value={q}
            disabled={disabled}
            aria-invalid={invalid}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar paciente por nombre, teléfono o folio"
            className="pl-9"
            autoComplete="off"
          />
          {loading ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-secondary" /> : null}
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-1" onOpenAutoFocus={(e) => e.preventDefault()}>
        {items.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">{loading ? "Buscando…" : "Sin coincidencias. Registra al paciente en el módulo Pacientes."}</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto">
            {items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left hover:bg-accent"
                  onClick={() => {
                    onChange(p);
                    setQ("");
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-brand-ink">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.folio} · {p.phone ?? "sin teléfono"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Buscador de estudios para agregar partidas (cotización, orden, POS, cita). */
export function StudySearch({
  onSelect,
  selectedIds = [],
  placeholder = "Buscar y agregar estudio por nombre o código",
  className,
}: {
  onSelect: (s: StudyOption) => void;
  selectedIds?: string[];
  placeholder?: string;
  className?: string;
}) {
  const { q, setQ, items, loading } = useDebouncedSearch(searchStudiesAction);
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open && q.trim().length >= 2} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <FlaskConical className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-turquoise" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pl-9"
            autoComplete="off"
            aria-label={placeholder}
          />
          {loading ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-secondary" /> : null}
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-1" onOpenAutoFocus={(e) => e.preventDefault()}>
        {items.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">{loading ? "Buscando…" : "Sin estudios activos con ese nombre."}</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {items.map((s) => {
              const added = selectedIds.includes(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={s.publicPriceCents === null}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-accent disabled:opacity-50"
                    onClick={() => {
                      onSelect(s);
                      setQ("");
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-brand-ink">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {s.code} · {s.category}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm tabular">
                      {s.publicPriceCents === null ? <span className="text-xs text-muted-foreground">Sin precio</span> : formatMoney(s.publicPriceCents)}
                      {added ? <Check className="h-4 w-4 text-brand-green" /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
