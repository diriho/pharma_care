import { api } from "../api/client";
import type { WeeklyPatientData } from "../types/analytics";

// Patient volume for the last 7 days, computed server-side from sales.
export async function getWeeklyPatientVolume(): Promise<WeeklyPatientData[]> {
  return api<WeeklyPatientData[]>("/data/analytics/weekly-patients");
}
