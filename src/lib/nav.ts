import type { Permission } from "@/lib/auth/permissions";

export type NavItem = { href: string; label: string; icon: string; permission: Permission };

/** Menú principal. `icon` es el nombre de un ícono de lucide-react (ver sidebar). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/crm/dashboard", label: "Dashboard", icon: "LayoutDashboard", permission: "dashboard.view" },
  { href: "/crm/pacientes", label: "Pacientes", icon: "Users", permission: "patients.view" },
  { href: "/crm/agenda", label: "Agenda y citas", icon: "CalendarDays", permission: "appointments.view" },
  { href: "/crm/catalogo", label: "Catálogo de estudios", icon: "FlaskConical", permission: "catalog.view" },
  { href: "/crm/cotizaciones", label: "Cotizaciones", icon: "FileText", permission: "quotes.view" },
  { href: "/crm/ordenes", label: "Órdenes", icon: "ClipboardList", permission: "orders.view" },
  { href: "/crm/caja", label: "Caja / POS", icon: "Wallet", permission: "pos.charge" },
  { href: "/crm/emilia", label: "Emilia IA", icon: "MessageCircleHeart", permission: "emilia.view" },
  { href: "/crm/oportunidades", label: "Oportunidades", icon: "Target", permission: "opportunities.view" },
  { href: "/crm/convenios", label: "Convenios", icon: "Handshake", permission: "partners.view" },
  { href: "/crm/reportes", label: "Reportes", icon: "BarChart3", permission: "reports.view" },
  { href: "/crm/configuracion", label: "Configuración", icon: "Settings", permission: "settings.view" },
];
