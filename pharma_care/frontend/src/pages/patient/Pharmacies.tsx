import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, Phone, Pill, X } from "lucide-react";
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

type ModalState =
  | { kind: "medicines"; pharmacy: PharmacySummary }
  | { kind: "rate"; pharmacy: PharmacySummary }
  | { kind: "details"; pharmacy: PharmacySummary }
  | null;

export default function Pharmacies() {
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
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Pharmacies à Proximité"
        subtitle="Trouvez une officine, consultez ses médicaments et évaluez son service."
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <SkeletonCards count={6} />
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={<MapPin className="h-6 w-6" />}
            title="Aucune pharmacie enregistrée"
            hint="Les pharmacies partenaires apparaîtront ici dès leur inscription."
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
  const open = isOpenNow(pharmacy.operating_hours);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-slate-900 leading-tight">{pharmacy.name}</h3>
        {open !== null && (
          <span
            className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              open
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {open ? "Ouvert" : "Fermé"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <StarRating value={pharmacy.rating_avg} />
        <span className="text-xs text-slate-500">
          {pharmacy.rating_avg > 0 ? pharmacy.rating_avg.toFixed(1) : "—"} (
          {pharmacy.rating_count} avis)
        </span>
      </div>

      <ul className="space-y-1.5 text-sm text-slate-600 mb-4">
        <li className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="truncate">
            {pharmacy.address}, {pharmacy.commune} — à proximité
          </span>
        </li>
        <li className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-slate-400 shrink-0" />
          {pharmacy.phone}
        </li>
        <li className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400 shrink-0" />
          Aujourd'hui : {todayHours(pharmacy.operating_hours)}
        </li>
        <li className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-slate-400 shrink-0" />
          {pharmacy.medicines_available} médicament
          {pharmacy.medicines_available > 1 ? "s" : ""} disponible
          {pharmacy.medicines_available > 1 ? "s" : ""}
        </li>
      </ul>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <button
          onClick={() => onOpen({ kind: "medicines", pharmacy })}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voir médicaments
        </button>
        <button
          onClick={() => onOpen({ kind: "rate", pharmacy })}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Évaluer
        </button>
        <button
          onClick={() =>
            navigate("/patient/orders", {
              state: { pharmacyUserId: pharmacy.user_id, openForm: true },
            })
          }
          className="px-3 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] text-sm font-semibold hover:bg-black"
        >
          Commander
        </button>
        <button
          onClick={() => onOpen({ kind: "details", pharmacy })}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Détails
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
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Fermer"
          >
            <X className="h-5 w-5 text-slate-500" />
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
  const [meds, setMeds] = useState<PharmacyMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPharmacyMedicines(pharmacy.user_id)
      .then(setMeds)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [pharmacy.user_id]);

  return (
    <Modal title={`Médicaments — ${pharmacy.name}`} onClose={onClose}>
      {loading ? (
        <p className="text-sm text-slate-500 py-4">Chargement…</p>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : meds.length === 0 ? (
        <EmptyState title="Catalogue vide" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {meds.map((m) => (
            <li key={m.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {m.name} {m.dosage ? `· ${m.dosage}` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  {m.category || m.molecule || "—"} — {formatCurrency(m.selling_price)}
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  m.stock > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {m.stock > 0 ? `${m.stock} en stock` : "Rupture"}
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
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("Choisissez une note de 1 à 5 étoiles");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await ratePharmacy(pharmacy.user_id, rating, review);
      onRated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Évaluer ${pharmacy.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Votre note
          </label>
          <StarRating value={rating} onChange={setRating} size="lg" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Votre avis (optionnel)
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#063b1e] text-sm"
            placeholder="Service, disponibilité, accueil…"
          />
        </div>
        {error && (
          <p className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black disabled:opacity-60 transition-colors"
        >
          {submitting ? "Envoi…" : "Publier mon évaluation"}
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
  const [details, setDetails] = useState<PharmacyDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPharmacyDetails(pharmacy.user_id)
      .then(setDetails)
      .catch((err) => setError((err as Error).message));
  }, [pharmacy.user_id]);

  return (
    <Modal title={pharmacy.name} onClose={onClose}>
      {error ? (
        <ErrorBanner message={error} />
      ) : !details ? (
        <p className="text-sm text-slate-500 py-4">Chargement…</p>
      ) : (
        <div className="space-y-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Coordonnées
            </h4>
            <p className="text-sm text-slate-700">
              {details.address}, {details.commune}, {details.province}
            </p>
            <p className="text-sm text-slate-700">{details.phone}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Horaires d'ouverture
            </h4>
            <ul className="text-sm text-slate-700 space-y-1">
              {weekSchedule(details.operating_hours).map(([day, hours]) => (
                <li key={day} className="flex justify-between">
                  <span className="text-slate-500">{day}</span>
                  <span>{hours}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Avis récents
            </h4>
            {details.recent_ratings.length === 0 ? (
              <p className="text-sm text-slate-500">Pas encore d'avis.</p>
            ) : (
              <ul className="space-y-3">
                {details.recent_ratings.map((r) => (
                  <li key={r.id} className="border border-slate-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-900">
                        {r.patient_name}
                      </span>
                      <StarRating value={r.rating} />
                    </div>
                    {r.review && <p className="text-sm text-slate-600">{r.review}</p>}
                    <p className="text-xs text-slate-400 mt-1">{formatDate(r.updated_at)}</p>
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
