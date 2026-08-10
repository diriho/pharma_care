import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  FlaskConical,
  MessageSquare,
  Package,
  Star,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../PageHeader";
import ErrorBanner from "../ui/ErrorBanner";
import EmptyState from "../ui/EmptyState";
import ConfirmDialog from "../ui/ConfirmDialog";
import { SkeletonLines } from "../ui/Skeleton";
import { useRealtimeTable } from "../../hooks/useRealtimeTable";
import type { PatientNotification } from "../../types/patient";
import { formatDate } from "../../lib/format";
import { translateApiError } from "../../i18n/apiError";
import type { TFunction } from "i18next";

// Backend adapter so the same center serves the patient portal (/patient/…)
// and the pharmacy dashboard (/data/…).
// remove is optional: the delete affordance only renders when provided.
export type NotificationsAdapter = {
  list: () => Promise<{ items: PatientNotification[]; unread: number }>;
  markRead: (id: string) => Promise<unknown>;
  markAllRead: () => Promise<unknown>;
  remove?: (id: string) => Promise<unknown>;
};

function kindIcon(kind: string) {
  switch (kind) {
    case "order_status":
    case "new_order":
    case "medication_ready":
    case "prescription_approved":
      return <Package className="h-4 w-4" />;
    case "new_message":
      return <MessageSquare className="h-4 w-4" />;
    case "new_rating":
      return <Star className="h-4 w-4" />;
    case "lab_results":
      return <FlaskConical className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

const KNOWN_KINDS = new Set([
  "new_rating",
  "new_order",
  "order_status",
  "new_message",
  "prescription_approved",
  "medication_ready",
  "lab_results",
  "announcement",
]);

// Notification content is minimized by policy (see backend/supabase/services/notifications.ts):
// the stored `message` is a legacy/fallback field, but display always prefers a translated,
// generic template keyed by `kind` so no medication/prescription detail ever renders here —
// full detail only lives behind the authenticated order/prescription screens.
function displayMessage(n: PatientNotification, t: TFunction): string {
  if (KNOWN_KINDS.has(n.kind)) {
    const status = typeof n.meta?.status === "string" ? n.meta.status : undefined;
    return t(`notifications:kinds.${n.kind}`, {
      status: status ? t(`common:orderStatus.${status}`, { defaultValue: status }) : "",
    });
  }
  return n.message;
}

export default function NotificationCenter({
  title,
  adapter,
  emptyHint,
}: {
  title: string;
  adapter: NotificationsAdapter;
  emptyHint: string;
}) {
  const { t } = useTranslation(["notifications", "common"]);
  const [items, setItems] = useState<PatientNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<PatientNotification | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await adapter.list();
      setItems(data.items);
      setUnread(data.unread);
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setLoading(false);
    }
  }, [adapter, t]);

  useEffect(() => {
    load();
  }, [load]);

  // New notifications appear instantly; RLS only delivers this user's rows.
  useRealtimeTable<PatientNotification>({
    table: "notifications",
    events: ["INSERT", "UPDATE"],
    onChange: load,
    onResync: load,
  });

  async function handleRead(n: PatientNotification) {
    if (n.read_at) return;
    try {
      await adapter.markRead(n.id);
      setItems((list) =>
        list.map((it) =>
          it.id === n.id ? { ...it, read_at: new Date().toISOString() } : it
        )
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch (err) {
      alert(translateApiError(err, t));
    }
  }

  async function handleReadAll() {
    try {
      await adapter.markAllRead();
      setItems((list) =>
        list.map((it) => ({ ...it, read_at: it.read_at || new Date().toISOString() }))
      );
      setUnread(0);
    } catch (err) {
      alert(translateApiError(err, t));
    }
  }

  async function handleDelete(n: PatientNotification) {
    if (!adapter.remove) return;
    setDeleting(true);
    try {
      await adapter.remove(n.id);
      setItems((list) => list.filter((it) => it.id !== n.id));
      if (!n.read_at) setUnread((u) => Math.max(0, u - 1));
      setConfirmTarget(null);
    } catch (err) {
      setConfirmTarget(null);
      alert(translateApiError(err, t));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={unread > 0 ? t("notifications:unreadCount", { count: unread }) : t("notifications:upToDate")}
        action={
          unread > 0 ? (
            <button
              onClick={handleReadAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <CheckCheck className="h-4 w-4" /> {t("notifications:markAllRead")}
            </button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <SkeletonLines lines={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title={t("notifications:empty")}
            hint={emptyHint}
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {items.map((n) => (
              <li
                key={n.id}
                className={`group flex items-start gap-1 pr-3 transition-colors ${
                  n.read_at ? "bg-white dark:bg-slate-800" : "bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30"
                }`}
              >
                <button
                  onClick={() => handleRead(n)}
                  className="flex-1 min-w-0 text-left px-4 sm:px-5 py-4 flex items-start gap-3"
                >
                  <span
                    className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      n.read_at
                        ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                        : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {kindIcon(n.kind)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        n.read_at ? "text-slate-600 dark:text-slate-400" : "font-semibold text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {displayMessage(n, t)}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {formatDate(n.created_at)}
                    </p>
                  </div>
                  {!n.read_at && (
                    <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
                {adapter.remove && (
                  <button
                    onClick={() => setConfirmTarget(n)}
                    className="mt-4 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0"
                    aria-label={t("notifications:delete.aria")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={t("notifications:delete.title")}
        message={t("notifications:delete.message")}
        busy={deleting}
        onConfirm={() => confirmTarget && handleDelete(confirmTarget)}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
