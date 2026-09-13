import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Download,
  Percent,
  Receipt,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { api } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import RevenueTrendChart, { type RevenuePoint } from "../../components/dashboard/RevenueTrendChart";
import TopMedicinesChart, { type TopMedicine } from "../../components/dashboard/TopMedicinesChart";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../lib/format";
import { translateApiError } from "../../i18n/apiError";

type Range = "7" | "30" | "90" | "all";

type Analytics = {
  counts: { medicines: number; patients: number; suppliers: number; sales: number };
  inventoryValue: number;
  retailValue: number;
  totalRevenue: number;
  period: {
    days: number | null;
    revenue: number;
    salesCount: number;
    avgSaleValue: number;
    grossProfit: number;
    marginPercent: number;
    revenueChangePct: number | null;
    salesCountChangePct: number | null;
  };
  salesTrend: RevenuePoint[];
  topMedicines: TopMedicine[];
};

type Alerts = { alerts: { severity: string; message: string; type: string }[] };

const RANGES: Range[] = ["7", "30", "90", "all"];

export default function Analytics() {
  const { pharmacy } = useAuth();
  const { t } = useTranslation(["dashboard", "common"]);
  const [range, setRange] = useState<Range>("30");
  const [data, setData] = useState<Analytics | null>(null);
  const [alertCounts, setAlertCounts] = useState({ lowStock: 0, expiring: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(currentRange: Range) {
    setLoading(true);
    setError(null);
    try {
      const [a, notif] = await Promise.all([
        api<Analytics>(`/data/analytics?range=${currentRange}`),
        api<Alerts>("/data/notifications"),
      ]);
      setData(a);
      setAlertCounts({
        lowStock: notif.alerts.filter((al) => al.type === "low_stock").length,
        expiring: notif.alerts.filter((al) => al.type === "expiring_soon" || al.type === "expired").length,
      });
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const currency = pharmacy?.currency || "FBU";

  function exportCsv() {
    if (!data) return;
    const rangeLabel =
      range === "all" ? t("dashboard:analytics.range.all") : t("dashboard:analytics.range.days", { count: Number(range) });
    const lines: string[] = [
      t("dashboard:analytics.export.title"),
      `${t("dashboard:analytics.export.pharmacy")},${pharmacy?.name || ""}`,
      `${t("dashboard:analytics.export.period")},${rangeLabel}`,
      "",
      t("dashboard:analytics.export.trendHeader"),
      ...data.salesTrend.map((p) => `${p.date},${p.revenue},${p.sales}`),
      "",
      t("dashboard:analytics.export.medicinesHeader"),
      ...data.topMedicines.map((m) => `"${m.name.replace(/"/g, '""')}",${m.quantity},${m.revenue}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-${(pharmacy?.name || "pharmacie").replace(/\s+/g, "-").toLowerCase()}-${range}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (loading && !data) return <p className="text-slate-500 dark:text-slate-400">{t("common:common.loading")}</p>;
  if (error || !data) {
    return (
      <div className="px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
        <span>
          {t("dashboard:analytics.loadError", {
            message: error || t("dashboard:analytics.dataUnavailable"),
          })}
        </span>
        <button onClick={() => load(range)} className="ml-auto underline font-semibold">
          {t("common:buttons.retry")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            {t("dashboard:analytics.title")}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#063b1e] text-[#6eff8a] text-[11px] font-bold uppercase tracking-wide">
              <Sparkles className="h-3 w-3" />
              {t("dashboard:analytics.proBadge")}
            </span>
          </span>
        }
        subtitle={t("dashboard:analytics.subtitle")}
        action={
          <div className="flex items-center gap-2">
            <RangeSelector value={range} onChange={setRange} />
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              {t("dashboard:analytics.export.button")}
            </button>
          </div>
        }
      />

      <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KPI
            label={t("dashboard:analytics.kpi.periodRevenue")}
            value={formatCurrency(data.period.revenue, currency)}
            changePct={data.period.revenueChangePct}
            icon={<Wallet className="h-5 w-5" />}
            tone="emerald"
          />
          <KPI
            label={t("dashboard:analytics.kpi.periodSales")}
            value={String(data.period.salesCount)}
            changePct={data.period.salesCountChangePct}
            icon={<Receipt className="h-5 w-5" />}
          />
          <KPI
            label={t("dashboard:analytics.kpi.avgSaleValue")}
            value={formatCurrency(data.period.avgSaleValue, currency)}
            icon={<ShoppingBag className="h-5 w-5" />}
          />
          <KPI
            label={t("dashboard:analytics.kpi.margin")}
            value={`${data.period.marginPercent.toFixed(1)}%`}
            hint={formatCurrency(data.period.grossProfit, currency)}
            icon={<Percent className="h-5 w-5" />}
          />
        </div>

        {(alertCounts.lowStock > 0 || alertCounts.expiring > 0) && (
          <Link
            to="/dashboard/inventory"
            className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              {t("dashboard:analytics.stockHealth.message", {
                lowStock: alertCounts.lowStock,
                expiring: alertCounts.expiring,
              })}
            </span>
            <span className="ml-auto text-xs font-semibold underline shrink-0">
              {t("dashboard:analytics.stockHealth.cta")}
            </span>
          </Link>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3">
              {t("dashboard:analytics.revenueTrend.title")}
            </h3>
            {data.salesTrend.every((p) => p.revenue === 0) ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("dashboard:analytics.revenueTrend.empty")}</p>
            ) : (
              <RevenueTrendChart data={data.salesTrend} currency={currency} />
            )}
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3">
              {t("dashboard:analytics.topMedicines.title")}
            </h3>
            {data.topMedicines.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("dashboard:analytics.topMedicines.empty")}</p>
            ) : (
              <TopMedicinesChart data={data.topMedicines} currency={currency} />
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ValueCard label={t("dashboard:analytics.kpi.totalRevenue")} value={formatCurrency(data.totalRevenue, currency)} />
          <ValueCard
            label={t("dashboard:analytics.kpi.stockValuePurchase")}
            value={formatCurrency(data.inventoryValue, currency)}
          />
          <ValueCard
            label={t("dashboard:analytics.kpi.stockValueSelling")}
            value={formatCurrency(data.retailValue, currency)}
          />
        </div>
      </div>
    </div>
  );
}

function RangeSelector({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-900">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
            value === r
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          {r === "all" ? t("analytics.range.allShort") : t("analytics.range.daysShort", { count: Number(r) })}
        </button>
      ))}
    </div>
  );
}

function KPI({
  label,
  value,
  hint,
  changePct,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  changePct?: number | null;
  icon: React.ReactNode;
  tone?: "emerald";
}) {
  const { t } = useTranslation("dashboard");
  return (
    <div
      className={`rounded-2xl p-5 ${
        tone === "emerald"
          ? "bg-[#063b1e] text-[#6eff8a]"
          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <p
          className={`text-xs uppercase tracking-wide font-semibold ${
            tone === "emerald" ? "text-[#6eff8a]/80" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {label}
        </p>
        <div className={tone === "emerald" ? "text-[#6eff8a]/80" : "text-emerald-600 dark:text-emerald-400"}>{icon}</div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <div className="flex items-center gap-2 mt-1 h-5">
        {hint && <span className={`text-xs ${tone === "emerald" ? "text-[#6eff8a]/70" : "text-slate-500 dark:text-slate-400"}`}>{hint}</span>}
        {changePct !== undefined && <TrendBadge changePct={changePct} light={tone === "emerald"} />}
      </div>
      <span className="sr-only">{t("analytics.kpi.vsPreviousPeriod")}</span>
    </div>
  );
}

function TrendBadge({ changePct, light }: { changePct: number | null; light?: boolean }) {
  const { t } = useTranslation("dashboard");
  if (changePct === null) {
    return (
      <span className={`text-xs font-semibold ${light ? "text-[#6eff8a]/70" : "text-slate-400 dark:text-slate-500"}`}>
        {t("analytics.trend.new")}
      </span>
    );
  }
  const isUp = changePct >= 0;
  const colorClass = light
    ? "text-[#6eff8a]"
    : isUp
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${colorClass}`}>
      {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {Math.abs(changePct).toFixed(1)}%
      <span className="sr-only">{t("analytics.trend.vsPreviousPeriod")}</span>
    </span>
  );
}

function ValueCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
