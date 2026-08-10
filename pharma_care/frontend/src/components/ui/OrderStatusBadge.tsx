import { useTranslation } from "react-i18next";
import type { OrderStatus } from "../../types/patient";

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  approved: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  preparing: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  ready_for_pickup: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  completed: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  cancelled: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation("common");
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
        STATUS_STYLES[status] || STATUS_STYLES.pending
      }`}
    >
      {t(`orderStatus.${status}`, { defaultValue: status })}
    </span>
  );
}
