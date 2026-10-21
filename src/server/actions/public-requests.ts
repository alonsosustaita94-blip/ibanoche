"use server";

import { headers } from "next/headers";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { normalizePhone } from "@/lib/utils";
import { publicRequestSchema, REQUEST_TYPES } from "@/lib/validation/public-request";
import { rateLimit } from "@/server/services/api-auth";

export type PublicRequestResult = { ok: true; reference: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const CLIENT_TYPE = { informacion: "PATIENT", cita: "PATIENT", profesional: "DOCTOR", empresa: "COMPANY", consultorio: "DOCTOR" } as const;

/**
 * Solicitud enviada desde el sitio web público. No requiere sesión: se
 * registra como oportunidad comercial (Prospecto, origen "Sitio web") y
 * notifica a la sucursal. No se piden ni se guardan datos clínicos.
 */
export async function submitPublicRequestAction(formData: FormData): Promise<PublicRequestResult> {
  try {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!rateLimit(`web:${ip}`, 5)) return { ok: false, error: "Recibimos varias solicitudes seguidas. Inténtalo de nuevo en unos minutos." };

    const input = publicRequestSchema.parse(Object.fromEntries(formData));
    // Envíos automáticos: campo trampa lleno o formulario enviado en menos de 3 s.
    if (input.website || Date.now() - input.renderedAt < 3000) return { ok: true, reference: "WEB" };

    const branch = input.branchId
      ? await db.branch.findFirst({ where: { id: input.branchId, active: true } })
      : await db.branch.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
    if (!branch) return { ok: false, error: "No pudimos registrar tu solicitud. Contáctanos por teléfono o WhatsApp." };

    const label = REQUEST_TYPES[input.type];
    const notes = [
      `Solicitud desde el sitio web: ${label}.`,
      input.organization ? `Organización: ${input.organization}.` : null,
      input.preferredDate ? `Fecha preferida: ${input.preferredDate}.` : null,
      input.email ? `Correo: ${input.email}.` : null,
      input.message ? `Mensaje: ${input.message}` : null,
      "Aceptó el aviso de privacidad.",
    ]
      .filter(Boolean)
      .join("\n");

    const opp = await db.opportunity.create({
      data: {
        title: `${label} — sitio web`,
        prospectName: input.organization ? `${input.name} (${input.organization})` : input.name,
        prospectPhone: normalizePhone(input.phone),
        clientType: CLIENT_TYPE[input.type],
        stage: "PROSPECT",
        source: "WEBSITE",
        branchId: branch.id,
        nextFollowUpAt: new Date(Date.now() + 24 * 3600000),
        notes,
      },
    });
    await db.notification.create({
      data: {
        branchId: branch.id,
        title: "Nueva solicitud del sitio web",
        body: `${input.name} · ${label}`,
        level: "warning",
        link: `/crm/oportunidades?view=table&q=${encodeURIComponent(input.name)}`,
      },
    });
    await audit({ actorType: "SYSTEM", action: "website.request", entity: "Opportunity", entityId: opp.id, branchId: branch.id, summary: label, ip });
    return { ok: true, reference: opp.id.slice(-6).toUpperCase() };
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const i of err.issues) fieldErrors[i.path.join(".")] ??= i.message;
      return { ok: false, error: "Revisa los campos marcados.", fieldErrors };
    }
    console.error(err);
    return { ok: false, error: "No pudimos enviar tu solicitud. Inténtalo de nuevo o contáctanos por WhatsApp." };
  }
}
