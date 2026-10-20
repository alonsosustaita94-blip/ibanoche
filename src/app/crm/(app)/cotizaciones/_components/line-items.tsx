"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import type { StudyOption } from "@/server/actions/lookup";
import { computeTotals, maxAllowedDiscountBps, validateDiscount } from "@/server/services/discounts";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudySearch } from "@/components/shared/pickers";
import { EmptyState } from "@/components/shared/empty-state";
import { FlaskConical } from "lucide-react";

export type Line = { studyId: string; code: string; name: string; unitPriceCents: number; quantity: number };
export type PromotionOption = { id: string; name: string; discountBps: number; validFrom: string | null; validTo: string | null };

export function addStudyLine(lines: Line[], s: StudyOption): Line[] {
  if (s.publicPriceCents === null) return lines;
  const found = lines.find((l) => l.studyId === s.id);
  if (found) return lines.map((l) => (l.studyId === s.id ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l));
  return [...lines, { studyId: s.id, code: s.code, name: s.name, unitPriceCents: s.publicPriceCents, quantity: 1 }];
}

/** Tabla editable de estudios (precio vigente, cantidad, importe). */
export function LineItemsEditor({ lines, onChange, compact = false }: { lines: Line[]; onChange: (l: Line[]) => void; compact?: boolean }) {
  const setQty = (id: string, q: number) => onChange(lines.map((l) => (l.studyId === id ? { ...l, quantity: Math.max(1, Math.min(99, q)) } : l)));
  return (
    <div className="grid gap-3">
      <StudySearch onSelect={(s) => onChange(addStudyLine(lines, s))} selectedIds={lines.map((l) => l.studyId)} />
      {lines.length === 0 ? (
        <div className="rounded-lg border border-dashed">
          <EmptyState icon={FlaskConical} title="Sin estudios" description="Busca un estudio por nombre o código para agregarlo." className="py-8" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-[0.68rem] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Estudio</th>
                {compact ? null : <th className="hidden px-3 py-2 font-semibold sm:table-cell">Código</th>}
                <th className="px-3 py-2 text-right font-semibold">Precio</th>
                <th className="px-3 py-2 text-center font-semibold">Cant.</th>
                <th className="px-3 py-2 text-right font-semibold">Importe</th>
                <th className="w-10 px-2 py-2">
                  <span className="sr-only">Eliminar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.studyId} className="border-t">
                  <td className="px-3 py-2">
                    <span className="block font-semibold text-brand-ink">{l.name}</span>
                    {compact ? <span className="block text-xs text-muted-foreground">{l.code}</span> : null}
                  </td>
                  {compact ? null : <td className="hidden px-3 py-2 font-mono text-xs text-muted-foreground sm:table-cell">{l.code}</td>}
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular">{formatMoney(l.unitPriceCents)}</td>
                  <td className="px-3 py-2">
                    <div className="mx-auto flex w-fit items-center rounded-md border bg-card">
                      <button type="button" className="p-1.5 text-muted-foreground hover:text-brand-blue disabled:opacity-40" onClick={() => setQty(l.studyId, l.quantity - 1)} disabled={l.quantity <= 1} aria-label={`Disminuir ${l.name}`}>
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm tabular" aria-live="polite">
                        {l.quantity}
                      </span>
                      <button type="button" className="p-1.5 text-muted-foreground hover:text-brand-blue disabled:opacity-40" onClick={() => setQty(l.studyId, l.quantity + 1)} disabled={l.quantity >= 99} aria-label={`Aumentar ${l.name}`}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular">{formatMoney(l.unitPriceCents * l.quantity)}</td>
                  <td className="px-2 py-2">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onChange(lines.filter((x) => x.studyId !== l.studyId))} aria-label={`Eliminar ${l.name}`}>
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function activePromotion(promotions: PromotionOption[], id: string | null) {
  const p = promotions.find((x) => x.id === id);
  return p ? { discountBps: p.discountBps, active: true, validFrom: p.validFrom ? new Date(p.validFrom) : null, validTo: p.validTo ? new Date(p.validTo) : null } : null;
}

/** Estado derivado del descuento y totales (misma regla que el servidor). */
export function useDiscountState(lines: Line[], discountPct: string, promotionId: string | null, promotions: PromotionOption[], roleMaxBps: number) {
  const n = Number(discountPct.replace(",", ".") || 0);
  const discountBps = Number.isFinite(n) ? Math.round(n * 100) : -1;
  const promotion = activePromotion(promotions, promotionId);
  const maxBps = maxAllowedDiscountBps({ roleMaxBps, promotion });
  const error = discountBps < 0 ? "Descuento no válido." : validateDiscount(discountBps, { roleMaxBps, promotion });
  const totals = computeTotals(lines, Math.max(0, discountBps));
  return { discountBps, maxBps, error, totals };
}

/** Panel de descuento autorizado + resumen. */
export function DiscountSummary({
  discountPct,
  onDiscountPct,
  promotionId,
  onPromotion,
  promotions,
  maxBps,
  roleMaxBps,
  error,
  totals,
}: {
  discountPct: string;
  onDiscountPct: (v: string) => void;
  promotionId: string | null;
  onPromotion: (id: string | null) => void;
  promotions: PromotionOption[];
  maxBps: number;
  roleMaxBps: number;
  error: string | null;
  totals: { subtotalCents: number; discountCents: number; totalCents: number };
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="promotion">Promoción autorizada</Label>
          <NativeSelect
            id="promotion"
            value={promotionId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              onPromotion(id);
              const p = promotions.find((x) => x.id === id);
              onDiscountPct(p ? String(p.discountBps / 100) : "0");
            }}
          >
            <option value="">Sin promoción</option>
            {promotions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.discountBps / 100} %)
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="discount">Descuento (%)</Label>
          <Input id="discount" inputMode="decimal" value={discountPct} onChange={(e) => onDiscountPct(e.target.value)} aria-invalid={!!error} aria-describedby="discount-help" />
          <p id="discount-help" className={error ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"} role={error ? "alert" : undefined}>
            {error ?? `Máximo autorizado: ${maxBps / 100} %${maxBps > roleMaxBps ? " (por promoción)" : ` (tu rol)`}. Los convenios activos del paciente se validan al guardar.`}
          </p>
        </div>
      </div>
      <dl className="grid gap-2 rounded-lg bg-muted/60 p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular">{formatMoney(totals.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Descuento autorizado</dt>
          <dd className="tabular text-brand-coral">−{formatMoney(totals.discountCents)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 font-display text-lg font-bold text-brand-ink">
          <dt>Total</dt>
          <dd className="tabular">{formatMoney(totals.totalCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
