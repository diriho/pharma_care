import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../../contexts/ThemeContext";
import type { WeeklyPatientData } from "../../types/analytics";

export type { WeeklyPatientData };

export interface WeeklyPatientVolumeProps {
  data: WeeklyPatientData[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const BAR_COLOR = "#059669"; // emerald-600 — passes contrast vs the white card surface

type VolumeTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ value?: number }>;
};

// Custom tooltip matching the app's card styling
function VolumeTooltip({ active, payload, label }: VolumeTooltipProps) {
  const { t } = useTranslation("dashboard");
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
        {t("charts.weeklyVolume.tooltipPatients", { count: payload[0].value ?? 0 })}
      </p>
    </div>
  );
}

// Animated skeleton shown while the data loads
function LoadingState() {
  const { t } = useTranslation("dashboard");
  const heights = [55, 80, 65, 72, 88, 62, 48];
  return (
    <div
      className="h-60 flex items-end justify-around gap-3 px-4 pb-8 animate-pulse"
      role="status"
      aria-label={t("charts.weeklyVolume.loadingAria")}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-8 rounded-t bg-slate-200 dark:bg-slate-700"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation("dashboard");
  return (
    <div className="h-60 flex flex-col items-center justify-center text-center px-6">
      <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
        <Users className="h-6 w-6 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {t("charts.weeklyVolume.emptyTitle")}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {t("charts.weeklyVolume.emptyHint")}
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div className="h-60 flex flex-col items-center justify-center text-center px-6">
      <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
        {t("errorBanner.prefix", { message })}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 underline hover:text-emerald-900 dark:hover:text-emerald-300"
        >
          {t("buttons.retry")}
        </button>
      )}
    </div>
  );
}

export default function WeeklyPatientVolume({
  data,
  loading = false,
  error = null,
  onRetry,
}: WeeklyPatientVolumeProps) {
  const { t } = useTranslation("dashboard");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const cursorColor = isDark ? "#1e293b" : "#f1f5f9";
  const total = data.reduce((sum, d) => sum + d.patients, 0);
  const isEmpty = !loading && !error && (data.length === 0 || total === 0);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t("charts.weeklyVolume.title")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("charts.weeklyVolume.subtitle")}
          </p>
        </div>
        {!loading && !error && !isEmpty && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            <Users className="h-3.5 w-3.5" />
            {t("charts.weeklyVolume.totalBadge", { count: total })}
          </span>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <>
          <div className="h-60" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                barCategoryGap="30%"
              >
                <CartesianGrid vertical={false} stroke={gridColor} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: tickColor, fontSize: 12 }}
                  tickFormatter={(d: string) => d.slice(0, 3)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: tickColor, fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<VolumeTooltip />}
                  cursor={{ fill: cursorColor, opacity: 0.6 }}
                />
                <Bar
                  dataKey="patients"
                  fill={BAR_COLOR}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Screen-reader table equivalent of the chart */}
          <table className="sr-only">
            <caption>{t("charts.weeklyVolume.tableCaption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("charts.weeklyVolume.tableDay")}</th>
                <th scope="col">{t("charts.weeklyVolume.tablePatients")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day}>
                  <td>{d.day}</td>
                  <td>{d.patients}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
