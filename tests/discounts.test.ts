import { describe, expect, it } from "vitest";
import { computeTotals, maxAllowedDiscountBps, validateDiscount } from "@/server/services/discounts";
import { canMoveOpportunity, canTransition, paymentStatusFor } from "@/server/services/order-rules";

describe("descuentos", () => {
  it("respeta el máximo del rol", () => {
    expect(validateDiscount(500, { roleMaxBps: 500 })).toBeNull();
    expect(validateDiscount(501, { roleMaxBps: 500 })).toMatch(/máximo autorizado es 5.00 %/);
  });
  it("permite una promoción vigente aunque supere el rol", () => {
    const promotion = { discountBps: 1500, active: true, validFrom: null, validTo: null };
    expect(maxAllowedDiscountBps({ roleMaxBps: 500, promotion })).toBe(1500);
    expect(validateDiscount(1500, { roleMaxBps: 500, promotion })).toBeNull();
  });
  it("ignora promociones vencidas o inactivas", () => {
    const now = new Date("2026-10-20");
    expect(maxAllowedDiscountBps({ roleMaxBps: 0, promotion: { discountBps: 1500, active: true, validFrom: null, validTo: new Date("2026-10-01") }, now })).toBe(0);
    expect(maxAllowedDiscountBps({ roleMaxBps: 0, promotion: { discountBps: 1500, active: false, validFrom: null, validTo: null }, now })).toBe(0);
  });
  it("aplica el descuento de convenio", () => {
    expect(validateDiscount(1000, { roleMaxBps: 0, agreementBps: 1000 })).toBeNull();
  });
  it("rechaza valores no válidos", () => {
    expect(validateDiscount(-1, { roleMaxBps: 10000 })).not.toBeNull();
    expect(validateDiscount(10.5, { roleMaxBps: 10000 })).not.toBeNull();
    expect(validateDiscount(10001, { roleMaxBps: 20000 })).not.toBeNull();
  });
  it("calcula totales en centavos sin errores de redondeo", () => {
    expect(computeTotals([{ unitPriceCents: 18000, quantity: 1 }, { unitPriceCents: 29000, quantity: 2 }], 1000)).toEqual({ subtotalCents: 76000, discountCents: 7600, totalCents: 68400 });
    expect(computeTotals([{ unitPriceCents: 333, quantity: 1 }], 3333)).toEqual({ subtotalCents: 333, discountCents: 111, totalCents: 222 });
  });
});

describe("estados de orden y embudo", () => {
  it("solo permite transiciones válidas", () => {
    expect(canTransition("DRAFT", "CONFIRMED")).toBe(true);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransition("CANCELLED", "PAID")).toBe(false);
  });
  it("calcula el estado de pago", () => {
    expect(paymentStatusFor(1000, 0)).toBe("UNPAID");
    expect(paymentStatusFor(1000, 400)).toBe("PARTIAL");
    expect(paymentStatusFor(1000, 1000)).toBe("PAID");
  });
  it("reabre oportunidades cerradas solo a seguimiento", () => {
    expect(canMoveOpportunity("WON", "FOLLOW_UP")).toBe(true);
    expect(canMoveOpportunity("WON", "PROSPECT")).toBe(false);
  });
});
