import type { TFunction } from "i18next";
import type { OperatingHours } from "../types/patient";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const WEEK_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

// Today's schedule as displayable text ("08:00-20:00" or a translated closed/unset label)
export function todayHours(hours: OperatingHours | null, t: TFunction): string {
  if (!hours) return t("patient:hours.notConfigured");
  const raw = hours[DAY_KEYS[new Date().getDay()]];
  if (!raw || raw.toLowerCase() === "closed") return t("patient:hours.closedToday");
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

// Full week for detail views: [["Mon", "08:00-20:00"], …]
export function weekSchedule(hours: OperatingHours | null, t: TFunction): [string, string][] {
  if (!hours) return [];
  return WEEK_ORDER.map((k) => [
    t(`patient:hours.days.${k}`),
    !hours[k] || hours[k].toLowerCase() === "closed" ? t("patient:hours.closed") : hours[k],
  ]);
}
