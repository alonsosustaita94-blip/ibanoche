/** Etiquetas y colores de estados para toda la interfaz. */

type Tone = "blue" | "turquoise" | "coral" | "green" | "amber" | "gray" | "solid";
type LabelMap = Record<string, { label: string; tone: Tone }>;

export const APPOINTMENT_STATUS: LabelMap = {
  PENDING: { label: "Pendiente", tone: "coral" },
  CONFIRMED: { label: "Confirmada", tone: "blue" },
  IN_PROGRESS: { label: "En atención", tone: "turquoise" },
  COMPLETED: { label: "Completada", tone: "green" },
  CANCELLED: { label: "Cancelada", tone: "gray" },
  NO_SHOW: { label: "No asistió", tone: "amber" },
};

export const APPOINTMENT_TYPE: Record<string, string> = { BRANCH: "En sucursal", HOME: "A domicilio" };

export const QUOTE_STATUS: LabelMap = {
  DRAFT: { label: "Borrador", tone: "gray" },
  SENT: { label: "Enviada", tone: "blue" },
  FOLLOW_UP: { label: "En seguimiento", tone: "turquoise" },
  ACCEPTED: { label: "Aceptada", tone: "green" },
  REJECTED: { label: "Rechazada", tone: "coral" },
  EXPIRED: { label: "Vencida", tone: "amber" },
};

export const ORDER_STATUS: LabelMap = {
  DRAFT: { label: "Borrador", tone: "gray" },
  CONFIRMED: { label: "Confirmada", tone: "blue" },
  PAID: { label: "Pagada", tone: "turquoise" },
  IN_PROGRESS: { label: "En atención", tone: "amber" },
  COMPLETED: { label: "Finalizada", tone: "green" },
  CANCELLED: { label: "Cancelada", tone: "coral" },
};

export const PAYMENT_STATUS: LabelMap = {
  UNPAID: { label: "Sin pago", tone: "coral" },
  PARTIAL: { label: "Pago parcial", tone: "amber" },
  PAID: { label: "Pagada", tone: "green" },
  REFUNDED: { label: "Reembolsada", tone: "gray" },
};

export const PAYMENT_METHOD: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia" };
export const PAYMENT_KIND: Record<string, string> = { PAYMENT: "Pago", ADVANCE: "Anticipo", REFUND: "Devolución" };

export const PATIENT_STATUS: LabelMap = {
  ACTIVE: { label: "Activo", tone: "green" },
  INACTIVE: { label: "Inactivo", tone: "gray" },
};

export const PATIENT_TYPE: Record<string, string> = {
  PARTICULAR: "Particular",
  CONVENIO: "Convenio",
  EMPRESA: "Empresa",
  OTRO: "Otro",
};

export const CONTACT_SOURCE: Record<string, string> = {
  WALK_IN: "Recepción",
  PHONE: "Llamada",
  WHATSAPP: "WhatsApp",
  WEBSITE: "Sitio web",
  EMILIA: "Emilia",
  REFERRAL: "Referido",
  OTHER: "Otro",
};

export const INTERACTION_TYPE: Record<string, string> = {
  CALL: "Llamada",
  WHATSAPP: "WhatsApp",
  EMAIL: "Correo",
  VISIT: "Visita",
  NOTE: "Nota",
};

export const CONVERSATION_STATUS: LabelMap = {
  OPEN: { label: "Atendida por Emilia", tone: "turquoise" },
  PENDING: { label: "Pendiente", tone: "coral" },
  TRANSFERRED: { label: "Transferida", tone: "blue" },
  CLOSED: { label: "Cerrada", tone: "gray" },
};

export const OPPORTUNITY_STAGE: LabelMap = {
  PROSPECT: { label: "Prospecto", tone: "gray" },
  CONTACTED: { label: "Contactado", tone: "blue" },
  QUOTED: { label: "Cotizado", tone: "turquoise" },
  FOLLOW_UP: { label: "En seguimiento", tone: "amber" },
  WON: { label: "Cerrado ganado", tone: "green" },
  LOST: { label: "Cerrado perdido", tone: "coral" },
};

export const CLIENT_TYPE: Record<string, string> = {
  PATIENT: "Paciente",
  DOCTOR: "Médico",
  CLINIC: "Clínica",
  HOSPITAL: "Hospital",
  COMPANY: "Empresa",
  SCHOOL: "Escuela",
  INSTITUTION: "Institución",
};

export const PARTNER_TYPE: Record<string, string> = {
  DOCTOR: "Médico",
  CLINIC: "Clínica",
  HOSPITAL: "Hospital",
  COMPANY: "Empresa",
  SCHOOL: "Escuela",
  INSTITUTION: "Institución",
};

export const PARTNER_STATUS: LabelMap = {
  PROSPECT: { label: "Prospecto", tone: "gray" },
  NEGOTIATION: { label: "En negociación", tone: "amber" },
  ACTIVE: { label: "Activo", tone: "green" },
  INACTIVE: { label: "Inactivo", tone: "coral" },
};

export const AGREEMENT_STATUS: LabelMap = {
  DRAFT: { label: "Borrador", tone: "gray" },
  ACTIVE: { label: "Vigente", tone: "green" },
  EXPIRED: { label: "Vencido", tone: "amber" },
  CANCELLED: { label: "Cancelado", tone: "coral" },
};

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
