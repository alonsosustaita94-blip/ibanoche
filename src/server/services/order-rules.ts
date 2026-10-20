/** Transiciones administrativas permitidas de una orden (función pura). */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PAID", "IN_PROGRESS", "CANCELLED"],
  PAID: ["IN_PROGRESS", "COMPLETED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: string, to: string) {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function paymentStatusFor(totalCents: number, paidCents: number): "UNPAID" | "PARTIAL" | "PAID" {
  if (paidCents <= 0) return "UNPAID";
  if (paidCents < totalCents) return "PARTIAL";
  return "PAID";
}

/** Transiciones del embudo comercial: las etapas cerradas solo se reabren a seguimiento. */
export const OPPORTUNITY_TRANSITIONS: Record<string, string[]> = {
  PROSPECT: ["CONTACTED", "QUOTED", "FOLLOW_UP", "WON", "LOST"],
  CONTACTED: ["PROSPECT", "QUOTED", "FOLLOW_UP", "WON", "LOST"],
  QUOTED: ["CONTACTED", "FOLLOW_UP", "WON", "LOST"],
  FOLLOW_UP: ["CONTACTED", "QUOTED", "WON", "LOST"],
  WON: ["FOLLOW_UP"],
  LOST: ["FOLLOW_UP"],
};

export function canMoveOpportunity(from: string, to: string) {
  return from === to || (OPPORTUNITY_TRANSITIONS[from]?.includes(to) ?? false);
}
