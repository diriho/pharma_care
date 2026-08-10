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
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonCards } from "../../components/ui/Skeleton";
import { useAuth } from "../../contexts/AuthContext";
import { getHealthRecords, type HealthRecordBundle } from "../../services/fhir";
import { formatDate } from "../../lib/format";
import { translateApiError } from "../../i18n/apiError";

export default function HealthRecords() {
  const { patientProfile } = useAuth();
  const { t } = useTranslation(["patient", "common"]);
  const [bundle, setBundle] = useState<HealthRecordBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setBundle(await getHealthRecords(patientProfile, t));
    } catch (err) {
      setError(translateApiError(err, t));
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
        title={t("patient:healthRecords.title")}
        subtitle={t("patient:healthRecords.subtitle")}
      />

      <p className="mb-4 px-4 py-2.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg text-xs text-sky-800 dark:text-sky-300">
        {t("patient:healthRecords.fhirNotice")}
      </p>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading ? (
        <SkeletonCards count={6} />
      ) : (
        bundle && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Patient demographics */}
            <RecordCard title={t("patient:healthRecords.demographics")} icon={<UserRound className="h-4 w-4" />}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Field label={t("patient:profile.fullName")}>
                  {[...bundle.patient.name[0].given, bundle.patient.name[0].family]
                    .filter(Boolean)
                    .join(" ")}
                </Field>
                <Field label={t("patient:profile.gender")}>{bundle.patient.gender || "—"}</Field>
                <Field label={t("patient:profile.dateOfBirth")}>
                  {formatDate(bundle.patient.birthDate)}
                </Field>
                <Field label={t("patient:profile.phone")}>
                  {bundle.patient.telecom[0]?.value || "—"}
                </Field>
                <Field label={t("patient:profile.address")} wide>
                  {bundle.patient.address[0]?.text || "—"}
                </Field>
              </dl>
            </RecordCard>

            {/* Conditions */}
            <RecordCard title={t("patient:healthRecords.conditions")} icon={<HeartPulse className="h-4 w-4" />}>
              <RecordList
                items={bundle.conditions}
                empty={t("patient:healthRecords.noConditions")}
                render={(c) => (
                  <RecordRow
                    key={c.id}
                    primary={c.code.text}
                    secondary={t("patient:healthRecords.since", { date: formatDate(c.onsetDateTime) })}
                    badge={
                      c.clinicalStatus === "active"
                        ? t("patient:healthRecords.conditionActive")
                        : t("patient:healthRecords.conditionResolved")
                    }
                    badgeTone={c.clinicalStatus === "active" ? "amber" : "slate"}
                  />
                )}
              />
            </RecordCard>

            {/* Allergies */}
            <RecordCard title={t("patient:healthRecords.allergies")} icon={<ShieldAlert className="h-4 w-4" />}>
              <RecordList
                items={bundle.allergies}
                empty={t("patient:healthRecords.noAllergies")}
                render={(a) => (
                  <RecordRow
                    key={a.id}
                    primary={a.code.text}
                    secondary={a.reaction[0]?.manifestation || t("patient:healthRecords.reactionNotDocumented")}
                    badge={a.criticality === "high" ? t("patient:healthRecords.critical") : t("patient:healthRecords.toAssess")}
                    badgeTone={a.criticality === "high" ? "red" : "slate"}
                  />
                )}
              />
            </RecordCard>

            {/* Observations (vitals) */}
            <RecordCard title={t("patient:healthRecords.observations")} icon={<Activity className="h-4 w-4" />}>
              <RecordList
                items={bundle.observations}
                empty={t("patient:healthRecords.noObservations")}
                render={(o) => (
                  <RecordRow
                    key={o.id}
                    primary={o.code.text}
                    secondary={`${formatDate(o.effectiveDateTime)}${
                      o.referenceRange
                        ? t("patient:healthRecords.referenceRangeSuffix", { range: o.referenceRange })
                        : ""
                    }`}
                    badge={`${o.valueQuantity.value} ${o.valueQuantity.unit}`}
                    badgeTone={o.interpretation === "normal" ? "emerald" : "amber"}
                  />
                )}
              />
            </RecordCard>

            {/* Lab results */}
            <RecordCard title={t("patient:healthRecords.labResults")} icon={<FlaskConical className="h-4 w-4" />}>
              <RecordList
                items={bundle.labResults}
                empty={t("patient:healthRecords.noLabResults")}
                render={(o) => (
                  <RecordRow
                    key={o.id}
                    primary={o.code.text}
                    secondary={`${formatDate(o.effectiveDateTime)}${
                      o.referenceRange
                        ? t("patient:healthRecords.referenceRangeSuffix", { range: o.referenceRange })
                        : ""
                    }`}
                    badge={`${o.valueQuantity.value} ${o.valueQuantity.unit}`}
                    badgeTone={o.interpretation === "normal" ? "emerald" : "amber"}
                  />
                )}
              />
            </RecordCard>

            {/* Immunizations */}
            <RecordCard title={t("patient:healthRecords.immunizations")} icon={<Syringe className="h-4 w-4" />}>
              <RecordList
                items={bundle.immunizations}
                empty={t("patient:healthRecords.noImmunizations")}
                render={(i) => (
                  <RecordRow
                    key={i.id}
                    primary={i.vaccineCode.text}
                    secondary={formatDate(i.occurrenceDateTime)}
                    badge={
                      i.status === "completed"
                        ? t("patient:healthRecords.immunizationDone")
                        : t("patient:healthRecords.immunizationNotDone")
                    }
                    badgeTone={i.status === "completed" ? "emerald" : "red"}
                  />
                )}
              />
            </RecordCard>

            {/* Encounters */}
            <RecordCard title={t("patient:healthRecords.encounters")} icon={<CalendarClock className="h-4 w-4" />}>
              <RecordList
                items={bundle.encounters}
                empty={t("patient:healthRecords.noEncounters")}
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
            <RecordCard title={t("patient:healthRecords.medications")} icon={<Pill className="h-4 w-4" />}>
              <RecordList
                items={bundle.medications}
                empty={t("patient:healthRecords.noMedications")}
                render={(m) => (
                  <RecordRow
                    key={m.id}
                    primary={m.medicationCodeableConcept.text}
                    secondary={m.dosage}
                    badge={
                      m.status === "active"
                        ? t("patient:healthRecords.medicationInProgress")
                        : t("patient:healthRecords.medicationCompleted")
                    }
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
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
          {icon}
        </span>
        <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
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
  return <ul className="divide-y divide-slate-100 dark:divide-slate-700">{items.map(render)}</ul>;
}

const BADGE_TONES: Record<string, string> = {
  emerald: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  red: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  slate: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
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
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{primary}</p>
        {secondary && <p className="text-xs text-slate-500 dark:text-slate-400">{secondary}</p>}
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="text-slate-900 dark:text-slate-100 mt-0.5">{children}</dd>
    </div>
  );
}
