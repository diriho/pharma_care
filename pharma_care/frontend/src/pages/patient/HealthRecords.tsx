import { useEffect, useState } from "react";
import {
  Activity,
  CalendarClock,
  FlaskConical,
  HeartPulse,
  Pill,
  ShieldAlert,
  Syringe,
  UserRound,
} from "lucide-react";
import PageHeader from "../../components/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonCards } from "../../components/ui/Skeleton";
import { useAuth } from "../../contexts/AuthContext";
import { getHealthRecords, type HealthRecordBundle } from "../../services/fhir";
import { formatDate } from "../../lib/format";

export default function HealthRecords() {
  const { patientProfile } = useAuth();
  const [bundle, setBundle] = useState<HealthRecordBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setBundle(await getHealthRecords(patientProfile));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientProfile?.user_id]);

  return (
    <div>
      <PageHeader
        title="Dossier de Santé"
        subtitle="Vos données de santé structurées selon le standard FHIR."
      />

      <p className="mb-4 px-4 py-2.5 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800">
        Dossier structuré au format FHIR R4. Les sections cliniques (consultations,
        analyses, vaccinations…) seront alimentées par vos établissements de santé.
      </p>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <SkeletonCards count={6} />
      ) : (
        bundle && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Patient demographics */}
            <RecordCard title="Démographie du patient" icon={<UserRound className="h-4 w-4" />}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Field label="Nom complet">
                  {[...bundle.patient.name[0].given, bundle.patient.name[0].family]
                    .filter(Boolean)
                    .join(" ")}
                </Field>
                <Field label="Genre">{bundle.patient.gender || "—"}</Field>
                <Field label="Date de naissance">
                  {formatDate(bundle.patient.birthDate)}
                </Field>
                <Field label="Téléphone">
                  {bundle.patient.telecom[0]?.value || "—"}
                </Field>
                <Field label="Adresse" wide>
                  {bundle.patient.address[0]?.text || "—"}
                </Field>
              </dl>
            </RecordCard>

            {/* Conditions */}
            <RecordCard title="Conditions" icon={<HeartPulse className="h-4 w-4" />}>
              <RecordList
                items={bundle.conditions}
                empty="Aucune condition enregistrée"
                render={(c) => (
                  <RecordRow
                    key={c.id}
                    primary={c.code.text}
                    secondary={`Depuis le ${formatDate(c.onsetDateTime)}`}
                    badge={c.clinicalStatus === "active" ? "Active" : "Résolue"}
                    badgeTone={c.clinicalStatus === "active" ? "amber" : "slate"}
                  />
                )}
              />
            </RecordCard>

            {/* Allergies */}
            <RecordCard title="Allergies" icon={<ShieldAlert className="h-4 w-4" />}>
              <RecordList
                items={bundle.allergies}
                empty="Aucune allergie connue"
                render={(a) => (
                  <RecordRow
                    key={a.id}
                    primary={a.code.text}
                    secondary={a.reaction[0]?.manifestation || "Réaction non documentée"}
                    badge={a.criticality === "high" ? "Critique" : "À évaluer"}
                    badgeTone={a.criticality === "high" ? "red" : "slate"}
                  />
                )}
              />
            </RecordCard>

            {/* Observations (vitals) */}
            <RecordCard title="Observations" icon={<Activity className="h-4 w-4" />}>
              <RecordList
                items={bundle.observations}
                empty="Aucune observation"
                render={(o) => (
                  <RecordRow
                    key={o.id}
                    primary={o.code.text}
                    secondary={`${formatDate(o.effectiveDateTime)}${
                      o.referenceRange ? ` — réf. ${o.referenceRange}` : ""
                    }`}
                    badge={`${o.valueQuantity.value} ${o.valueQuantity.unit}`}
                    badgeTone={o.interpretation === "normal" ? "emerald" : "amber"}
                  />
                )}
              />
            </RecordCard>

            {/* Lab results */}
            <RecordCard title="Résultats de laboratoire" icon={<FlaskConical className="h-4 w-4" />}>
              <RecordList
                items={bundle.labResults}
                empty="Aucun résultat de laboratoire"
                render={(o) => (
                  <RecordRow
                    key={o.id}
                    primary={o.code.text}
                    secondary={`${formatDate(o.effectiveDateTime)}${
                      o.referenceRange ? ` — réf. ${o.referenceRange}` : ""
                    }`}
                    badge={`${o.valueQuantity.value} ${o.valueQuantity.unit}`}
                    badgeTone={o.interpretation === "normal" ? "emerald" : "amber"}
                  />
                )}
              />
            </RecordCard>

            {/* Immunizations */}
            <RecordCard title="Vaccinations" icon={<Syringe className="h-4 w-4" />}>
              <RecordList
                items={bundle.immunizations}
                empty="Aucune vaccination enregistrée"
                render={(i) => (
                  <RecordRow
                    key={i.id}
                    primary={i.vaccineCode.text}
                    secondary={formatDate(i.occurrenceDateTime)}
                    badge={i.status === "completed" ? "Effectuée" : "Non faite"}
                    badgeTone={i.status === "completed" ? "emerald" : "red"}
                  />
                )}
              />
            </RecordCard>

            {/* Encounters */}
            <RecordCard title="Consultations" icon={<CalendarClock className="h-4 w-4" />}>
              <RecordList
                items={bundle.encounters}
                empty="Aucune consultation"
                render={(e) => (
                  <RecordRow
                    key={e.id}
                    primary={e.reasonCode.text}
                    secondary={`${e.class} — ${e.serviceProvider}`}
                    badge={formatDate(e.periodStart)}
                    badgeTone="slate"
                  />
                )}
              />
            </RecordCard>

            {/* Medications */}
            <RecordCard title="Médications" icon={<Pill className="h-4 w-4" />}>
              <RecordList
                items={bundle.medications}
                empty="Aucune médication"
                render={(m) => (
                  <RecordRow
                    key={m.id}
                    primary={m.medicationCodeableConcept.text}
                    secondary={m.dosage}
                    badge={m.status === "active" ? "En cours" : "Terminée"}
                    badgeTone={m.status === "active" ? "emerald" : "slate"}
                  />
                )}
              />
            </RecordCard>
          </div>
        )
      )}
    </div>
  );
}

// ---- reusable record building blocks ----

function RecordCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
          {icon}
        </span>
        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function RecordList<T>({
  items,
  empty,
  render,
}: {
  items: T[];
  empty: string;
  render: (item: T) => React.ReactNode;
}) {
  if (items.length === 0) return <EmptyState title={empty} />;
  return <ul className="divide-y divide-slate-100">{items.map(render)}</ul>;
}

const BADGE_TONES: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  slate: "bg-slate-100 text-slate-600",
};

function RecordRow({
  primary,
  secondary,
  badge,
  badgeTone = "slate",
}: {
  primary: string;
  secondary?: string;
  badge?: string;
  badgeTone?: keyof typeof BADGE_TONES;
}) {
  return (
    <li className="py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{primary}</p>
        {secondary && <p className="text-xs text-slate-500">{secondary}</p>}
      </div>
      {badge && (
        <span
          className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${BADGE_TONES[badgeTone]}`}
        >
          {badge}
        </span>
      )}
    </li>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-slate-900 mt-0.5">{children}</dd>
    </div>
  );
}
