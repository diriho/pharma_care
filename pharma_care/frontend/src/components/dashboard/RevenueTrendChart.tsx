import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../../contexts/ThemeContext";
import { formatCurrency, formatShortDate } from "../../lib/format";

export type RevenuePoint = { date: string; revenue: number; sales: number };

const LINE_COLOR = "#059669"; // emerald-600 — same validated hue as the other dashboard charts

type RevenueTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: RevenuePoint }>;
  currency: string;
};

function RevenueTooltip({ active, payload, currency }: RevenueTooltipProps) {
  const { t, i18n } = useTranslation("dashboard");
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {formatShortDate(point.date, i18n.language)}
      </p>
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
        {formatCurrency(point.revenue, currency)}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t("charts.revenueTrend.tooltipSales", { count: point.sales })}
      </p>
    </div>
  );
}

// Revenue-over-time area chart with a soft gradient fill for a premium feel.
export default function RevenueTrendChart({
  data,
  currency,
}: {
  data: RevenuePoint[];
  currency: string;
}) {
  const { t, i18n } = useTranslation("dashboard");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const cursorColor = isDark ? "#475569" : "#cbd5e1";

  return (
    <div className="h-64" aria-label={t("charts.revenueTrend.ariaLabel")}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="revenueTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.35} />
              <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={gridColor} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: tickColor, fontSize: 12 }}
            tickFormatter={(d: string) => formatShortDate(d, i18n.language)}
            minTickGap={24}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: tickColor, fontSize: 12 }}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip content={<RevenueTooltip currency={currency} />} cursor={{ stroke: cursorColor }} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={LINE_COLOR}
            strokeWidth={2}
            fill="url(#revenueTrendFill)"
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
