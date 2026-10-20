import { localDateKey, localTime } from "@/lib/dates";

/** "YYYY-MM-DDTHH:mm" en hora local del laboratorio para inputs datetime-local. */
export function toLocalInput(d: Date | null | undefined) {
  if (!d) return null;
  return `${localDateKey(d)}T${localTime(d)}`;
}
