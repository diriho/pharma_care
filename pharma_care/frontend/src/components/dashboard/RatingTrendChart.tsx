import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MonthlyRating = { month: string; average: number; count: number };

const LINE_COLOR = "#059669"; // emerald-600 — same validated hue as the volume chart

function formatMonth(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}

type TrendTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: MonthlyRating }>;
};

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {formatMonth(point.month)}
      </p>
      <p className="text-sm font-bold text-slate-900">
        {point.average.toFixed(1)} / 5
        <span className="font-normal text-slate-500">
          {" "}
          ({point.count} avis)
        </span>
      </p>
    </div>
  );
}

// Monthly average rating trend (0–5), single series — no legend needed.
export default function RatingTrendChart({ data }: { data: MonthlyRating[] }) {
  return (
    <div className="h-40" aria-label="Évolution de la note moyenne par mois">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickFormatter={formatMonth}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#cbd5e1" }} />
          <Line
            type="monotone"
            dataKey="average"
            stroke={LINE_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: LINE_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
