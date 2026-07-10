import type { OrderStatus } from "../../types/patient";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  approved: "Approuvée",
  preparing: "En préparation",
  ready_for_pickup: "Prête pour retrait",
  completed: "Terminée",
  cancelled: "Annulée",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-sky-50 text-sky-700 border-sky-200",
  preparing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  ready_for_pickup: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
        STATUS_STYLES[status] || STATUS_STYLES.pending
      }`}
    >
      {ORDER_STATUS_LABELS[status] || status}
    </span>
  );
}
