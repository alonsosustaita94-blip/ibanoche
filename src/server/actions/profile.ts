"use server";

import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError, runAction } from "@/lib/action";
import { requireUser } from "@/lib/auth/guard";
import { getClientIp } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changePasswordSchema } from "@/lib/validation/user";

/** Cambia la contraseña propia y cierra las demás sesiones abiertas. */
export async function changePasswordAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const d = changePasswordSchema.parse(Object.fromEntries(formData));
    const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(d.current, record.passwordHash))) throw new BusinessError("La contraseña actual no es correcta.", { current: "Contraseña incorrecta." });
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(d.password) } }),
      db.session.deleteMany({ where: { userId: user.id, id: { not: user.sessionId } } }),
    ]);
    await audit({ userId: user.id, action: "auth.password_change", entity: "User", entityId: user.id, ip: await getClientIp() });
    return undefined;
  }, "Contraseña actualizada. Cerramos tus otras sesiones.");
}
