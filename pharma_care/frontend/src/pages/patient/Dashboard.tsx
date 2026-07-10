import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  ClipboardList,
  FlaskConical,
  MapPin,
  MessageSquare,
  Pill,
  Search,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import PageHeader from "../../components/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonCards } from "../../components/ui/Skeleton";
import OrderStatusBadge from "../../components/ui/OrderStatusBadge";
import StarRating from "../../components/ui/StarRating";
import { getPatientDashboard } from "../../services/patientPortal";
import { getHealthRecords, type FhirObservation } from "../../services/fhir";
import type { PatientDashboardData } from "../../types/patient";
import { formatCurrency, formatDate } from "../../lib/format";

const QUICK_ACTIONS = [
  { to: "/patient/find-medication", label: "Trouver un médicament", icon: Search },
  { to: "/patient/pharmacies", label: "Pharmacies à proximité", icon: MapPin },
  { to: "/patient/orders", label: "Commander", icon: ShoppingBag },
  { to: "/patient/messages", label: "Contacter une pharmacie", icon: MessageSquare },
];

export default function PatientDashboard() {
  const { patientProfile } = useAuth();
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [labs, setLabs] = useState<FhirObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, records] = await Promise.all([
        getPatientDashboard(),
        getHealthRecords(patientProfile),
      ]);
      setData(dashboard);
      setLabs(records.labResults);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const name = data?.profile?.full_name || patientProfile?.full_name || "Patient";
  const activeMeds = (data?.medications || []).filter((m) => m.status === "active");

  return (
    <div>
      <PageHeader
        title={`Bonjour, ${name.split(" ")[0]}`}
        subtitle="Votre santé, vos pharmacies et vos commandes en un coup d'œil."
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <SkeletonCards count={6} />
      ) : (
        data && (
          <>
            {/* Welcome + quick stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2 rounded-2xl p-5 bg-[#063b1e] text-white">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6eff8a]/80 mb-2">
                  Bienvenue
                </p>
                <h2 className="text-2xl font-bold text-[#6eff8a]">{name}</h2>
                <p className="text-sm text-emerald-100/80 mt-2">
                  {activeMeds.length > 0
                    ? `Vous avez ${activeMeds.length} traitement${activeMeds.length > 1 ? "s" : ""} en cours.`
                    : "Aucun traitement en cours enregistré."}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {QUICK_ACTIONS.map((a) => {
                    const Icon = a.icon;
                    return (
                      <Link
                        key={a.to}
                        to={a.to}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold text-white transition-colors"
                      >
                        <Icon className="h-4 w-4" />
                        {a.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="Notifications"
                  value={data.unreadNotifications}
                  icon={<Bell className="h-5 w-5" />}
                  to="/patient/notifications"
                />
                <StatCard
                  label="Messages non lus"
                  value={data.unreadMessages}
                  icon={<MessageSquare className="h-5 w-5" />}
                  to="/patient/messages"
                />
                <StatCard
                  label="Traitements actifs"
                  value={activeMeds.length}
                  icon={<Pill className="h-5 w-5" />}
                  to="/patient/history"
                />
                <StatCard
                  label="Commandes"
                  value={data.orders.length}
                  icon={<ShoppingBag className="h-5 w-5" />}
                  to="/patient/orders"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Upcoming medications */}
              <Card
                title="Médicaments à prendre"
                action={<CardLink to="/patient/history" label="Historique" />}
              >
                {activeMeds.length === 0 ? (
                  <EmptyState
                    icon={<Pill className="h-6 w-6" />}
                    title="Aucun traitement en cours"
                    hint="Vos médicaments actifs apparaîtront ici."
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {activeMeds.slice(0, 4).map((m) => (
                      <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {m.medication_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {m.dosage || "Posologie non précisée"}
                            {m.physician ? ` — ${m.physician}` : ""}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                          En cours
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Recent orders / prescriptions */}
              <Card
                title="Commandes récentes"
                action={<CardLink to="/patient/orders" label="Tout voir" />}
              >
                {data.orders.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingBag className="h-6 w-6" />}
                    title="Aucune commande"
                    hint="Commandez vos médicaments auprès d'une pharmacie proche."
                    action={
                      <Link
                        to="/patient/orders"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] text-sm font-semibold hover:bg-black"
                      >
                        Nouvelle commande
                      </Link>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.orders.slice(0, 4).map((o) => (
                      <li key={o.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {o.pharmacy_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(o.created_at)} — {formatCurrency(o.total)}
                          </p>
                        </div>
                        <OrderStatusBadge status={o.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Nearby pharmacies */}
              <Card
                title="Pharmacies à proximité"
                action={<CardLink to="/patient/pharmacies" label="Explorer" />}
              >
                {data.topPharmacies.length === 0 ? (
                  <EmptyState
                    icon={<MapPin className="h-6 w-6" />}
                    title="Aucune pharmacie disponible"
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.topPharmacies.map((p) => (
                      <li key={p.user_id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {p.commune}, {p.province}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <StarRating value={p.rating_avg} />
                          <span className="text-xs text-slate-500">({p.rating_count})</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Notifications */}
              <Card
                title="Notifications"
                action={<CardLink to="/patient/notifications" label="Tout voir" />}
              >
                {data.notifications.length === 0 ? (
                  <EmptyState
                    icon={<Bell className="h-6 w-6" />}
                    title="Aucune notification"
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.notifications.slice(0, 4).map((n) => (
                      <li key={n.id} className="py-3 flex items-start gap-3">
                        <span
                          className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                            n.read_at ? "bg-slate-200" : "bg-emerald-500"
                          }`}
                        />
                        <div>
                          <p className="text-sm text-slate-800">{n.message}</p>
                          <p className="text-xs text-slate-400">{formatDate(n.created_at)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Recent lab results (FHIR observations) */}
              <Card
                title="Résultats de laboratoire récents"
                action={<CardLink to="/patient/health-records" label="Dossier complet" />}
              >
                {labs.length === 0 ? (
                  <EmptyState
                    icon={<FlaskConical className="h-6 w-6" />}
                    title="Aucun résultat disponible"
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {labs.slice(0, 4).map((lab) => (
                      <li key={lab.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{lab.code.text}</p>
                          <p className="text-xs text-slate-500">
                            {formatDate(lab.effectiveDateTime)}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-bold ${
                            lab.interpretation === "normal"
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          {lab.valueQuantity.value} {lab.valueQuantity.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Medical history preview */}
              <Card
                title="Aperçu de l'historique médical"
                action={<CardLink to="/patient/history" label="Tout voir" />}
              >
                {data.medications.length === 0 ? (
                  <EmptyState
                    icon={<ClipboardList className="h-6 w-6" />}
                    title="Aucun historique enregistré"
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.medications.slice(0, 4).map((m) => (
                      <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {m.medication_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(m.start_date)} → {formatDate(m.end_date)}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500 capitalize">{m.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )
      )}
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function CardLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="text-xs font-semibold text-emerald-700 hover:underline">
      {label}
    </Link>
  );
}

function StatCard({
  label,
  value,
  icon,
  to,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-emerald-300 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <div className="text-emerald-600">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </Link>
  );
}
