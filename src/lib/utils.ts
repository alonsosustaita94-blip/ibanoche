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
