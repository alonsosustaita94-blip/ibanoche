/**
 * Reglas de descuento (funciones puras, probadas en tests/discounts.test.ts).
 * Un descuento es válido si no supera el máximo del rol, o si coincide con una
 * promoción vigente o un convenio activo autorizados.
 */
export type DiscountContext = {
  roleMaxBps: number;
  promotion?: { discountBps: number; active: boolean; validFrom: Date | null; validTo: Date | null } | null;
  agreementBps?: number | null;
  now?: Date;
};

export function promotionIsValid(p: NonNullable<DiscountContext["promotion"]>, now = new Date()) {
  return p.active && (!p.validFrom || p.validFrom <= now) && (!p.validTo || p.validTo >= now);
}

export function maxAllowedDiscountBps(ctx: DiscountContext): number {
  const promo = ctx.promotion && promotionIsValid(ctx.promotion, ctx.now) ? ctx.promotion.discountBps : 0;
  return Math.max(ctx.roleMaxBps, promo, ctx.agreementBps ?? 0);
}

export function validateDiscount(requestedBps: number, ctx: DiscountContext): string | null {
  if (!Number.isInteger(requestedBps) || requestedBps < 0) return "El descuento no es válido.";
  if (requestedBps > 10_000) return "El descuento no puede superar el 100 %.";
  const max = maxAllowedDiscountBps(ctx);
  if (requestedBps > max) return `El descuento máximo autorizado es ${(max / 100).toFixed(2)} %.`;
  return null;
}

export type LineInput = { unitPriceCents: number; quantity: number };

export function computeTotals(lines: LineInput[], discountBps: number) {
  const subtotalCents = lines.reduce((a, l) => a + l.unitPriceCents * l.quantity, 0);
  const discountCents = Math.round((subtotalCents * discountBps) / 10_000);
  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
}
