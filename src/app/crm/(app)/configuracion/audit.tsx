"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRight, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

type Log = {
  id: string;
  createdAt: string;
  actor: string;
  actorType: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string | null;
  ip: string | null;
  before: unknown;
  after: unknown;
};

const SENSITIVE = /password|hash|token|secret/i;

/** Diferencia superficial entre before y after, ocultando campos sensibles. */
function diff(before: unknown, after: unknown) {
  const b = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
  const a = (after && typeof after === "object" ? after : {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => !SENSITIVE.test(k));
  const show = (v: unknown) => (v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v));
  return keys
    .map((k) => ({ key: k, before: show(b[k]), after: show(a[k]) }))
    .filter((r) => r.before !== r.after || !before);
}

export function AuditFilters({ entities, users, from, to, action }: { entities: string[]; users: { id: string; name: string }[]; from: string; to: string; action: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();
  const [f, setF] = useState({ from, to, action });

  const apply = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", "auditoria");
    next.delete("page");
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-2 border-y bg-muted/30 p-4 lg:flex-row lg:flex-wrap lg:items-end">
      <NativeSelect aria-label="Entidad" className="lg:w-40" value={params.get("entity") ?? ""} onChange={(e) => apply({ entity: e.target.value })}>
        <option value="">Todas las entidades</option>
        {entities.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="Usuario" className="lg:w-48" value={params.get("user") ?? ""} onChange={(e) => apply({ user: e.target.value })}>
        <option value="">Todos los usuarios</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="Origen" className="lg:w-36" value={params.get("actor") ?? ""} onChange={(e) => apply({ actor: e.target.value })}>
        <option value="">Todo origen</option>
        <option value="USER">Usuarios</option>
        <option value="EMILIA">Emilia (API)</option>
        <option value="SYSTEM">Sistema</option>
      </NativeSelect>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          apply(f);
        }}
      >
        <Input aria-label="La acción contiene" placeholder="Acción (p. ej. update)" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} className="lg:w-44" />
        <Input aria-label="Desde" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="lg:w-40" />
        <Input aria-label="Hasta" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="lg:w-40" />
        <Button type="submit" variant="soft">
          Filtrar
        </Button>
      </form>
    </div>
  );
}

const ACTOR_TONE: Record<string, "blue" | "coral" | "gray"> = { USER: "blue", EMILIA: "coral", SYSTEM: "gray" };

export function AuditTable({ logs }: { logs: Log[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!logs.length) return <EmptyState icon={History} title="Sin registros" description="Ajusta los filtros para ver otros movimientos." />;
  return (
    <ul className="divide-y">
      {logs.map((l) => {
        const open = openId === l.id;
        const rows = open ? diff(l.before, l.after) : [];
        const hasDetail = l.before !== null || l.after !== null;
        return (
          <li key={l.id}>
            <button
              type="button"
              className={cn("flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-muted/50", !hasDetail && "cursor-default")}
              onClick={() => hasDetail && setOpenId(open ? null : l.id)}
              aria-expanded={hasDetail ? open : undefined}
            >
              <ChevronRight className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90", !hasDetail && "opacity-0")} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-brand-ink">{l.action}</code>
                  <span className="text-sm text-brand-ink">{l.entity}</span>
                  {l.summary ? <span className="truncate text-sm text-muted-foreground">· {l.summary}</span> : null}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge tone={ACTOR_TONE[l.actorType] ?? "gray"}>{l.actor}</Badge>
                  {l.createdAt}
                  {l.ip ? <span>· IP {l.ip}</span> : null}
                  {l.entityId ? <span className="font-mono">· {l.entityId}</span> : null}
                </span>
              </span>
            </button>
            {open ? (
              <div className="overflow-x-auto px-5 pb-4 pl-12 scrollbar-thin">
                {rows.length ? (
                  <table className="w-full min-w-[32rem] text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-1 pr-3 font-semibold">Campo</th>
                        <th className="py-1 pr-3 font-semibold">Antes</th>
                        <th className="py-1 font-semibold">Después</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.key} className="border-t align-top">
                          <td className="py-1.5 pr-3 font-mono text-brand-ink">{r.key}</td>
                          <td className="max-w-[18rem] break-all py-1.5 pr-3 text-[#c23444]">{r.before}</td>
                          <td className="max-w-[18rem] break-all py-1.5 text-brand-green">{r.after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin cambios de campos registrados.</p>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
