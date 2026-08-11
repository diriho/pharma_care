import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { homePathForRole, useAuth } from "../contexts/AuthContext";
import { api } from "../api/client";
import { translateApiError } from "../i18n/apiError";
import { ThemeToggleButton } from "../components/ui/ThemeToggle";
import { LanguageSwitcherButton } from "../components/ui/LanguageSwitcher";
import {
  PHARMACY_FIELDS,
  PHARMACY_INITIAL,
  PATIENT_FIELDS_INITIAL,
  INPUT_CLASS,
  LABEL_CLASS,
  fieldLabel,
  type PharmacyFormState,
  type PatientFormFields,
} from "./signupFields";

// Shown right after a first-time GitHub sign-in that doesn't have a
// pharmacy_settings/patient_profiles row yet — same fields as the regular
// Signup form, minus email/password (the OAuth session already has those).
export default function CompleteProfile() {
  const { user, loading, role, pharmacy, patientProfile, refreshPharmacy } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(["auth", "common"]);
  const [form, setForm] = useState<PharmacyFormState>(PHARMACY_INITIAL);
  const [patientForm, setPatientForm] = useState<PatientFormFields>(PATIENT_FIELDS_INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        {t("common:common.loading")}
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (pharmacy || patientProfile) return <Navigate to={homePathForRole(role)} replace />;

  function set<K extends keyof PharmacyFormState>(key: K, value: PharmacyFormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }
  function setPatient<K extends keyof PatientFormFields>(key: K, value: PatientFormFields[K]) {
    setPatientForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (role === "patient") {
        await api("/auth/oauth/profile", {
          method: "POST",
          body: JSON.stringify({
            profile: {
              fullName: patientForm.fullName.trim(),
              phone: patientForm.phone.trim() || undefined,
              dateOfBirth: patientForm.dateOfBirth || undefined,
              gender: patientForm.gender || undefined,
              address: patientForm.address.trim() || undefined,
              allergies: patientForm.allergies.trim() || undefined,
            },
          }),
        });
      } else {
        await api("/auth/oauth/profile", {
          method: "POST",
          body: JSON.stringify({
            pharmacy: {
              name: form.name.trim(),
              address: form.address.trim(),
              commune: form.commune.trim(),
              province: form.province.trim(),
              phone: form.phone.trim(),
              currency: form.currency.trim() || "FBU",
              nif: form.nif.trim() || undefined,
              rc: form.rc.trim() || undefined,
              expiryAlertMonths: Number(form.expiryAlertMonths),
              lowStockAlertLevel: Number(form.lowStockAlertLevel),
            },
          }),
        });
      }
      await refreshPharmacy();
      navigate(homePathForRole(role), { replace: true });
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-12 bg-gradient-to-br from-[#fcfcfc] to-[#e9f7ef] dark:from-slate-950 dark:to-slate-900">
      <div className="fixed top-4 right-4 flex items-center gap-1">
        <LanguageSwitcherButton />
        <ThemeToggleButton />
      </div>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#f0f0f0] dark:border-slate-700 p-8">
          <h1 className="text-2xl font-bold text-[#063b1e] dark:text-[#6eff8a] mb-1">
            {t("auth:oauth.completeTitle")}
          </h1>
          <p className="text-sm text-[#71717a] dark:text-slate-400 mb-6">
            {t("auth:oauth.completeSubtitle")}
          </p>

          {role === "patient" ? (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>
                    {t("auth:signup.fullName")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={patientForm.fullName}
                    onChange={(e) => setPatient("fullName", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder={t("auth:signup.fullNamePlaceholder")}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>{t("auth:signup.phone")}</label>
                  <input
                    type="tel"
                    value={patientForm.phone}
                    onChange={(e) => setPatient("phone", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="+257 79 ..."
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>{t("auth:signup.dateOfBirth")}</label>
                  <input
                    type="date"
                    value={patientForm.dateOfBirth}
                    onChange={(e) => setPatient("dateOfBirth", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>{t("auth:signup.gender")}</label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) => setPatient("gender", e.target.value)}
                    className={`${INPUT_CLASS} bg-white dark:bg-slate-900`}
                  >
                    <option value="">—</option>
                    <option value="femme">{t("auth:signup.genderFemale")}</option>
                    <option value="homme">{t("auth:signup.genderMale")}</option>
                    <option value="autre">{t("auth:signup.genderOther")}</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL_CLASS}>{t("auth:signup.address")}</label>
                  <input
                    type="text"
                    value={patientForm.address}
                    onChange={(e) => setPatient("address", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder={t("auth:signup.addressPlaceholder")}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL_CLASS}>{t("auth:signup.allergies")}</label>
                  <input
                    type="text"
                    value={patientForm.allergies}
                    onChange={(e) => setPatient("allergies", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder={t("auth:signup.allergiesPlaceholder")}
                  />
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black dark:hover:bg-slate-950 disabled:opacity-60 transition-colors"
              >
                {submitting ? t("auth:signup.submittingPatient") : t("auth:oauth.completeSubmit")}
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PHARMACY_FIELDS.map((f) => (
                  <div key={f.key} className={f.key === "address" ? "md:col-span-2" : ""}>
                    <label className={LABEL_CLASS}>
                      {fieldLabel(t, f.labelKey)}{" "}
                      {f.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={f.type || "text"}
                      required={f.required}
                      value={form[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      className={INPUT_CLASS}
                      placeholder={f.placeholderKey ? fieldLabel(t, f.placeholderKey) : undefined}
                    />
                    {f.hintKey && (
                      <p className="text-xs text-[#71717a] dark:text-slate-400 mt-1">
                        {fieldLabel(t, f.hintKey)}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black dark:hover:bg-slate-950 disabled:opacity-60 transition-colors"
              >
                {submitting ? t("auth:signup.submittingPharmacy") : t("auth:oauth.completeSubmit")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
