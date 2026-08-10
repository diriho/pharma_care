import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import NotificationCenter, {
  type NotificationsAdapter,
} from "../../components/notifications/NotificationCenter";
import ErrorBanner from "../../components/ui/ErrorBanner";
import { SkeletonLines } from "../../components/ui/Skeleton";
import { api } from "../../api/client";
import {
  deleteNotification,
  getInboxNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/pharmacyAdmin";
import { translateApiError } from "../../i18n/apiError";

const adapter: NotificationsAdapter = {
  list: getInboxNotifications,
  markRead: markNotificationRead,
  markAllRead: markAllNotificationsRead,
  remove: deleteNotification,
};

type Alert = { type: string; severity: string; message: string };

// Pharmacy notification center: the persisted inbox (orders, ratings, messages)
// plus the computed stock & expiry alerts that used to live in the bell dropdown.
export default function Notifications() {
  const { t } = useTranslation("dashboard");
  return (
    <div>
      <NotificationCenter
        title={t("notifications.title")}
        adapter={adapter}
        emptyHint={t("notifications.emptyHint")}
      />
      <AlertsSection />
    </div>
  );
}

function AlertsSection() {
  const { t } = useTranslation(["dashboard", "common"]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ alerts: Alert[] }>("/data/notifications");
      setAlerts(data.alerts || []);
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">
        {t("dashboard:notifications.alerts.title")}
      </h3>
      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading ? (
        <SkeletonLines lines={3} />
      ) : alerts.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          {t("dashboard:notifications.alerts.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert, i) => (
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
    </section>
  );
}
