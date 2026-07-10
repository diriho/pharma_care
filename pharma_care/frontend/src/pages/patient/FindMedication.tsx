import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, MapPin, Search, XCircle } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonLines } from "../../components/ui/Skeleton";
import { searchMedicines } from "../../services/patientPortal";
import type { MedicineSearchResult } from "../../types/patient";
import { formatCurrency } from "../../lib/format";

export default function FindMedication() {
  const navigate = useNavigate();
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
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div>
      <PageHeader
        title="Trouver un Médicament"
        subtitle="Recherchez un médicament et voyez sa disponibilité dans les pharmacies proches."
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 focus-within:ring-2 focus-within:ring-[#063b1e] focus-within:border-transparent">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex. : Paracétamol, Amoxicilline…"
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            aria-label="Rechercher un médicament"
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          La recherche accepte les correspondances partielles (nom ou molécule).
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <SkeletonLines lines={5} />
        </div>
      ) : !searched ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="Recherchez un médicament"
            hint="Saisissez au moins 2 caractères pour lancer la recherche."
          />
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={<XCircle className="h-6 w-6" />}
            title={`Aucun résultat pour « ${query.trim()} »`}
            hint="Vérifiez l'orthographe ou essayez le nom de la molécule."
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {results.map((r) => (
            <div
              key={r.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {r.medicine} {r.dosage ? `· ${r.dosage}` : ""}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {r.pharmacy
                    ? `${r.pharmacy.name} — ${r.pharmacy.commune}, ${r.pharmacy.province}`
                    : "Pharmacie inconnue"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-slate-700">
                  {formatCurrency(r.price)}
                </span>
                {r.quantity > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    <Check className="h-3.5 w-3.5" />
                    {r.quantity} unité{r.quantity > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
                    <XCircle className="h-3.5 w-3.5" />
                    Rupture de stock
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
                    Commander
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
