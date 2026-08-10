// FHIR-aligned health record models (subset of FHIR R4 resources).
// Only data that actually exists in the database is returned:
//   Patient / AllergyIntolerance  ← patient_profiles (demographics, allergies)
//   MedicationStatement           ← patient_medications (drug history)
// Conditions, observations, lab results, immunizations and encounters have no
// data source yet — they return empty and the UI shows empty states. When a
// FHIR server or provider integration exists, populate them here; the shapes
// already follow FHIR naming so the UI won't change.

import type { TFunction } from "i18next";
import type { PatientProfile } from "../contexts/AuthContext";
import { getMedications } from "./patientPortal";
import type { PatientMedication } from "../types/patient";

export type FhirHumanName = { family: string; given: string[] };

export interface FhirPatient {
  resourceType: "Patient";
  id: string;
  name: FhirHumanName[];
  gender: string | null;
  birthDate: string | null;
  address: { text: string }[];
  telecom: { system: "phone" | "email"; value: string }[];
}

export interface FhirCondition {
  resourceType: "Condition";
  id: string;
  code: { text: string };
  clinicalStatus: "active" | "resolved" | "remission";
  onsetDateTime: string;
}

export interface FhirAllergyIntolerance {
  resourceType: "AllergyIntolerance";
  id: string;
  code: { text: string };
  criticality: "low" | "high" | "unable-to-assess";
  reaction: { manifestation: string }[];
}

export interface FhirObservation {
  resourceType: "Observation";
  id: string;
  category: "vital-signs" | "laboratory";
  code: { text: string };
  valueQuantity: { value: number; unit: string };
  referenceRange?: string;
  effectiveDateTime: string;
  interpretation?: "normal" | "high" | "low";
}

export interface FhirImmunization {
  resourceType: "Immunization";
  id: string;
  vaccineCode: { text: string };
  occurrenceDateTime: string;
  status: "completed" | "not-done";
}

export interface FhirEncounter {
  resourceType: "Encounter";
  id: string;
  class: string;
  reasonCode: { text: string };
  periodStart: string;
  serviceProvider: string;
}

export interface FhirMedicationStatement {
  resourceType: "MedicationStatement";
  id: string;
  medicationCodeableConcept: { text: string };
  dosage: string;
  status: "active" | "completed" | "stopped";
  effectivePeriod: { start: string; end?: string };
}

export interface HealthRecordBundle {
  patient: FhirPatient;
  conditions: FhirCondition[];
  allergies: FhirAllergyIntolerance[];
  observations: FhirObservation[];
  labResults: FhirObservation[];
  immunizations: FhirImmunization[];
  encounters: FhirEncounter[];
  medications: FhirMedicationStatement[];
}

function toMedicationStatement(m: PatientMedication, t: TFunction): FhirMedicationStatement {
  return {
    resourceType: "MedicationStatement",
    id: m.id,
    medicationCodeableConcept: { text: m.medication_name },
    dosage: m.dosage || t("patient:healthRecords.dosageNotSpecified"),
    status: m.status,
    effectivePeriod: {
      start: m.start_date || m.created_at,
      end: m.end_date || undefined,
    },
  };
}

export async function getHealthRecords(
  profile: PatientProfile | null,
  t: TFunction
): Promise<HealthRecordBundle> {
  const fullName = (profile?.full_name || "").trim();
  const parts = fullName ? fullName.split(/\s+/) : [];
  const patient: FhirPatient = {
    resourceType: "Patient",
    id: profile?.user_id || "",
    name: [{ family: parts.slice(-1)[0] || "", given: parts.slice(0, -1) }],
    gender: profile?.gender || null,
    birthDate: profile?.date_of_birth || null,
    address: profile?.address ? [{ text: profile.address }] : [],
    telecom: profile?.phone ? [{ system: "phone", value: profile.phone }] : [],
  };

  const allergies: FhirAllergyIntolerance[] = (profile?.allergies || "")
    .split(/[,;]/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a, i) => ({
      resourceType: "AllergyIntolerance",
      id: `allergy-${i}`,
      code: { text: a },
      criticality: "unable-to-assess",
      reaction: [],
    }));

  // Drug history is real data — surfaced here as FHIR MedicationStatements
  const medications = await getMedications(1, 50)
    .then((page) => page.items.map((m) => toMedicationStatement(m, t)))
    .catch(() => [] as FhirMedicationStatement[]);

  return {
    patient,
    allergies,
    medications,
    conditions: [],
    observations: [],
    labResults: [],
    immunizations: [],
    encounters: [],
  };
}
