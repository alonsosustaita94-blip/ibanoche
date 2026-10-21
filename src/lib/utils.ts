import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // Conserva los últimos 10 dígitos (número nacional en México).
  return digits.slice(-10);
}

export function normalizeEmail(email?: string | null): string | null {
  return email ? email.trim().toLowerCase() : null;
}

export function fullName(p: { firstName: string; lastName: string; secondLastName?: string | null }) {
  return [p.firstName, p.lastName, p.secondLastName].filter(Boolean).join(" ");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** Normaliza para búsquedas sin acentos ni mayúsculas. */
export function normalizeText(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Texto de búsqueda de un estudio (debe coincidir con la migración search_text). */
export function studySearchText(s: { code: string; name: string; synonyms: string[] }) {
  return normalizeText([s.code, s.name, ...s.synonyms].join(" "));
}

/** Texto de búsqueda de un paciente. */
export function patientSearchText(p: {
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  folio: string;
  phoneNormalized?: string | null;
  emailNormalized?: string | null;
}) {
  return normalizeText([p.firstName, p.lastName, p.secondLastName, p.folio, p.phoneNormalized, p.emailNormalized].filter(Boolean).join(" "));
}

/** Condición de búsqueda: cada palabra debe aparecer en searchText. */
export function searchTextWhere(q: string) {
  const words = normalizeText(q).split(/\s+/).filter(Boolean).slice(0, 6);
  return { AND: words.map((w) => ({ searchText: { contains: w } })) };
}
