import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pill } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonLines } from "../../components/ui/Skeleton";
import { getMedications } from "../../services/patientPortal";
import type { PatientMedication } from "../../types/patient";
import { formatDate } from "../../lib/format";
import { translateApiError } from "../../i18n/apiError";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<PatientMedication["status"], string> = {
  active: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  completed: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  stopped: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
};

export default function History() {
  const { t } = useTranslation(["patient", "common"]);
  const [items, setItems] = useState<PatientMedication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true);
    setError(null);
    try {
      const data = await getMedications(p, PAGE_SIZE);
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title={t("patient:history.title")}
        subtitle={t("patient:history.subtitle")}
      />

      {error && <ErrorBanner message={error} onRetry={() => load()} />}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <SkeletonLines lines={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Pill className="h-6 w-6" />}
            title={t("patient:history.emptyTitle")}
            hint={t("patient:history.emptyHint")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3">{t("patient:history.colMedication")}</th>
                  <th className="text-left px-4 py-3">{t("patient:history.colDosage")}</th>
                  <th className="text-left px-4 py-3">{t("patient:history.colPhysician")}</th>
                  <th className="text-left px-4 py-3">{t("patient:history.colStart")}</th>
                  <th className="text-left px-4 py-3">{t("patient:history.colEnd")}</th>
                  <th className="text-right px-4 py-3">{t("patient:history.colRefills")}</th>
                  <th className="text-left px-4 py-3">{t("common:common.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {m.medication_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{m.dosage || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{m.physician || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(m.start_date)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(m.end_date)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{m.refills}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${STATUS_STYLES[m.status]}`}
                      >
                        {t(`patient:history.status.${m.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("patient:history.pageOf", { page, pageCount })} —{" "}
              {t("patient:history.treatmentsCount", { count: total })}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> {t("patient:history.previous")}
              </button>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= pageCount}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"
              >
                {t("common:buttons.next")} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
