import { useEffect, useState } from "react";
import { Pill, Users, Truck, Receipt, AlertTriangle, CalendarClock } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../lib/format";
import PageHeader from "../../components/PageHeader";

type Analytics = {
  counts: { medicines: number; patients: number; suppliers: number; sales: number };
  inventoryValue: number;
  retailValue: number;
  totalRevenue: number;
};

type Alerts = { alerts: { severity: string; message: string; type: string }[] };

export default function Overview() {
  const { pharmacy } = useAuth();
  const [a, setA] = useState<Analytics | null>(null);
  const [n, setN] = useState<Alerts["alerts"]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [analytics, notif] = await Promise.all([
          api<Analytics>("/data/analytics"),
          api<Alerts>("/data/notifications"),
        ]);
        setA(analytics);
        setN(notif.alerts);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currency = pharmacy?.currency || "FBU";

  return (
    <div>
      <PageHeader
        title={`Bienvenue, ${pharmacy?.name || "Pharmacie"}`}
        subtitle="Vue d'ensemble en temps réel de votre officine."
      />

      {loading ? (
        <p className="text-slate-500">Chargement…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Médicaments en catalogue"
              value={a?.counts.medicines ?? 0}
              icon={<Pill className="h-5 w-5" />}
            />
            <StatCard
              label="Patients & Clients"
              value={a?.counts.patients ?? 0}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              label="Fournisseurs"
              value={a?.counts.suppliers ?? 0}
              icon={<Truck className="h-5 w-5" />}
            />
            <StatCard
              label="Ventes enregistrées"
              value={a?.counts.sales ?? 0}
              icon={<Receipt className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <ValueCard
              label="Chiffre d'affaires"
              value={formatCurrency(a?.totalRevenue ?? 0, currency)}
              tone="emerald"
            />
            <ValueCard
              label="Valeur du stock (achat)"
              value={formatCurrency(a?.inventoryValue ?? 0, currency)}
            />
            <ValueCard
              label="Valeur du stock (vente)"
              value={formatCurrency(a?.retailValue ?? 0, currency)}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-3">
              Alertes récentes
            </h3>
            {n.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aucune alerte. Vos stocks et péremptions sont sous contrôle.
              </p>
            ) : (
              <ul className="space-y-2">
                {n.slice(0, 8).map((alert, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      alert.severity === "critical"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}
                  >
                    {alert.type === "low_stock" ? (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    ) : (
                      <CalendarClock className="h-4 w-4 shrink-0" />
                    )}
                    <span className="text-sm">{alert.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div className="text-emerald-600">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ValueCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald";
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${
        tone === "emerald"
          ? "bg-[#063b1e] text-[#6eff8a]"
          : "bg-white border border-slate-200 text-slate-900"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          tone === "emerald" ? "text-[#6eff8a]/80" : "text-slate-500"
        } mb-2`}
      >
        {label}
      </p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
