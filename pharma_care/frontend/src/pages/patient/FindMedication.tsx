import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, MapPin, Search, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonLines } from "../../components/ui/Skeleton";
import { searchMedicines } from "../../services/patientPortal";
import type { MedicineSearchResult } from "../../types/patient";
import { formatCurrency } from "../../lib/format";
import { translateApiError } from "../../i18n/apiError";

export default function FindMedication() {
  const navigate = useNavigate();
  const { t } = useTranslation(["patient", "common"]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedicineSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced live search (partial matches handled server-side via ilike)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        setResults(await searchMedicines(q));
        setSearched(true);
      } catch (err) {
        setError(translateApiError(err, t));
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div>
      <PageHeader
        title={t("patient:findMedication.title")}
        subtitle={t("patient:findMedication.subtitle")}
      />

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-3 focus-within:ring-2 focus-within:ring-[#063b1e] dark:focus-within:ring-[#6eff8a] focus-within:border-transparent">
          <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("patient:findMedication.searchPlaceholder")}
            className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            aria-label={t("patient:findMedication.searchAriaLabel")}
          />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          {t("patient:findMedication.searchHint")}
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <SkeletonLines lines={5} />
        </div>
      ) : !searched ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title={t("patient:findMedication.promptTitle")}
            hint={t("patient:findMedication.promptHint")}
          />
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <EmptyState
            icon={<XCircle className="h-6 w-6" />}
            title={t("patient:findMedication.noResultsTitle", { query: query.trim() })}
            hint={t("patient:findMedication.noResultsHint")}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {results.map((r) => (
            <div
              key={r.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {r.medicine} {r.dosage ? `· ${r.dosage}` : ""}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {r.pharmacy
                    ? `${r.pharmacy.name} — ${r.pharmacy.commune}, ${r.pharmacy.province}`
                    : t("patient:findMedication.unknownPharmacy")}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {formatCurrency(r.price)}
                </span>
                {r.quantity > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <Check className="h-3.5 w-3.5" />
                    {t("patient:findMedication.unitsAvailable", { count: r.quantity })}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold">
                    <XCircle className="h-3.5 w-3.5" />
                    {t("patient:findMedication.outOfStock")}
                  </span>
                )}
                {r.quantity > 0 && r.pharmacy && (
                  <button
                    onClick={() =>
                      navigate("/patient/orders", {
                        state: {
                          pharmacyUserId: r.pharmacy!.user_id,
                          medicineId: r.id,
                          openForm: true,
                        },
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#063b1e] text-[#6eff8a] text-xs font-semibold hover:bg-black"
                  >
                    {t("patient:findMedication.orderButton")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
