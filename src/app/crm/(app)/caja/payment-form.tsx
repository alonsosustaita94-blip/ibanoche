"use client";

import { useMemo, useState } from "react";
import { Banknote, CreditCard, Landmark, Shuffle } from "lucide-react";
import { formatMoney, parseMoneyToCents } from "@/lib/money";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type Part = { method: "CASH" | "CARD" | "TRANSFER"; amountCents: number; reference?: string | null };
type Mode = "CASH" | "CARD" | "TRANSFER" | "MIXED";

const MODES: { key: Mode; label: string; icon: typeof Banknote }[] = [
  { key: "CASH", label: "Efectivo", icon: Banknote },
  { key: "CARD", label: "Tarjeta", icon: CreditCard },
  { key: "TRANSFER", label: "Transferencia", icon: Landmark },
  { key: "MIXED", label: "Pago mixto", icon: Shuffle },
];

const cents = (v: string) => (v.trim() === "" ? 0 : parseMoneyToCents(v));

/**
 * Captura del cobro. Devuelve las partes válidas o un mensaje de error.
 * `dueCents` es el saldo; con "anticipo" se puede cobrar menos.
 */
export function usePaymentForm(dueCents: number) {
  const [mode, setMode] = useState<Mode>("CASH");
  const [advance, setAdvance] = useState(false);
  const [amount, setAmount] = useState("");
  const [received, setReceived] = useState("");
  const [reference, setReference] = useState("");
  const [mixed, setMixed] = useState({ CASH: "", CARD: "", TRANSFER: "" });

  const state = useMemo(() => {
    const charge = advance ? cents(amount) : dueCents;
    if (charge === null) return { error: "Escribe un importe válido.", parts: [] as Part[], charge: 0, change: 0 };
    if (dueCents <= 0) return { error: "No hay saldo por cobrar.", parts: [], charge: 0, change: 0 };
    if (charge <= 0) return { error: "Escribe el importe del anticipo.", parts: [], charge, change: 0 };
    if (charge > dueCents) return { error: "El importe supera el saldo.", parts: [], charge, change: 0 };
    if (mode === "MIXED") {
      const parts: Part[] = [];
      for (const m of ["CASH", "CARD", "TRANSFER"] as const) {
        const c = cents(mixed[m]);
        if (c === null) return { error: "Revisa los importes del pago mixto.", parts: [], charge, change: 0 };
        if (c > 0) parts.push({ method: m, amountCents: c, reference: m === "CASH" ? null : reference || null });
      }
      const sum = parts.reduce((a, p) => a + p.amountCents, 0);
      if (parts.length < 2) return { error: "El pago mixto requiere al menos dos métodos.", parts: [], charge, change: 0 };
      if (sum !== charge) return { error: `Los importes suman ${formatMoney(sum)}; deben sumar ${formatMoney(charge)}.`, parts: [], charge, change: 0 };
      return { error: null, parts, charge, change: 0 };
    }
    if (mode === "CASH") {
      const rec = received.trim() === "" ? charge : cents(received);
      if (rec === null) return { error: "Escribe el efectivo recibido.", parts: [], charge, change: 0 };
      if (rec < charge) return { error: "El efectivo recibido es menor al importe.", parts: [], charge, change: 0 };
      return { error: null, parts: [{ method: "CASH" as const, amountCents: charge }], charge, change: rec - charge };
    }
    return { error: null, parts: [{ method: mode, amountCents: charge, reference: reference || null }], charge, change: 0 };
  }, [mode, advance, amount, received, reference, mixed, dueCents]);

  const reset = () => {
    setMode("CASH");
    setAdvance(false);
    setAmount("");
    setReceived("");
    setReference("");
    setMixed({ CASH: "", CARD: "", TRANSFER: "" });
  };

  const fields = (
    <div className="grid gap-4">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-brand-ink">Método de pago</legend>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(({ key, label, icon: Icon }) => (
            <button
              type="button"
              key={key}
              onClick={() => setMode(key)}
              aria-pressed={mode === key}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition",
                mode === key ? "border-brand-blue bg-brand-ice text-brand-blue ring-1 ring-brand-blue" : "bg-card text-brand-ink hover:border-brand-turquoise",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" /> {label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={advance} onCheckedChange={(v) => setAdvance(v === true)} /> Registrar anticipo (cobro parcial)
      </label>
      {advance ? (
        <div className="grid gap-1.5">
          <Label htmlFor="advance-amount">Importe del anticipo</Label>
          <Input id="advance-amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      ) : null}

      {mode === "MIXED" ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {(["CASH", "CARD", "TRANSFER"] as const).map((m) => (
            <div key={m} className="grid gap-1.5">
              <Label htmlFor={`mixed-${m}`}>{m === "CASH" ? "Efectivo" : m === "CARD" ? "Tarjeta" : "Transferencia"}</Label>
              <Input id={`mixed-${m}`} inputMode="decimal" placeholder="0.00" value={mixed[m]} onChange={(e) => setMixed((x) => ({ ...x, [m]: e.target.value }))} />
            </div>
          ))}
        </div>
      ) : null}
      {mode === "CASH" ? (
        <div className="grid gap-1.5">
          <Label htmlFor="cash-received">Efectivo recibido</Label>
          <Input id="cash-received" inputMode="decimal" placeholder={state.charge ? (state.charge / 100).toFixed(2) : "0.00"} value={received} onChange={(e) => setReceived(e.target.value)} />
        </div>
      ) : null}
      {mode === "CARD" || mode === "TRANSFER" || mode === "MIXED" ? (
        <div className="grid gap-1.5">
          <Label htmlFor="pay-ref">Referencia o autorización (opcional)</Label>
          <Input id="pay-ref" maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Últimos 4 dígitos, folio de terminal o de transferencia" />
        </div>
      ) : null}

      <dl className="grid gap-1.5 rounded-lg bg-muted/60 p-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Saldo</dt>
          <dd className="tabular">{formatMoney(dueCents)}</dd>
        </div>
        <div className="flex justify-between font-semibold text-brand-ink">
          <dt>A cobrar</dt>
          <dd className="tabular">{formatMoney(Math.max(0, state.charge))}</dd>
        </div>
        {mode === "CASH" && state.change > 0 ? (
          <div className="flex justify-between font-semibold text-brand-green">
            <dt>Cambio</dt>
            <dd className="tabular">{formatMoney(state.change)}</dd>
          </div>
        ) : null}
      </dl>
      {state.error && dueCents > 0 ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );

  return { ...state, fields, reset };
}
