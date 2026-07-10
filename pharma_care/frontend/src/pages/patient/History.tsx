import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pill } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonLines } from "../../components/ui/Skeleton";
import { getMedications } from "../../services/patientPortal";
import type { PatientMedication } from "../../types/patient";
import { formatDate } from "../../lib/format";

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<PatientMedication["status"], string> = {
  active: "En cours",
  completed: "Terminé",
  stopped: "Arrêté",
};

const STATUS_STYLES: Record<PatientMedication["status"], string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
  stopped: "bg-red-50 text-red-700 border-red-200",
};

export default function History() {
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
      setError((err as Error).message);
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
        title="Historique Médical"
        subtitle="Vos traitements passés et en cours, prescrits par vos médecins."
      />

      {error && <ErrorBanner message={error} onRetry={() => load()} />}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <SkeletonLines lines={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Pill className="h-6 w-6" />}
            title="Aucun traitement enregistré"
            hint="Votre historique de médication apparaîtra ici."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Médicament</th>
                  <th className="text-left px-4 py-3">Posologie</th>
                  <th className="text-left px-4 py-3">Médecin prescripteur</th>
                  <th className="text-left px-4 py-3">Début</th>
                  <th className="text-left px-4 py-3">Fin</th>
                  <th className="text-right px-4 py-3">Renouvellements</th>
                  <th className="text-left px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {m.medication_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.dosage || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{m.physician || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(m.start_date)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(m.end_date)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{m.refills}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold ${STATUS_STYLES[m.status]}`}
                      >
                        {STATUS_LABELS[m.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Page {page} sur {pageCount} — {total} traitement{total > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Précédent
              </button>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= pageCount}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Suivant <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
