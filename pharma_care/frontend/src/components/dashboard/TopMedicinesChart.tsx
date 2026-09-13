import { useTranslation } from "react-i18next";
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
import { formatCurrency } from "../../lib/format";

export type TopMedicine = { id: string; name: string; quantity: number; revenue: number };

const BAR_COLOR = "#063b1e"; // brand green — distinguishes this chart from the emerald revenue trend

type TopMedicinesTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: TopMedicine }>;
  currency: string;
};

function TopMedicinesTooltip({ active, payload, currency }: TopMedicinesTooltipProps) {
  const { t } = useTranslation("dashboard");
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-3 py-2">
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{point.name}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {formatCurrency(point.revenue, currency)} · {t("charts.topMedicines.tooltipQuantity", { count: point.quantity })}
      </p>
    </div>
  );
}

function truncateLabel(name: string) {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
}

// Horizontal bar chart ranking medicines by revenue for the selected period.
export default function TopMedicinesChart({
  data,
  currency,
}: {
  data: TopMedicine[];
  currency: string;
}) {
  const { t } = useTranslation("dashboard");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const cursorColor = isDark ? "#1e293b" : "#f1f5f9";

  return (
    <div className="h-64" aria-label={t("charts.topMedicines.ariaLabel")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
          barCategoryGap="24%"
        >
          <CartesianGrid horizontal={false} stroke={gridColor} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: tickColor, fontSize: 12 }}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            width={100}
            tick={{ fill: tickColor, fontSize: 12 }}
            tickFormatter={truncateLabel}
          />
          <Tooltip
            content={<TopMedicinesTooltip currency={currency} />}
            cursor={{ fill: cursorColor, opacity: 0.6 }}
          />
          <Bar dataKey="revenue" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
