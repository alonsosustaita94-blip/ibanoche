import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { nextPatientFolio } from "@/lib/folio";
import { normalizeEmail, normalizePhone, patientSearchText } from "@/lib/utils";
import type { PatientInput } from "@/lib/validation/patient";

export type DuplicateCandidate = { id: string; folio: string; name: string; phone: string | null; email: string | null; reason: string };

/**
 * Posibles duplicados: mismo teléfono, mismo correo, o mismo nombre completo
 * con misma fecha de nacimiento. Se buscan en todas las sucursales para no
 * crear dos fichas de la misma persona.
 */
export async function findDuplicates(input: Pick<PatientInput, "firstName" | "lastName" | "birthDate" | "phone" | "email">, excludeId?: string) {
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const or: Prisma.PatientWhereInput[] = [];
  if (phone) or.push({ phoneNormalized: phone });
  if (email) or.push({ emailNormalized: email });
  if (input.birthDate)
    or.push({
      firstName: { equals: input.firstName, mode: "insensitive" },
      lastName: { equals: input.lastName, mode: "insensitive" },
      birthDate: new Date(input.birthDate),
    });
  if (!or.length) return [];
  const rows = await db.patient.findMany({ where: { OR: or, ...(excludeId ? { id: { not: excludeId } } : {}) }, take: 5 });
  return rows.map<DuplicateCandidate>((p) => ({
    id: p.id,
    folio: p.folio,
    name: [p.firstName, p.lastName, p.secondLastName].filter(Boolean).join(" "),
    phone: p.phone,
    email: p.email,
    reason: phone && p.phoneNormalized === phone ? "Mismo teléfono" : email && p.emailNormalized === email ? "Mismo correo" : "Mismo nombre y fecha de nacimiento",
  }));
}

function toData(input: PatientInput) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    secondLastName: input.secondLastName ?? null,
    birthDate: input.birthDate ? new Date(input.birthDate) : null,
    phone: input.phone ?? null,
    phoneNormalized: normalizePhone(input.phone),
    email: input.email ?? null,
    emailNormalized: normalizeEmail(input.email),
    type: input.type,
    status: input.status,
    source: input.source,
    branchId: input.branchId,
    partnerId: input.partnerId ?? null,
    prefersWhatsApp: input.prefersWhatsApp,
    prefersEmail: input.prefersEmail,
    prefersPhone: input.prefersPhone,
    adminNotes: input.adminNotes ?? null,
  };
}

export async function createPatient(input: PatientInput) {
  return db.$transaction(async (tx) => {
    const folio = await nextPatientFolio(tx);
    const data = toData(input);
    return tx.patient.create({
      data: { ...data, folio, searchText: patientSearchText({ ...data, folio }), contactConsent: input.contactConsent, consentAt: input.contactConsent ? new Date() : null },
    });
  });
}

export async function updatePatient(id: string, input: PatientInput) {
  const before = await db.patient.findUniqueOrThrow({ where: { id } });
  const consentChanged = before.contactConsent !== input.contactConsent;
  const data = toData(input);
  const after = await db.patient.update({
    where: { id },
    data: {
      ...data,
      searchText: patientSearchText({ ...data, folio: before.folio }),
      contactConsent: input.contactConsent,
      consentAt: consentChanged ? (input.contactConsent ? new Date() : null) : before.consentAt,
    },
  });
  return { before, after };
}
