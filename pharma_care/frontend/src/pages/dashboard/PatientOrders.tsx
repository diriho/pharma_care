import { useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, ShoppingBag } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonLines } from "../../components/ui/Skeleton";
import OrderStatusBadge, {
  ORDER_STATUS_LABELS,
} from "../../components/ui/OrderStatusBadge";
import {
  getOrderPrescriptionUrl,
  getPatientOrders,
  updateOrderStatus,
  type PharmacyOrder,
} from "../../services/pharmacyAdmin";
import type { OrderStatus } from "../../types/patient";
import { formatCurrency, formatDate } from "../../lib/format";
import { useAuth } from "../../contexts/AuthContext";

const FILTERS: ("all" | OrderStatus)[] = [
  "all",
  "pending",
  "approved",
  "preparing",
  "ready_for_pickup",
  "completed",
  "cancelled",
];

// Next actions available from each status
const TRANSITIONS: Record<OrderStatus, { label: string; to: OrderStatus; tone: "primary" | "danger" }[]> = {
  pending: [
    { label: "Approuver", to: "approved", tone: "primary" },
    { label: "Refuser", to: "cancelled", tone: "danger" },
  ],
  approved: [
    { label: "Mettre en préparation", to: "preparing", tone: "primary" },
    { label: "Annuler", to: "cancelled", tone: "danger" },
  ],
  preparing: [
    { label: "Prête pour retrait", to: "ready_for_pickup", tone: "primary" },
    { label: "Annuler", to: "cancelled", tone: "danger" },
  ],
  ready_for_pickup: [
    { label: "Marquer terminée", to: "completed", tone: "primary" },
    { label: "Annuler", to: "cancelled", tone: "danger" },
  ],
  completed: [],
  cancelled: [],
};

export default function PatientOrders() {
  const { pharmacy } = useAuth();
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
      setError((err as Error).message);
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
    if (to === "cancelled" && !confirm("Annuler / refuser cette commande ?")) return;
    setUpdating(order.id);
    try {
      const updated = await updateOrderStatus(order.id, to);
      setOrders((list) =>
        list.map((o) => (o.id === order.id ? { ...o, ...updated } : o))
      );
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdating(null);
    }
  }

  async function openPrescription(order: PharmacyOrder) {
    try {
      const { url } = await getOrderPrescriptionUrl(order.id);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      alert((err as Error).message);
    }
  }

  const currency = pharmacy?.currency || "FBU";

  return (
    <div>
      <PageHeader
        title="Commandes Patients"
        subtitle="Commandes reçues via le portail patient : validation, préparation et retrait."
        action={
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Actualiser
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
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "Toutes" : ORDER_STATUS_LABELS[f]} ({count})
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <SkeletonLines lines={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title={
              filter === "all"
                ? "Aucune commande reçue"
                : `Aucune commande « ${ORDER_STATUS_LABELS[filter as OrderStatus]} »`
            }
            hint="Les commandes passées par les patients apparaîtront ici."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((o) => (
              <li key={o.id} className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <p className="text-sm font-bold text-slate-900">{o.patient_name}</p>
                      <OrderStatusBadge status={o.status} />
                      {o.prescription_path && (
                        <button
                          onClick={() => openPrescription(o)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" /> Voir l'ordonnance
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Reçue le {formatDate(o.created_at)} — mise à jour le{" "}
                      {formatDate(o.updated_at)}
                    </p>
                    {o.items.length > 0 ? (
                      <ul className="mt-2 text-sm text-slate-700 space-y-0.5">
                        {o.items.map((it, i) => (
                          <li key={i} className="flex justify-between gap-3 max-w-md">
                            <span>
                              {it.name || "Article"} ×{it.quantity}
                            </span>
                            <span className="text-slate-500">
                              {formatCurrency((it.unit_price || 0) * it.quantity, currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500 italic">
                        Commande sur ordonnance uniquement
                      </p>
                    )}
                    {o.notes && (
                      <p className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 max-w-md">
                        Note du patient : {o.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                    <p className="text-base font-bold text-slate-900">
                      {formatCurrency(o.total, currency)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TRANSITIONS[o.status].map((t) => (
                        <button
                          key={t.to + t.label}
                          disabled={updating === o.id}
                          onClick={() => transition(o, t.to)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                            t.tone === "primary"
                              ? "bg-[#063b1e] text-[#6eff8a] hover:bg-black"
                              : "border border-red-200 text-red-700 hover:bg-red-50"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
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
