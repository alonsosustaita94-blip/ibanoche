/**
 * Catálogo de permisos y permisos por rol. El servidor los verifica en cada
 * acción (ver guard.ts); ocultar botones en la interfaz es solo cortesía.
 */

export const PERMISSIONS = {
  "dashboard.view": "Ver dashboard",
  "patients.view": "Ver pacientes",
  "patients.manage": "Crear y editar pacientes",
  "appointments.view": "Ver agenda",
  "appointments.manage": "Crear y modificar citas",
  "catalog.view": "Ver catálogo",
  "catalog.manage": "Crear y editar estudios",
  "catalog.viewCost": "Ver costo interno",
  "prices.manage": "Administrar tarifas",
  "quotes.view": "Ver cotizaciones",
  "quotes.manage": "Crear y editar cotizaciones",
  "orders.view": "Ver órdenes",
  "orders.manage": "Crear y modificar órdenes",
  "pos.charge": "Cobrar en caja",
  "pos.cashSession": "Abrir y cerrar caja",
  "pos.void": "Anular cobros",
  "emilia.view": "Ver conversaciones de Emilia",
  "emilia.reply": "Responder y transferir conversaciones",
  "opportunities.view": "Ver oportunidades",
  "opportunities.manage": "Crear y mover oportunidades",
  "partners.view": "Ver convenios",
  "partners.manage": "Crear y editar convenios",
  "reports.view": "Ver reportes",
  "reports.export": "Exportar reportes",
  "settings.view": "Ver configuración",
  "settings.manage": "Modificar configuración",
  "users.manage": "Administrar usuarios y roles",
  "audit.view": "Ver auditoría",
  "branches.all": "Acceso a todas las sucursales",
} as const;

export type Permission = keyof typeof PERMISSIONS;

const ALL = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_DEFINITIONS: Record<
  "ADMIN" | "RECEPTION" | "CASHIER" | "SALES" | "SUPERVISOR" | "READ_ONLY",
  { name: string; description: string; maxDiscountBps: number; permissions: Permission[] }
> = {
  ADMIN: {
    name: "Administrador",
    description: "Acceso total al sistema y a la configuración.",
    maxDiscountBps: 3000,
    permissions: ALL,
  },
  SUPERVISOR: {
    name: "Supervisor",
    description: "Supervisa la operación, autoriza descuentos y consulta reportes.",
    maxDiscountBps: 2000,
    permissions: ALL.filter((p) => !["settings.manage", "users.manage"].includes(p)),
  },
  RECEPTION: {
    name: "Recepción",
    description: "Atiende pacientes, agenda citas y genera cotizaciones.",
    maxDiscountBps: 500,
    permissions: [
      "dashboard.view",
      "patients.view",
      "patients.manage",
      "appointments.view",
      "appointments.manage",
      "catalog.view",
      "quotes.view",
      "quotes.manage",
      "orders.view",
      "orders.manage",
      "emilia.view",
      "emilia.reply",
      "partners.view",
    ],
  },
  CASHIER: {
    name: "Caja",
    description: "Registra cobros, anticipos y cortes de caja.",
    maxDiscountBps: 500,
    permissions: [
      "dashboard.view",
      "patients.view",
      "catalog.view",
      "quotes.view",
      "orders.view",
      "orders.manage",
      "pos.charge",
      "pos.cashSession",
    ],
  },
  SALES: {
    name: "Comercial",
    description: "Da seguimiento a oportunidades, convenios y cotizaciones.",
    maxDiscountBps: 1000,
    permissions: [
      "dashboard.view",
      "patients.view",
      "patients.manage",
      "appointments.view",
      "catalog.view",
      "quotes.view",
      "quotes.manage",
      "orders.view",
      "emilia.view",
      "emilia.reply",
      "opportunities.view",
      "opportunities.manage",
      "partners.view",
      "partners.manage",
      "reports.view",
      "branches.all",
    ],
  },
  READ_ONLY: {
    name: "Solo lectura",
    description: "Consulta información sin modificarla.",
    maxDiscountBps: 0,
    permissions: ALL.filter((p) => p.endsWith(".view") && p !== "audit.view" && p !== "settings.view"),
  },
};

export function hasPermission(perms: readonly string[], p: Permission) {
  return perms.includes(p);
}
