import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  FlaskConical,
  MessageSquare,
  Package,
  Star,
} from "lucide-react";
import PageHeader from "../PageHeader";
import ErrorBanner from "../ui/ErrorBanner";
import EmptyState from "../ui/EmptyState";
import { SkeletonLines } from "../ui/Skeleton";
import { useRealtimeTable } from "../../hooks/useRealtimeTable";
import type { PatientNotification } from "../../types/patient";
import { formatDate } from "../../lib/format";

// Backend adapter so the same center serves the patient portal (/patient/…)
// and the pharmacy dashboard (/data/…).
export type NotificationsAdapter = {
  list: () => Promise<{ items: PatientNotification[]; unread: number }>;
  markRead: (id: string) => Promise<unknown>;
  markAllRead: () => Promise<unknown>;
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

export default function NotificationCenter({
  title,
  adapter,
  emptyHint,
}: {
  title: string;
  adapter: NotificationsAdapter;
  emptyHint: string;
}) {
  const [items, setItems] = useState<PatientNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await adapter.list();
      setItems(data.items);
      setUnread(data.unread);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [adapter]);

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
      alert((err as Error).message);
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
      alert((err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={
          unread > 0
            ? `${unread} notification${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}.`
            : "Vous êtes à jour."
        }
        action={
          unread > 0 ? (
            <button
              onClick={handleReadAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
            </button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <SkeletonLines lines={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="Aucune notification"
            hint={emptyHint}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => handleRead(n)}
                  className={`w-full text-left px-4 sm:px-5 py-4 flex items-start gap-3 transition-colors ${
                    n.read_at ? "bg-white" : "bg-emerald-50/40 hover:bg-emerald-50/70"
                  }`}
                >
                  <span
                    className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      n.read_at
                        ? "bg-slate-100 text-slate-400"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {kindIcon(n.kind)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        n.read_at ? "text-slate-600" : "font-semibold text-slate-900"
                      }`}
                    >
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(n.created_at)}
                    </p>
                  </div>
                  {!n.read_at && (
                    <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
