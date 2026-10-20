import type { Permission } from "@/lib/auth/permissions";

export type NavItem = { href: string; label: string; icon: string; permission: Permission };

/** Menú principal. `icon` es el nombre de un ícono de lucide-react (ver sidebar). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", permission: "dashboard.view" },
  { href: "/pacientes", label: "Pacientes", icon: "Users", permission: "patients.view" },
  { href: "/agenda", label: "Agenda y citas", icon: "CalendarDays", permission: "appointments.view" },
  { href: "/catalogo", label: "Catálogo de estudios", icon: "FlaskConical", permission: "catalog.view" },
  { href: "/cotizaciones", label: "Cotizaciones", icon: "FileText", permission: "quotes.view" },
  { href: "/ordenes", label: "Órdenes", icon: "ClipboardList", permission: "orders.view" },
  { href: "/caja", label: "Caja / POS", icon: "Wallet", permission: "pos.charge" },
  { href: "/emilia", label: "Emilia IA", icon: "MessageCircleHeart", permission: "emilia.view" },
  { href: "/oportunidades", label: "Oportunidades", icon: "Target", permission: "opportunities.view" },
  { href: "/convenios", label: "Convenios", icon: "Handshake", permission: "partners.view" },
  { href: "/reportes", label: "Reportes", icon: "BarChart3", permission: "reports.view" },
  { href: "/configuracion", label: "Configuración", icon: "Settings", permission: "settings.view" },
];
