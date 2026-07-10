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
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-900">
        {payload[0].value} patient{(payload[0].value ?? 0) > 1 ? "s" : ""}
      </p>
    </div>
  );
}

// Animated skeleton shown while the data loads
function LoadingState() {
  const heights = [55, 80, 65, 72, 88, 62, 48];
  return (
    <div
      className="h-60 flex items-end justify-around gap-3 px-4 pb-8 animate-pulse"
      role="status"
      aria-label="Chargement du volume de patients"
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-8 rounded-t bg-slate-200"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-60 flex flex-col items-center justify-center text-center px-6">
      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <Users className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">Aucune donnée cette semaine</p>
      <p className="text-xs text-slate-500 mt-1">
        Le volume de patients apparaîtra ici dès les premières visites enregistrées.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="h-60 flex flex-col items-center justify-center text-center px-6">
      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
        Erreur de chargement : {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-sm font-semibold text-emerald-700 underline hover:text-emerald-900"
        >
          Réessayer
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
  const total = data.reduce((sum, d) => sum + d.patients, 0);
  const isEmpty = !loading && !error && (data.length === 0 || total === 0);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Weekly Patient Volume</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Patients servis sur les 7 derniers jours
          </p>
        </div>
        {!loading && !error && !isEmpty && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
            <Users className="h-3.5 w-3.5" />
            {total} patients
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
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={(d: string) => d.slice(0, 3)}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<VolumeTooltip />}
                  cursor={{ fill: "#f1f5f9", opacity: 0.6 }}
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
            <caption>Volume de patients par jour sur les 7 derniers jours</caption>
            <thead>
              <tr>
                <th scope="col">Jour</th>
                <th scope="col">Patients</th>
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
