import { useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, ShoppingBag, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonLines } from "../../components/ui/Skeleton";
import OrderStatusBadge from "../../components/ui/OrderStatusBadge";
import {
  deletePatientOrder,
  getOrderPrescriptionUrl,
  getPatientOrders,
  updateOrderStatus,
  type PharmacyOrder,
} from "../../services/pharmacyAdmin";
import type { OrderStatus } from "../../types/patient";
import { formatCurrency, formatDate } from "../../lib/format";
import { useAuth } from "../../contexts/AuthContext";
import { translateApiError } from "../../i18n/apiError";

const FILTERS: ("all" | OrderStatus)[] = [
  "all",
  "pending",
  "approved",
  "preparing",
  "ready_for_pickup",
  "completed",
  "cancelled",
];

// Next actions available from each status (i18n key + target status + tone)
const TRANSITIONS: Record<OrderStatus, { labelKey: string; to: OrderStatus; tone: "primary" | "danger" }[]> = {
  pending: [
    { labelKey: "orders.transitions.approve", to: "approved", tone: "primary" },
    { labelKey: "orders.transitions.reject", to: "cancelled", tone: "danger" },
  ],
  approved: [
    { labelKey: "orders.transitions.startPreparing", to: "preparing", tone: "primary" },
    { labelKey: "orders.transitions.cancel", to: "cancelled", tone: "danger" },
  ],
  preparing: [
    { labelKey: "orders.transitions.readyForPickup", to: "ready_for_pickup", tone: "primary" },
    { labelKey: "orders.transitions.cancel", to: "cancelled", tone: "danger" },
  ],
  ready_for_pickup: [
    { labelKey: "orders.transitions.markCompleted", to: "completed", tone: "primary" },
    { labelKey: "orders.transitions.cancel", to: "cancelled", tone: "danger" },
  ],
  completed: [],
  cancelled: [],
};

export default function PatientOrders() {
  const { pharmacy } = useAuth();
  const { t } = useTranslation(["dashboard", "common"]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setOrders(await getPatientOrders());
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  const countByStatus = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of orders) counts.set(o.status, (counts.get(o.status) || 0) + 1);
    return counts;
  }, [orders]);

  async function transition(order: PharmacyOrder, to: OrderStatus) {
    if (to === "cancelled" && !confirm(t("dashboard:orders.confirmCancel"))) return;
    setUpdating(order.id);
    try {
      const updated = await updateOrderStatus(order.id, to);
      setOrders((list) =>
        list.map((o) => (o.id === order.id ? { ...o, ...updated } : o))
      );
    } catch (err) {
      alert(translateApiError(err, t));
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(order: PharmacyOrder) {
    setUpdating(order.id);
    try {
      await deletePatientOrder(order.id);
      setOrders((list) => list.filter((o) => o.id !== order.id));
    } catch (err) {
      alert(translateApiError(err, t));
    } finally {
      setUpdating(null);
    }
  }

  async function openPrescription(order: PharmacyOrder) {
    try {
      const { url } = await getOrderPrescriptionUrl(order.id);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      alert(translateApiError(err, t));
    }
  }

  const currency = pharmacy?.currency || "FBU";

  return (
    <div>
      <PageHeader
        title={t("dashboard:orders.title")}
        subtitle={t("dashboard:orders.subtitle")}
        action={
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" /> {t("dashboard:orders.refresh")}
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const count = f === "all" ? orders.length : countByStatus.get(f) || 0;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                filter === f
                  ? "bg-[#063b1e] text-[#6eff8a] border-[#063b1e]"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {f === "all" ? t("dashboard:orders.filterAll") : t(`common:orderStatus.${f}`)} ({count})
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <SkeletonLines lines={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title={
              filter === "all"
                ? t("dashboard:orders.empty")
                : t("dashboard:orders.emptyFiltered", { status: t(`common:orderStatus.${filter}`) })
            }
            hint={t("dashboard:orders.emptyHint")}
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((o) => (
              <li key={o.id} className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{o.patient_name}</p>
                      <OrderStatusBadge status={o.status} />
                      {o.prescription_path && (
                        <button
                          onClick={() => openPrescription(o)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" /> {t("dashboard:orders.viewPrescription")}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("dashboard:orders.received", {
                        date: formatDate(o.created_at),
                        updated: formatDate(o.updated_at),
                      })}
                    </p>
                    {o.items.length > 0 ? (
                      <ul className="mt-2 text-sm text-slate-700 dark:text-slate-300 space-y-0.5">
                        {o.items.map((it, i) => (
                          <li key={i} className="flex justify-between gap-3 max-w-md">
                            <span>
                              {it.name || t("dashboard:orders.item")} ×{it.quantity}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {formatCurrency((it.unit_price || 0) * it.quantity, currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">
                        {t("dashboard:orders.prescriptionOnly")}
                      </p>
                    )}
                    {o.notes && (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 max-w-md">
                        {t("dashboard:orders.patientNote", { note: o.notes })}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(o.total, currency)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TRANSITIONS[o.status].map((tr) => (
                        <button
                          key={tr.to + tr.labelKey}
                          disabled={updating === o.id}
                          onClick={() => transition(o, tr.to)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                            tr.tone === "primary"
                              ? "bg-[#063b1e] text-[#6eff8a] hover:bg-black"
                              : "border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                          }`}
                        >
                          {t(`dashboard:${tr.labelKey}`)}
                        </button>
                      ))}
                      {["completed", "cancelled"].includes(o.status) && (
                        <button
                          disabled={updating === o.id}
                          onClick={() => handleDelete(o)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t("common:buttons.delete")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
