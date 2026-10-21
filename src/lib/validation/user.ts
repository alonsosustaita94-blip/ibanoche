import { z } from "zod";
import { checkbox, percentBps } from "./common";
import { passwordIssues } from "@/lib/auth/password";
import { PERMISSIONS } from "@/lib/auth/permissions";

const password = z.string().superRefine((v, ctx) => {
  const issue = passwordIssues(v);
  if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
});

const roleKey = z.enum(["ADMIN", "RECEPTION", "CASHIER", "SALES", "SUPERVISOR", "READ_ONLY"]);

export const userCreateSchema = z.object({
  name: z.string().trim().min(3, "Escribe el nombre completo.").max(120),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido."),
  roleKey,
  branchIds: z.array(z.string().min(1)).min(1, "Asigna al menos una sucursal."),
  password,
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(3, "Escribe el nombre completo.").max(120),
  roleKey,
  branchIds: z.array(z.string().min(1)).min(1, "Asigna al menos una sucursal."),
  active: checkbox,
});

export const resetPasswordSchema = z.object({ password });

export const rolePermissionsSchema = z.object({
  roleKey,
  permissions: z.array(z.enum(Object.keys(PERMISSIONS) as [keyof typeof PERMISSIONS, ...(keyof typeof PERMISSIONS)[]])),
  maxDiscount: percentBps,
});

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Escribe tu contraseña actual."),
    password,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden.", path: ["confirm"] })
  .refine((d) => d.password !== d.current, { message: "La nueva contraseña debe ser distinta de la actual.", path: ["password"] });
