/**
 * Utilidades de fecha en la zona horaria del laboratorio. Las fechas se
 * guardan en UTC; los horarios de sucursal se expresan en hora local.
 */

export const TIMEZONE = process.env.APP_TIMEZONE || "America/Mexico_City";

function partsInZone(date: Date, tz = TIMEZONE) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: weekdays.indexOf(p.weekday),
  };
}

/** Diferencia (minutos) entre la hora local de la zona y UTC en ese instante. */
function offsetMinutes(date: Date, tz = TIMEZONE) {
  const p = partsInZone(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** "2026-10-21" + "09:30" en hora local → Date (UTC). */
export function zonedDateTime(dateStr: string, timeStr: string, tz = TIMEZONE): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const first = new Date(guess.getTime() - offsetMinutes(guess, tz) * 60000);
  return new Date(guess.getTime() - offsetMinutes(first, tz) * 60000);
}

/** Fecha local "YYYY-MM-DD" de un instante. */
export function localDateKey(date: Date, tz = TIMEZONE): string {
  const p = partsInZone(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function localTime(date: Date, tz = TIMEZONE): string {
  const p = partsInZone(date, tz);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function localWeekday(date: Date, tz = TIMEZONE): number {
  return partsInZone(date, tz).weekday;
}

/** Inicio del día local (00:00) como instante UTC. */
export function startOfLocalDay(date: Date, tz = TIMEZONE): Date {
  return zonedDateTime(localDateKey(date, tz), "00:00", tz);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

const dateFmt = new Intl.DateTimeFormat("es-MX", { timeZone: TIMEZONE, day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const timeFmt = new Intl.DateTimeFormat("es-MX", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const formatDate = (d: Date | string | null | undefined) => (d ? dateFmt.format(new Date(d)) : "—");
export const formatDateTime = (d: Date | string | null | undefined) => (d ? dateTimeFmt.format(new Date(d)) : "—");
export const formatTime = (d: Date | string) => timeFmt.format(new Date(d));

/** Rango de fechas por periodo predefinido, en hora local. */
export type Period = "today" | "7d" | "30d" | "month" | "quarter" | "year";

export function periodRange(period: Period, now = new Date()): { from: Date; to: Date } {
  const today = localDateKey(now);
  const to = zonedDateTime(addDays(today, 1), "00:00");
  const [y, m] = today.split("-").map(Number);
  switch (period) {
    case "today":
      return { from: zonedDateTime(today, "00:00"), to };
    case "7d":
      return { from: zonedDateTime(addDays(today, -6), "00:00"), to };
    case "30d":
      return { from: zonedDateTime(addDays(today, -29), "00:00"), to };
    case "month":
      return { from: zonedDateTime(`${y}-${String(m).padStart(2, "0")}-01`, "00:00"), to };
    case "quarter": {
      const qm = Math.floor((m - 1) / 3) * 3 + 1;
      return { from: zonedDateTime(`${y}-${String(qm).padStart(2, "0")}-01`, "00:00"), to };
    }
    case "year":
      return { from: zonedDateTime(`${y}-01-01`, "00:00"), to };
  }
}

export const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoy",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  month: "Este mes",
  quarter: "Este trimestre",
  year: "Este año",
};

export function parsePeriod(v: string | undefined, fallback: Period = "month"): Period {
  return v && v in PERIOD_LABELS ? (v as Period) : fallback;
}
