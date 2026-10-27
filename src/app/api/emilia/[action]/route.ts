import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { BusinessError } from "@/lib/action";
import { normalizePhone, normalizeText, searchTextWhere } from "@/lib/utils";
import { authenticateApiKey, rateLimit, type ApiClientContext } from "@/server/services/api-auth";
import { createAppointment, getAvailability } from "@/server/services/appointments";
import { createQuote } from "@/server/services/quotes";
import { currentPublicPrices } from "@/server/services/pricing";
import { findOrCreatePatientForEmilia } from "@/server/services/patients";

/**
 * API para Emilia IA. Cada acción requiere un alcance (scope) de la llave,
 * valida sus parámetros y queda registrada en la auditoría.
 *
 * Emilia NO puede: diagnosticar, interpretar resultados, leer el contenido de
 * los resultados, autorizar reembolsos, modificar precios ni aplicar descuentos.
 * Por eso no existen acciones para ello y las cotizaciones se crean sin descuento.
 * Solo puede entregar el PDF de resultados al teléfono registrado del paciente.
 */

/** Vigencia del enlace temporal para descargar un PDF de resultados. */
const RESULT_LINK_MINUTES = 30;

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
    notes: z.string().trim().max(500).optional(),
    conversationId: z.string().optional(),
  }),
  listAppointments: z
    .object({ from: z.string().datetime(), to: z.string().datetime() })
    .refine((d) => new Date(d.to).getTime() - new Date(d.from).getTime() <= 8 * 86400_000, "El rango máximo es de 8 días."),
  findResults: z.object({
    phone: z.string().trim().min(10).max(20),
    firstName: z.string().trim().min(2).max(80),
    age: z.number().int().min(0).max(120).optional(),
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
  listAppointments: "appointments.read",
  findResults: "results.read",
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

const ageOn = (birth: Date, now = new Date()) => {
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) age--;
  return age;
};

async function handle(action: Action, input: unknown, client: ApiClientContext, origin: string) {
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
        { patientId: d.patientId, branchId: d.branchId, startsAt: new Date(d.startsAt), type: d.type, homeAddress: d.homeAddress, studyIds: d.studyIds, notes: d.notes, source: "EMILIA", status: "PENDING" },
        null,
      );
      return { appointmentId: appt.id, folio: appt.folio, status: appt.status, startsAt: appt.startsAt };
    }
    case "listAppointments": {
      // Para avisos al laboratorio y recordatorios al paciente. Solo datos de contacto y de agenda.
      const d = schemas.listAppointments.parse(input);
      const appts = await db.appointment.findMany({
        where: {
          isDemo: false,
          ...(client.branchId ? { branchId: client.branchId } : {}),
          OR: [
            { startsAt: { gte: new Date(d.from), lte: new Date(d.to) } },
            { createdAt: { gte: new Date(d.from), lte: new Date(d.to) } },
          ],
        },
        include: { patient: true, branch: true, studies: { include: { study: true } } },
        orderBy: { startsAt: "asc" },
        take: 300,
      });
      return appts.map((a) => ({
        id: a.id,
        folio: a.folio,
        startsAt: a.startsAt,
        createdAt: a.createdAt,
        status: a.status,
        type: a.type,
        source: a.source,
        homeAddress: a.homeAddress,
        notes: a.notes,
        branch: { name: a.branch.name, address: a.branch.address },
        studies: a.studies.map((s) => s.study.name),
        patient: {
          firstName: a.patient.firstName,
          lastName: a.patient.lastName,
          phone: a.patient.phoneNormalized,
          prefersWhatsApp: a.patient.prefersWhatsApp,
          contactConsent: a.patient.contactConsent,
        },
      }));
    }
    case "findResults": {
      // Solo para el número registrado del paciente: teléfono y nombre deben coincidir con la ficha.
      const d = schemas.findResults.parse(input);
      const phone = normalizePhone(d.phone);
      const first = normalizeText(d.firstName).split(/\s+/)[0];
      const candidates = await db.patient.findMany({
        where: { phoneNormalized: phone, isDemo: false, ...(client.branchId ? { branchId: client.branchId } : {}) },
        include: { results: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, fileName: true, createdAt: true } } },
      });
      const matches = candidates.filter(
        (p) => normalizeText(p.firstName).split(/\s+/).includes(first) && (d.age === undefined || !p.birthDate || Math.abs(ageOn(p.birthDate) - d.age) <= 1),
      );
      if (!matches.length) return { found: false, results: [], note: "No hay un paciente con ese nombre registrado con este número de WhatsApp." };
      const results = matches.flatMap((p) => p.results).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);
      if (!results.length) return { found: true, results: [], note: "Aún no hay resultados cargados para este paciente." };
      const expires = new Date(Date.now() + RESULT_LINK_MINUTES * 60_000);
      const links = [];
      for (const r of results) {
        const token = randomBytes(24).toString("base64url");
        await db.studyResult.update({ where: { id: r.id }, data: { downloadToken: token, tokenExpiresAt: expires, sentAt: new Date(), sentCount: { increment: 1 } } });
        const file = r.fileName.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 60) || "resultados";
        links.push({ id: r.id, fileName: `${file}.pdf`, createdAt: r.createdAt, url: `${origin}/api/resultados/${r.id}/${token}/${file}.pdf`, expiresAt: expires });
      }
      return { found: true, results: links };
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
    const data = await handle(act, body, client, req.nextUrl.origin);
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
