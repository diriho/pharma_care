import { useEffect, useState } from "react";
import { api } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../lib/format";

type Analytics = {
  counts: { medicines: number; patients: number; suppliers: number; sales: number };
  inventoryValue: number;
  retailValue: number;
  totalRevenue: number;
  salesByDay: Record<string, number>;
  topMedicines: Record<string, number>;
};

type Medicine = { id: string; name: string };

export default function Analytics() {
  const { pharmacy } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a, m] = await Promise.all([
        api<Analytics>("/data/analytics"),
        api<Medicine[]>("/data/medicines"),
      ]);
      setData(a);
      setMeds(m);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-slate-500">Chargement…</p>;
  if (error || !data) {
    return (
      <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-3">
        <span>Erreur de chargement des analyses : {error || "données indisponibles"}</span>
        <button onClick={load} className="ml-auto underline font-semibold">
          Réessayer
        </button>
      </div>
    );
  }

  const currency = pharmacy?.currency || "FBU";
  const days = Object.entries(data.salesByDay).sort((a, b) =>
    a[0] < b[0] ? -1 : 1
  );
  const maxDay = Math.max(1, ...days.map(([, v]) => v));
  const topEntries = Object.entries(data.topMedicines)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxTop = Math.max(1, ...topEntries.map(([, v]) => v));

  // print out the analytics data for debugging purposes
  console.log("Analytics data:", data);
  console.log("Medicines data:", meds);
  console.log(currency, days, topEntries);
  console.log(topEntries);
  console.log(maxDay, maxTop);


  return (
    <div>
      <PageHeader
        title="Analyses & Rapports"
        subtitle="Indicateurs clés et tendances commerciales de votre pharmacie."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label="CA total" value={formatCurrency(data.totalRevenue, currency)} />
        <KPI label="Valeur stock (achat)" value={formatCurrency(data.inventoryValue, currency)} />
        <KPI label="Valeur stock (vente)" value={formatCurrency(data.retailValue, currency)} />
        <KPI label="Ventes totales" value={String(data.counts.sales)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-3">Ventes par jour</h3>
          {days.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune vente enregistrée.</p>
          ) : (
            <ul className="space-y-2">
              {days.map(([day, value]) => (
                <li key={day} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-600">{day}</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(value, currency)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-emerald-500 rounded-full"
                      style={{ width: `${(value / maxDay) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-3">Médicaments les plus vendus</h3>
          {topEntries.length === 0 ? (
            <p className="text-sm text-slate-500">Pas encore de données.</p>
          ) : (
            <ul className="space-y-2">
              {topEntries.map(([id, qty]) => {
                const med = meds.find((m) => m.id === id);
                return (
                  <li key={id} className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-600">{med?.name || id}</span>
                      <span className="font-semibold text-slate-900">{qty}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-[#063b1e] rounded-full"
                        style={{ width: `${(qty / maxTop) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
