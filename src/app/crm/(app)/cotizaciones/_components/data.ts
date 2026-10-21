import "server-only";
import { db } from "@/lib/db";
import { promotionIsValid } from "@/server/services/discounts";
import type { PromotionOption } from "./line-items";

export async function loadActivePromotions(): Promise<PromotionOption[]> {
  const rows = await db.promotion.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return rows
    .filter((p) => promotionIsValid(p))
    .map((p) => ({ id: p.id, name: p.name, discountBps: p.discountBps, validFrom: p.validFrom?.toISOString() ?? null, validTo: p.validTo?.toISOString() ?? null }));
}

export async function quoteValidityDays() {
  const s = await db.systemSetting.findUnique({ where: { key: "quotes" } });
  return Number((s?.value as { validityDays?: number } | null)?.validityDays ?? 15);
}
