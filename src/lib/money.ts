/** Importes en centavos (enteros) y porcentajes en puntos base (1000 = 10 %). */

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function formatMoney(cents: number): string {
  return mxn.format(cents / 100);
}

export function formatCompactMoney(cents: number): string {
  const pesos = cents / 100;
  if (Math.abs(pesos) >= 1_000_000) return `$${(pesos / 1_000_000).toFixed(1)} M`;
  if (Math.abs(pesos) >= 10_000) return `$${Math.round(pesos / 1000)} k`;
  return mxn.format(pesos);
}

/** "123.45" o "123" → 12345. Devuelve null si no es un importe válido. */
export function parseMoneyToCents(input: string | number): number | null {
  const s = String(input).replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [int, dec = ""] = s.split(".");
  return Number(int) * 100 + Number(dec.padEnd(2, "0"));
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function bpsToPercent(bps: number): string {
  return `${(bps / 100).toLocaleString("es-MX", { maximumFractionDigits: 2 })} %`;
}

export function percentToBps(pct: number): number {
  return Math.round(pct * 100);
}

/** Descuento sobre un subtotal, redondeado al centavo. */
export function applyDiscount(subtotalCents: number, discountBps: number) {
  const discountCents = Math.round((subtotalCents * discountBps) / 10_000);
  return { discountCents, totalCents: subtotalCents - discountCents };
}
