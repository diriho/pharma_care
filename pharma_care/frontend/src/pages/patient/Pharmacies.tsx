import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, Phone, Pill, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonCards } from "../../components/ui/Skeleton";
import StarRating from "../../components/ui/StarRating";
import {
  getPharmacies,
  getPharmacyDetails,
  getPharmacyMedicines,
  ratePharmacy,
} from "../../services/patientPortal";
import type {
  PharmacyDetails,
  PharmacyMedicine,
  PharmacySummary,
} from "../../types/patient";
import { isOpenNow, todayHours, weekSchedule } from "../../lib/hours";
import { formatCurrency, formatDate } from "../../lib/format";
import { translateApiError } from "../../i18n/apiError";

type ModalState =
  | { kind: "medicines"; pharmacy: PharmacySummary }
  | { kind: "rate"; pharmacy: PharmacySummary }
  | { kind: "details"; pharmacy: PharmacySummary }
  | null;

export default function Pharmacies() {
  const { t } = useTranslation(["patient", "common"]);
  const [list, setList] = useState<PharmacySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setList(await getPharmacies());
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader
        title={t("patient:pharmacies.title")}
        subtitle={t("patient:pharmacies.subtitle")}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <SkeletonCards count={6} />
      ) : list.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <EmptyState
            icon={<MapPin className="h-6 w-6" />}
            title={t("patient:pharmacies.emptyTitle")}
            hint={t("patient:pharmacies.emptyHint")}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((p) => (
            <PharmacyCard key={p.user_id} pharmacy={p} onOpen={setModal} />
          ))}
        </div>
      )}

      {modal?.kind === "medicines" && (
        <MedicinesModal pharmacy={modal.pharmacy} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "rate" && (
        <RateModal
          pharmacy={modal.pharmacy}
          onClose={() => setModal(null)}
          onRated={load}
        />
      )}
      {modal?.kind === "details" && (
        <DetailsModal pharmacy={modal.pharmacy} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function PharmacyCard({
  pharmacy,
  onOpen,
}: {
  pharmacy: PharmacySummary;
  onOpen: (m: ModalState) => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation(["patient", "common"]);
  const open = isOpenNow(pharmacy.operating_hours);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{pharmacy.name}</h3>
        {open !== null && (
          <span
            className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              open
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
            }`}
          >
            {open ? t("patient:hours.open") : t("patient:hours.closed")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <StarRating value={pharmacy.rating_avg} />
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {pharmacy.rating_avg > 0 ? pharmacy.rating_avg.toFixed(1) : "—"} (
          {t("patient:pharmacies.reviewsCount", { count: pharmacy.rating_count })})
        </span>
      </div>

      <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300 mb-4">
        <li className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="truncate">
            {t("patient:pharmacies.addressLine", {
              address: pharmacy.address,
              commune: pharmacy.commune,
            })}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          {pharmacy.phone}
        </li>
        <li className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          {t("patient:pharmacies.todayLabel", { hours: todayHours(pharmacy.operating_hours, t) })}
        </li>
        <li className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          {t("patient:pharmacies.medicinesAvailable", { count: pharmacy.medicines_available })}
        </li>
      </ul>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <button
          onClick={() => onOpen({ kind: "medicines", pharmacy })}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          {t("patient:pharmacies.viewMedicines")}
        </button>
        <button
          onClick={() => onOpen({ kind: "rate", pharmacy })}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          {t("patient:pharmacies.rate")}
        </button>
        <button
          onClick={() =>
            navigate("/patient/orders", {
              state: { pharmacyUserId: pharmacy.user_id, openForm: true },
            })
          }
          className="px-3 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] text-sm font-semibold hover:bg-black"
        >
          {t("patient:pharmacies.order")}
        </button>
        <button
          onClick={() => onOpen({ kind: "details", pharmacy })}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          {t("patient:pharmacies.details")}
        </button>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label={t("buttons.close")}
          >
            <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function MedicinesModal({
  pharmacy,
  onClose,
}: {
  pharmacy: PharmacySummary;
  onClose: () => void;
}) {
  const { t } = useTranslation(["patient", "common"]);
  const [meds, setMeds] = useState<PharmacyMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPharmacyMedicines(pharmacy.user_id)
      .then(setMeds)
      .catch((err) => setError(translateApiError(err, t)))
      .finally(() => setLoading(false));
  }, [pharmacy.user_id, t]);

  return (
    <Modal title={t("patient:pharmacies.medicinesModalTitle", { name: pharmacy.name })} onClose={onClose}>
      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-4">{t("common:common.loading")}</p>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : meds.length === 0 ? (
        <EmptyState title={t("patient:pharmacies.emptyCatalog")} />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {meds.map((m) => (
            <li key={m.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {m.name} {m.dosage ? `· ${m.dosage}` : ""}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {m.category || m.molecule || "—"} — {formatCurrency(m.selling_price)}
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  m.stock > 0
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                    : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                }`}
              >
                {m.stock > 0 ? t("patient:pharmacies.inStock", { count: m.stock }) : t("patient:pharmacies.outOfStock")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function RateModal({
  pharmacy,
  onClose,
  onRated,
}: {
  pharmacy: PharmacySummary;
  onClose: () => void;
  onRated: () => void;
}) {
  const { t } = useTranslation(["patient", "common"]);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError(t("patient:pharmacies.ratingRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await ratePharmacy(pharmacy.user_id, rating, review);
      onRated();
      onClose();
    } catch (err) {
      setError(translateApiError(err, t));
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t("patient:pharmacies.rateModalTitle", { name: pharmacy.name })} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {t("patient:pharmacies.yourRating")}
          </label>
          <StarRating value={rating} onChange={setRating} size="lg" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t("patient:pharmacies.yourReview")} ({t("common:common.optional")})
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#063b1e] dark:focus:ring-[#6eff8a] text-sm"
            placeholder={t("patient:pharmacies.reviewPlaceholder")}
          />
        </div>
        {error && (
          <p className="px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black disabled:opacity-60 transition-colors"
        >
          {submitting ? t("patient:pharmacies.submitting") : t("patient:pharmacies.submitRating")}
        </button>
      </form>
    </Modal>
  );
}

function DetailsModal({
  pharmacy,
  onClose,
}: {
  pharmacy: PharmacySummary;
  onClose: () => void;
}) {
  const { t } = useTranslation(["patient", "common"]);
  const [details, setDetails] = useState<PharmacyDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPharmacyDetails(pharmacy.user_id)
      .then(setDetails)
      .catch((err) => setError(translateApiError(err, t)));
  }, [pharmacy.user_id, t]);

  return (
    <Modal title={pharmacy.name} onClose={onClose}>
      {error ? (
        <ErrorBanner message={error} />
      ) : !details ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-4">{t("common:common.loading")}</p>
      ) : (
        <div className="space-y-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              {t("patient:pharmacies.contactInfo")}
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {details.address}, {details.commune}, {details.province}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{details.phone}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              {t("patient:pharmacies.openingHours")}
            </h4>
            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
              {weekSchedule(details.operating_hours, t).map(([day, hours]) => (
                <li key={day} className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{day}</span>
                  <span>{hours}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              {t("patient:pharmacies.recentReviews")}
            </h4>
            {details.recent_ratings.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("patient:pharmacies.noReviewsYet")}</p>
            ) : (
              <ul className="space-y-3">
                {details.recent_ratings.map((r) => (
                  <li key={r.id} className="border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {r.patient_name}
                      </span>
                      <StarRating value={r.rating} />
                    </div>
                    {r.review && <p className="text-sm text-slate-600 dark:text-slate-300">{r.review}</p>}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatDate(r.updated_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
