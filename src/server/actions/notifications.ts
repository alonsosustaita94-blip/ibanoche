"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
}
