import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError } from "@/lib/action";
import { normalizePhone, searchTextWhere } from "@/lib/utils";
import { authenticateApiKey, rateLimit, type ApiClientContext } from "@/server/services/api-auth";
import { createAppointment, getAvailability } from "@/server/services/appointments";
import { createQuote } from "@/server/services/quotes";
import { currentPublicPrices } from "@/server/services/pricing";
import { findOrCreatePatientForEmilia } from "@/server/services/patients";

/**
 * API para Emilia IA. Cada acción requiere un alcance (scope) de la llave,
 * valida sus parámetros y queda registrada en la auditoría.
 *
 * Emilia NO puede: diagnosticar, interpretar resultados, consultar resultados
 * clínicos, autorizar reembolsos, modificar precios ni aplicar descuentos.
 * Por eso no existen acciones para ello y las cotizaciones se crean sin descuento.
 */

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD");

const schemas = {
  searchStudies: z.object({ query: z.string().trim().min(2).max(80), limit: z.number().int().min(1).max(20).default(8) }),
  getApprovedPrice: z.object({ studyIds: z.array(z.string().min(1)).min(1).max(20) }),
  createQuote: z.object({
    branchId: z.string().min(1),
    patientId: z.string().optional(),
    prospectName: z.string().trim().min(2).max(120).optional(),
    prospectPhone: z.string().trim().max(20).optional(),
    items: z.array(z.object({ studyId: z.string().min(1), quantity: z.number().int().min(1).max(20).default(1) })).min(1).max(20),
    conversationId: z.string().optional(),
  }),
  listBranches: z.object({}),
  findOrCreatePatient: z.object({
    branchId: z.string().min(1),
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    secondLastName: z.string().trim().max(80).optional(),
    birthDate: date.optional(),
    phone: z.string().trim().min(10).max(20),
    email: z.string().trim().toLowerCase().email().max(120).optional(),
  }),
  checkAvailability: z.object({ branchId: z.string().min(1), date, type: z.enum(["BRANCH", "HOME"]).default("BRANCH") }),
  createAppointment: z.object({
    branchId: z.string().min(1),
    patientId: z.string().min(1),
    startsAt: z.string().datetime(),
    type: z.enum(["BRANCH", "HOME"]).default("BRANCH"),
    homeAddress: z.string().trim().max(300).optional(),
    studyIds: z.array(z.string()).max(20).default([]),
    conversationId: z.string().optional(),
  }),
  createLead: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(20).optional(),
    clientType: z.enum(["PATIENT", "DOCTOR", "CLINIC", "HOSPITAL", "COMPANY", "SCHOOL", "INSTITUTION"]).default("PATIENT"),
    interest: z.string().trim().max(500),
    branchId: z.string().min(1),
    estimatedCents: z.number().int().min(0).max(100_000_000).default(0),
  }),
  handoffToHuman: z.object({ conversationId: z.string().min(1), reason: z.string().trim().min(3).max(300) }),
} as const;

type Action = keyof typeof schemas;

const SCOPES: Record<Action, string> = {
  searchStudies: "studies.read",
  getApprovedPrice: "prices.read",
  createQuote: "quotes.create",
  listBranches: "availability.read",
  findOrCreatePatient: "patients.write",
  checkAvailability: "availability.read",
  createAppointment: "appointments.create",
  createLead: "leads.create",
  handoffToHuman: "handoff.create",
};

const MUTATIONS: Action[] = ["findOrCreatePatient", "createQuote", "createAppointment", "createLead", "handoffToHuman"];

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function branchAllowed(client: ApiClientContext, branchId: string) {
  if (client.branchId && client.branchId !== branchId) return false;
  return Boolean(await db.branch.findFirst({ where: { id: branchId, active: true } }));
}

async function handle(action: Action, input: unknown, client: ApiClientContext) {
  switch (action) {
    case "searchStudies": {
      const { query, limit } = schemas.searchStudies.parse(input);
      const studies = await db.study.findMany({
        where: { active: true, ...searchTextWhere(query) },
        include: { category: true },
        take: limit,
      });
      // Solo información aprobada: indicaciones y tiempos sin validar se omiten.
      return studies.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        category: s.category.name,
        sampleType: s.sampleTypeValidated ? s.sampleType : null,
        instructions: s.instructionsApproved ? s.instructions : null,
        turnaround: s.turnaroundConfirmed ? s.turnaround : null,
        note: s.instructionsApproved ? undefined : "Indicaciones pendientes de aprobación: transferir a personal para confirmarlas.",
      }));
    }
    case "getApprovedPrice": {
      const { studyIds } = schemas.getApprovedPrice.parse(input);
      const prices = await currentPublicPrices(studyIds);
      return studyIds.map((id) => {
        const p = prices.get(id);
        return p ? { studyId: id, code: p.code, name: p.name, publicPriceCents: p.amountCents, currency: "MXN" } : { studyId: id, available: false };
      });
    }
    case "createQuote": {
      const d = schemas.createQuote.parse(input);
      if (!(await branchAllowed(client, d.branchId))) throw new BusinessError("Sucursal no permitida.");
      const q = await createQuote(
        { branchId: d.branchId, patientId: d.patientId, prospectName: d.prospectName, prospectPhone: d.prospectPhone, items: d.items, discountBps: 0, source: "EMILIA", status: "SENT" },
        { userId: null, roleMaxBps: 0 },
      );
      return { quoteId: q.id, folio: q.folio, totalCents: q.totalCents, validUntil: q.validUntil };
    }
    case "listBranches": {
      schemas.listBranches.parse(input);
      const branches = await db.branch.findMany({
        where: { active: true, ...(client.branchId ? { id: client.branchId } : {}) },
        select: { id: true, code: true, name: true, address: true, phone: true },
        orderBy: { name: "asc" },
      });
      return branches;
    }
    case "findOrCreatePatient": {
      const d = schemas.findOrCreatePatient.parse(input);
      if (!(await branchAllowed(client, d.branchId))) throw new BusinessError("Sucursal no permitida.");
      if (d.birthDate && (new Date(d.birthDate) > new Date() || new Date(d.birthDate) < new Date("1900-01-01"))) {
        throw new BusinessError("Fecha de nacimiento no válida.");
      }
      // Solo se devuelve el identificador: Emilia no consulta expedientes.
      const { patient, created } = await findOrCreatePatientForEmilia(d);
      return { patientId: patient.id, folio: patient.folio, created };
    }
    case "checkAvailability": {
      const d = schemas.checkAvailability.parse(input);
      if (!(await branchAllowed(client, d.branchId))) throw new BusinessError("Sucursal no permitida.");
      const a = await getAvailability(d.branchId, d.date, d.type);
      return { open: a.open, slots: a.slots.filter((s) => s.available).map((s) => ({ time: s.time, startsAt: s.startsAt })) };
    }
    case "createAppointment": {
      const d = schemas.createAppointment.parse(input);
      if (!(await branchAllowed(client, d.branchId))) throw new BusinessError("Sucursal no permitida.");
      const patient = await db.patient.findUnique({ where: { id: d.patientId } });
      if (!patient) throw new BusinessError("Paciente no encontrado.");
      // Emilia solicita la cita: queda pendiente de confirmación por el personal.
      const appt = await createAppointment(
        { patientId: d.patientId, branchId: d.branchId, startsAt: new Date(d.startsAt), type: d.type, homeAddress: d.homeAddress, studyIds: d.studyIds, source: "EMILIA", status: "PENDING" },
        null,
      );
      return { appointmentId: appt.id, folio: appt.folio, status: appt.status, startsAt: appt.startsAt };
    }
    case "createLead": {
      const d = schemas.createLead.parse(input);
      if (!(await branchAllowed(client, d.branchId))) throw new BusinessError("Sucursal no permitida.");
      const phone = normalizePhone(d.phone);
      const opp = await db.opportunity.create({
        data: { title: d.interest.slice(0, 120), prospectName: d.name, prospectPhone: phone, clientType: d.clientType, branchId: d.branchId, estimatedCents: d.estimatedCents, stage: "PROSPECT", source: "EMILIA", notes: d.interest },
      });
      return { opportunityId: opp.id, stage: opp.stage };
    }
    case "handoffToHuman": {
      const d = schemas.handoffToHuman.parse(input);
      const conv = await db.conversation.update({
        where: { id: d.conversationId },
        data: { status: "TRANSFERRED", handoffReason: d.reason, messages: { create: { sender: "SYSTEM", body: `Conversación transferida a personal humano: ${d.reason}` } } },
      });
      await db.notification.create({ data: { branchId: conv.branchId, title: "Conversación transferida", body: `${conv.contactName}: ${d.reason}`, level: "warning", link: `/crm/emilia?c=${conv.id}` } });
      return { conversationId: conv.id, status: conv.status };
    }
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!(action in schemas)) return json(404, { error: "Acción no disponible." });
  const act = action as Action;

  const client = await authenticateApiKey(req.headers.get("authorization"));
  if (!client) return json(401, { error: "Llave de API no válida." });
  if (!client.scopes.includes(SCOPES[act])) return json(403, { error: "La llave no tiene permiso para esta acción." });
  if (!rateLimit(client.id)) return json(429, { error: "Demasiadas solicitudes. Intenta en un momento." });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "El cuerpo debe ser JSON válido." });
  }

  // Idempotencia para acciones que crean registros.
  const idemKey = req.headers.get("idempotency-key");
  if (MUTATIONS.includes(act)) {
    if (!idemKey || !/^[A-Za-z0-9_-]{8,100}$/.test(idemKey)) return json(400, { error: "Falta el encabezado Idempotency-Key." });
    const prev = await db.idempotencyRecord.findUnique({ where: { key: `${client.id}:${idemKey}` } });
    if (prev) return json(200, prev.response);
  }

  try {
    const data = await handle(act, body, client);
    const response = { ok: true, data } as const;
    if (MUTATIONS.includes(act) && idemKey) {
      await db.idempotencyRecord.create({ data: { key: `${client.id}:${idemKey}`, scope: act, response: JSON.parse(JSON.stringify(response)) as Prisma.InputJsonValue } }).catch(() => {});
    }
    await audit({ actorType: "EMILIA", action: `emilia.${act}`, entity: "ApiClient", entityId: client.id, summary: client.name, after: MUTATIONS.includes(act) ? data : undefined });
    return json(200, response);
  } catch (err) {
    if (err instanceof ZodError) return json(422, { error: "Parámetros no válidos.", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
    if (err instanceof BusinessError) return json(422, { error: err.message });
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") return json(404, { error: "Registro no encontrado." });
    console.error(err);
    return json(500, { error: "Error interno." });
  }
}

export function GET() {
  return json(405, { error: "Usa POST." });
}
