"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { History } from "lucide-react";
import { toast } from "sonner";
import { priceHistoryAction, setPriceAction, type PriceVersion } from "@/server/actions/catalog";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { FormField } from "@/components/shared/form-field";
import type { StudyRow } from "./types";

const KIND_LABEL = { PUBLIC: "Precio público", INTERNAL_COST: "Costo interno" } as const;

export function PriceDialog({
  study,
  canViewCost,
  canEdit,
  open,
  onOpenChange,
}: {
  study: StudyRow;
  canViewCost: boolean;
  canEdit: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [history, setHistory] = useState<PriceVersion[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setHistory(null);
    priceHistoryAction(study.id).then((r) => {
      if (!alive) return;
      if (r.ok) setHistory(r.data);
      else {
        toast.error(r.error);
        setHistory([]);
      }
    });
    return () => {
      alive = false;
    };
  }, [open, study.id, reload]);

  const current = (kind: "PUBLIC" | "INTERNAL_COST") => history?.find((h) => h.kind === kind && !h.validTo);

  return (
    <Dialog open={open} onOpenChange={(o) => (onOpenChange(o), !o && setErrors({}))}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Tarifas · {study.name}</DialogTitle>
          <DialogDescription>
            Las tarifas no se editan: cada cambio crea una nueva versión y conserva el historial. Las cotizaciones ya emitidas mantienen su precio.
          </DialogDescription>
        </DialogHeader>

        <div className={`grid gap-3 ${canViewCost ? "sm:grid-cols-2" : ""}`}>
          {(canViewCost ? (["PUBLIC", "INTERNAL_COST"] as const) : (["PUBLIC"] as const)).map((k) => (
            <div key={k} className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">{KIND_LABEL[k]} vigente</p>
              {history === null ? (
                <Skeleton className="mt-2 h-7 w-28" />
              ) : (
                <p className="mt-1 font-display text-2xl font-bold text-brand-ink tabular">{current(k) ? formatMoney(current(k)!.amountCents) : "—"}</p>
              )}
              {current(k) ? <p className="text-xs text-muted-foreground">Desde {formatDateTime(current(k)!.validFrom)}</p> : null}
            </div>
          ))}
        </div>

        {canEdit ? (
          <form
            className="grid gap-3 rounded-lg border bg-muted/40 p-4 sm:grid-cols-[10rem_9rem_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              fd.set("studyId", study.id);
              start(async () => {
                const r = await setPriceAction(fd);
                if (!r.ok) {
                  setErrors(r.fieldErrors ?? {});
                  toast.error(r.error);
                  return;
                }
                toast.success(r.message ?? "Tarifa actualizada");
                setErrors({});
                form.reset();
                setReload((n) => n + 1);
                router.refresh();
              });
            }}
          >
            <FormField id="price-kind" label="Tipo">
              <NativeSelect id="price-kind" name="kind" defaultValue="PUBLIC" disabled={!canViewCost}>
                <option value="PUBLIC">Precio público</option>
                {canViewCost ? <option value="INTERNAL_COST">Costo interno</option> : null}
              </NativeSelect>
            </FormField>
            {!canViewCost ? <input type="hidden" name="kind" value="PUBLIC" /> : null}
            <FormField id="price-amount" label="Nuevo importe" error={errors.amount}>
              <Input id="price-amount" name="amount" inputMode="decimal" placeholder="0.00" aria-invalid={!!errors.amount} required />
            </FormField>
            <FormField id="price-reason" label="Motivo del cambio" error={errors.reason}>
              <Input id="price-reason" name="reason" placeholder="Ej. actualización de tarifas" aria-invalid={!!errors.reason} required />
            </FormField>
            <Button type="submit" loading={pending}>
              Registrar
            </Button>
          </form>
        ) : null}

        <div>
          <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-brand-ink">
            <History className="h-4 w-4 text-brand-turquoise" /> Historial de versiones
          </h3>
          {history === null ? (
            <Skeleton className="h-24 w-full" />
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin tarifas registradas.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg border scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left text-[0.68rem] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Tipo</th>
                    <th className="px-3 py-2 text-right font-semibold">Importe</th>
                    <th className="px-3 py-2 font-semibold">Vigencia</th>
                    <th className="hidden px-3 py-2 font-semibold sm:table-cell">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t">
                      <td className="px-3 py-2">
                        <Badge tone={h.kind === "PUBLIC" ? "blue" : "gray"}>{KIND_LABEL[h.kind]}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular">{formatMoney(h.amountCents)}</td>
                      <td className="px-3 py-2 text-xs">
                        {formatDateTime(h.validFrom)} → {h.validTo ? formatDateTime(h.validTo) : <Badge tone="green">Vigente</Badge>}
                      </td>
                      <td className="hidden px-3 py-2 text-xs text-muted-foreground sm:table-cell">
                        {h.reason ?? "—"}
                        {h.createdBy ? <span className="block">{h.createdBy}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
