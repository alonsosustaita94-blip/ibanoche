import bcrypt from "bcryptjs";

const ROUNDS = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** Mínimo 10 caracteres con letras y números. */
export function passwordIssues(pw: string): string | null {
  if (pw.length < 10) return "La contraseña debe tener al menos 10 caracteres.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "La contraseña debe incluir letras y números.";
  return null;
}
