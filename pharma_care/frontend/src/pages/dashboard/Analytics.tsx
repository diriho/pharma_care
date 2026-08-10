import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../lib/format";
import { translateApiError } from "../../i18n/apiError";

type Analytics = {
  counts: { medicines: number; patients: number; suppliers: number; sales: number };
  inventoryValue: number;
  retailValue: number;
  totalRevenue: number;
  salesByDay: Record<string, number>;
  topMedicines: Record<string, number>;
};

type Medicine = { id: string; name: string };

export default function Analytics() {
  const { pharmacy } = useAuth();
  const { t } = useTranslation(["dashboard", "common"]);
  const [data, setData] = useState<Analytics | null>(null);
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a, m] = await Promise.all([
        api<Analytics>("/data/analytics"),
        api<Medicine[]>("/data/medicines"),
      ]);
      setData(a);
      setMeds(m);
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-slate-500 dark:text-slate-400">{t("common:common.loading")}</p>;
  if (error || !data) {
    return (
      <div className="px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
        <span>
          {t("dashboard:analytics.loadError", {
            message: error || t("dashboard:analytics.dataUnavailable"),
          })}
        </span>
        <button onClick={load} className="ml-auto underline font-semibold">
          {t("common:buttons.retry")}
        </button>
      </div>
    );
  }

  const currency = pharmacy?.currency || "FBU";
  const days = Object.entries(data.salesByDay).sort((a, b) =>
    a[0] < b[0] ? -1 : 1
  );
  const maxDay = Math.max(1, ...days.map(([, v]) => v));
  const topEntries = Object.entries(data.topMedicines)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxTop = Math.max(1, ...topEntries.map(([, v]) => v));

  return (
    <div>
      <PageHeader
        title={t("dashboard:analytics.title")}
        subtitle={t("dashboard:analytics.subtitle")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label={t("dashboard:analytics.kpi.totalRevenue")} value={formatCurrency(data.totalRevenue, currency)} />
        <KPI
          label={t("dashboard:analytics.kpi.stockValuePurchase")}
          value={formatCurrency(data.inventoryValue, currency)}
        />
        <KPI
          label={t("dashboard:analytics.kpi.stockValueSelling")}
          value={formatCurrency(data.retailValue, currency)}
        />
        <KPI label={t("dashboard:analytics.kpi.totalSales")} value={String(data.counts.sales)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3">
            {t("dashboard:analytics.salesByDay.title")}
          </h3>
          {days.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("dashboard:analytics.salesByDay.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {days.map(([day, value]) => (
                <li key={day} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-600 dark:text-slate-400">{day}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(value, currency)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-emerald-500 rounded-full"
                      style={{ width: `${(value / maxDay) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3">
            {t("dashboard:analytics.topMedicines.title")}
          </h3>
          {topEntries.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("dashboard:analytics.topMedicines.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {topEntries.map(([id, qty]) => {
                const med = meds.find((m) => m.id === id);
                return (
                  <li key={id} className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-600 dark:text-slate-400">{med?.name || id}</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{qty}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-[#063b1e] rounded-full"
                        style={{ width: `${(qty / maxTop) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
