import { useEffect, useState } from "react";
import {
  Pill,
  Users,
  Truck,
  Receipt,
  AlertTriangle,
  CalendarClock,
  MessageSquare,
  ShoppingBag,
  Star,
  ClipboardCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency, formatDate } from "../../lib/format";
import PageHeader from "../../components/PageHeader";
import WeeklyPatientVolume from "../../components/dashboard/WeeklyPatientVolume";
import StarRating from "../../components/ui/StarRating";
import EmptyState from "../../components/ui/EmptyState";
import { getWeeklyPatientVolume } from "../../services/patientAnalytics";
import { getPortalStats, type PortalStats } from "../../services/pharmacyAdmin";
import type { WeeklyPatientData } from "../../types/analytics";
import RatingTrendChart from "../../components/dashboard/RatingTrendChart";
import { translateApiError } from "../../i18n/apiError";

type Analytics = {
  counts: { medicines: number; patients: number; suppliers: number; sales: number };
  inventoryValue: number;
  retailValue: number;
  totalRevenue: number;
};

type Alerts = { alerts: { severity: string; message: string; type: string }[] };

export default function Overview() {
  const { pharmacy } = useAuth();
  const { t } = useTranslation(["dashboard", "common"]);
  const [a, setA] = useState<Analytics | null>(null);
  const [stats, setStats] = useState<PortalStats | null>(null);
  const [n, setN] = useState<Alerts["alerts"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekly, setWeekly] = useState<WeeklyPatientData[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  async function loadWeekly() {
    setWeeklyLoading(true);
    setWeeklyError(null);
    try {
      setWeekly(await getWeeklyPatientVolume());
    } catch (err) {
      setWeeklyError(translateApiError(err, t));
    } finally {
      setWeeklyLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [analytics, notif, portalStats] = await Promise.all([
        api<Analytics>("/data/analytics"),
        api<Alerts>("/data/notifications"),
        getPortalStats(),
      ]);
      setA(analytics);
      setN(notif.alerts);
      setStats(portalStats);
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!pharmacy) return;
    load();
    loadWeekly();
  }, [pharmacy]);

  const currency = pharmacy?.currency || "FBU";

  return (
    <div>
      <PageHeader
        title={t("dashboard:overview.welcome", {
          name: pharmacy?.name || t("dashboard:overview.defaultName"),
        })}
        subtitle={t("dashboard:overview.subtitle")}
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
          <span>{t("common:errorBanner.prefix", { message: error })}</span>
          <button onClick={load} className="ml-auto underline font-semibold">
            {t("common:buttons.retry")}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 dark:text-slate-400">{t("common:common.loading")}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label={t("dashboard:overview.stats.medicines")}
              value={a?.counts.medicines ?? 0}
              icon={<Pill className="h-5 w-5" />}
            />
            <StatCard
              label={t("dashboard:overview.stats.patients")}
              value={a?.counts.patients ?? 0}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              label={t("dashboard:overview.stats.suppliers")}
              value={a?.counts.suppliers ?? 0}
              icon={<Truck className="h-5 w-5" />}
            />
            <StatCard
              label={t("dashboard:overview.stats.sales")}
              value={a?.counts.sales ?? 0}
              icon={<Receipt className="h-5 w-5" />}
            />
          </div>

          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                label={t("dashboard:overview.stats.ordersTotal")}
                value={stats.orders.total}
                icon={<ShoppingBag className="h-5 w-5" />}
              />
              <StatCard
                label={t("dashboard:overview.stats.ordersPending")}
                value={stats.orders.pending}
                icon={<ClipboardCheck className="h-5 w-5" />}
              />
              <StatCard
                label={t("dashboard:overview.stats.ordersCompleted")}
                value={stats.orders.completed}
                icon={<Receipt className="h-5 w-5" />}
              />
              <StatCard
                label={t("dashboard:overview.stats.activeConversations")}
                value={stats.conversations.active}
                icon={<MessageSquare className="h-5 w-5" />}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <ValueCard
              label={t("dashboard:overview.revenue")}
              value={formatCurrency(a?.totalRevenue ?? 0, currency)}
              tone="emerald"
            />
            <ValueCard
              label={t("dashboard:overview.stockValuePurchase")}
              value={formatCurrency(a?.inventoryValue ?? 0, currency)}
            />
            <ValueCard
              label={t("dashboard:overview.stockValueSelling")}
              value={formatCurrency(a?.retailValue ?? 0, currency)}
            />
          </div>

          <div className="mb-6">
            <WeeklyPatientVolume
              data={weekly}
              loading={weeklyLoading}
              error={weeklyError}
              onRetry={loadWeekly}
            />
          </div>

          {stats && <RatingsSection ratings={stats.ratings} />}

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
              {t("dashboard:overview.recentAlerts")}
            </h3>
            {n.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("dashboard:overview.noAlerts")}
              </p>
            ) : (
              <ul className="space-y-2">
                {n.slice(0, 8).map((alert, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      alert.severity === "critical"
                        ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                        : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    {alert.type === "low_stock" ? (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    ) : (
                      <CalendarClock className="h-4 w-4 shrink-0" />
                    )}
                    <span className="text-sm">{alert.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Ratings analytics: average, distribution bars, monthly trend, recent reviews
function RatingsSection({ ratings }: { ratings: PortalStats["ratings"] }) {
  const { t } = useTranslation("dashboard");
  const maxBucket = Math.max(1, ...Object.values(ratings.distribution));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
          {t("overview.ratings.title")}
        </h3>
        {ratings.count === 0 ? (
          <EmptyState
            icon={<Star className="h-6 w-6" />}
            title={t("overview.ratings.empty")}
            hint={t("overview.ratings.emptyHint")}
          />
        ) : (
          <>
            <div className="flex items-center gap-4 mb-5">
              <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                {ratings.average.toFixed(1)}
                <span className="text-lg font-semibold text-slate-400 dark:text-slate-500"> / 5</span>
              </p>
              <div>
                <StarRating value={ratings.average} />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("overview.ratings.totalReviews", { count: ratings.count })}
                </p>
              </div>
            </div>

            <ul className="space-y-2 mb-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratings.distribution[star] || 0;
                return (
                  <li key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-8 shrink-0 text-slate-600 dark:text-slate-400 font-semibold">
                      {star} ★
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-emerald-500 rounded-full"
                        style={{ width: `${(count / maxBucket) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-slate-500 dark:text-slate-400">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>

            {ratings.byMonth.length >= 2 && (
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                  {t("overview.ratings.byMonth")}
                </p>
                <RatingTrendChart data={ratings.byMonth} />
              </div>
            )}
          </>
        )}
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
          {t("overview.recentReviews.title")}
        </h3>
        {ratings.recent.length === 0 ? (
          <EmptyState
            icon={<Star className="h-6 w-6" />}
            title={t("overview.recentReviews.empty")}
            hint={t("overview.recentReviews.emptyHint")}
          />
        ) : (
          <ul className="space-y-3">
            {ratings.recent.map((r) => (
              <li key={r.id} className="border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {r.patient_name}
                  </span>
                  <StarRating value={r.rating} />
                </div>
                {r.review && <p className="text-sm text-slate-600 dark:text-slate-400">{r.review}</p>}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatDate(r.updated_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div className="text-emerald-600 dark:text-emerald-400">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function ValueCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald";
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${
        tone === "emerald"
          ? "bg-[#063b1e] text-[#6eff8a]"
          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          tone === "emerald" ? "text-[#6eff8a]/80" : "text-slate-500 dark:text-slate-400"
        } mb-2`}
      >
        {label}
      </p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
