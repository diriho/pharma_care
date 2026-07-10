import type { OperatingHours } from "../types/patient";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DAY_LABELS_FR: Record<string, string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mer",
  thu: "Jeu",
  fri: "Ven",
  sat: "Sam",
  sun: "Dim",
};

// Today's schedule as displayable text ("08:00-20:00" or "Fermé")
export function todayHours(hours: OperatingHours | null): string {
  if (!hours) return "Horaires non renseignés";
  const raw = hours[DAY_KEYS[new Date().getDay()]];
  if (!raw || raw.toLowerCase() === "closed") return "Fermé aujourd'hui";
  return raw;
}

// null = unknown (no schedule data)
export function isOpenNow(hours: OperatingHours | null): boolean | null {
  if (!hours) return null;
  const raw = hours[DAY_KEYS[new Date().getDay()]];
  if (!raw) return null;
  if (raw.toLowerCase() === "closed") return false;
  const match = raw.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const open = Number(match[1]) * 60 + Number(match[2]);
  const close = Number(match[3]) * 60 + Number(match[4]);
  return minutes >= open && minutes < close;
}

// Full week for detail views: [["Lun", "08:00-20:00"], …]
export function weekSchedule(hours: OperatingHours | null): [string, string][] {
  if (!hours) return [];
  const ordered = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return ordered.map((k) => [
    DAY_LABELS_FR[k],
    !hours[k] || hours[k].toLowerCase() === "closed" ? "Fermé" : hours[k],
  ]);
}
