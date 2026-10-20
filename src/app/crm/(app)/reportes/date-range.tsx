"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays } from "@/lib/dates";

type Preset = { label: string; range: (today: string) => [string, string] };

const PRESETS: Preset[] = [
  { label: "Hoy", range: (t) => [t, t] },
  { label: "7 días", range: (t) => [addDays(t, -6), t] },
  { label: "30 días", range: (t) => [addDays(t, -29), t] },
  { label: "Este mes", range: (t) => [`${t.slice(0, 8)}01`, t] },
  { label: "Este año", range: (t) => [`${t.slice(0, 5)}01-01`, t] },
];

/** Rango de fechas del reporte sincronizado con la URL (?from=&to=). */
export function DateRangeFilter({ from, to, today }: { from: string; to: string; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const [pending, start] = useTransition();

  const apply = (nf: string, nt: string) => {
    setF(nf);
    setT(nt);
    const next = new URLSearchParams(params.toString());
    next.set("from", nf);
    next.set("to", nt);
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-semibold text-brand-ink">
          Desde
          <Input type="date" value={f} max={t} onChange={(e) => setF(e.target.value)} className="h-9 w-[9.5rem]" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-brand-ink">
          Hasta
          <Input type="date" value={t} min={f} max={today} onChange={(e) => setT(e.target.value)} className="h-9 w-[9.5rem]" />
        </label>
        <Button size="sm" className="h-9" loading={pending} disabled={!f || !t} onClick={() => apply(f, t)}>
          Aplicar
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => {
          const [pf, pt] = p.range(today);
          const active = pf === from && pt === to;
          return (
            <Button key={p.label} type="button" size="sm" variant={active ? "soft" : "ghost"} className="h-9" onClick={() => apply(pf, pt)}>
              {p.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
