import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import NotificationCenter, {
  type NotificationsAdapter,
} from "../../components/notifications/NotificationCenter";
import ErrorBanner from "../../components/ui/ErrorBanner";
import { SkeletonLines } from "../../components/ui/Skeleton";
import { api } from "../../api/client";
import {
  getInboxNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/pharmacyAdmin";

const adapter: NotificationsAdapter = {
  list: getInboxNotifications,
  markRead: markNotificationRead,
  markAllRead: markAllNotificationsRead,
};

type Alert = { type: string; severity: string; message: string };

// Pharmacy notification center: the persisted inbox (orders, ratings, messages)
// plus the computed stock & expiry alerts that used to live in the bell dropdown.
export default function Notifications() {
  return (
    <div>
      <NotificationCenter
        title="Notifications"
        adapter={adapter}
        emptyHint="Les nouvelles commandes, évaluations et messages de vos patients apparaîtront ici."
      />
      <AlertsSection />
    </div>
  );
}

function AlertsSection() {
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
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="mt-6 bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-lg font-bold text-slate-900 mb-3">
        Alertes stock &amp; péremption
      </h3>
      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading ? (
        <SkeletonLines lines={3} />
      ) : alerts.length === 0 ? (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Aucune alerte. Vos stocks et péremptions sont sous contrôle.
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                alert.severity === "critical"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
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
