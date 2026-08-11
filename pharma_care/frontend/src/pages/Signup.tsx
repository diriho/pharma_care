import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Github } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import RoleToggle, { type AccountType } from "../components/ui/RoleToggle";
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
} from "./signupFields";

type FormState = { email: string; password: string } & PharmacyFormState;

const INITIAL: FormState = { email: "", password: "", ...PHARMACY_INITIAL };

type PatientFormState = { email: string; password: string } & typeof PATIENT_FIELDS_INITIAL;

const PATIENT_INITIAL: PatientFormState = { email: "", password: "", ...PATIENT_FIELDS_INITIAL };

export default function Signup() {
  const { signup, signupPatient, loginWithGitHub } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(["auth", "common"]);
  const [accountType, setAccountType] = useState<AccountType>("pharmacy");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [patientForm, setPatientForm] = useState<PatientFormState>(PATIENT_INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onGitHubClick() {
    setError(null);
    try {
      await loginWithGitHub(accountType);
    } catch (err) {
      setError(translateApiError(err, t));
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function setPatient<K extends keyof PatientFormState>(
    key: K,
    value: PatientFormState[K]
  ) {
    setPatientForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmitPatient(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signupPatient({
        email: patientForm.email,
        password: patientForm.password,
        profile: {
          fullName: patientForm.fullName.trim(),
          phone: patientForm.phone.trim() || undefined,
          dateOfBirth: patientForm.dateOfBirth || undefined,
          gender: patientForm.gender || undefined,
          address: patientForm.address.trim() || undefined,
          allergies: patientForm.allergies.trim() || undefined,
        },
      });
      navigate("/patient");
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({
        email: form.email,
        password: form.password,
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
      });
      navigate("/dashboard");
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
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="h-10 w-10 rounded-xl bg-[#063b1e] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[#6eff8a]"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-[#063b1e] dark:text-[#6eff8a]">
            {t("common:app.name")}
          </span>
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#f0f0f0] dark:border-slate-700 p-8">
          <h1 className="text-2xl font-bold text-[#063b1e] dark:text-[#6eff8a] mb-1">
            {accountType === "pharmacy" ? t("auth:signup.titlePharmacy") : t("auth:signup.titlePatient")}
          </h1>
          <p className="text-sm text-[#71717a] dark:text-slate-400 mb-6">
            {accountType === "pharmacy"
              ? t("auth:signup.subtitlePharmacy")
              : t("auth:signup.subtitlePatient")}
          </p>

          <RoleToggle
            value={accountType}
            onChange={(v) => {
              setAccountType(v);
              setError(null);
            }}
          />

          <button
            type="button"
            onClick={onGitHubClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 mb-5 rounded-lg border border-[#e4e4e7] dark:border-slate-600 text-sm font-semibold text-[#3f3f46] dark:text-slate-200 hover:bg-[#f4f4f5] dark:hover:bg-slate-700 transition-colors"
          >
            <Github className="h-4 w-4" />
            {t("auth:signup.continueWithGithub")}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-[#e4e4e7] dark:bg-slate-700" />
            <span className="text-xs font-medium text-[#a1a1aa] dark:text-slate-500">
              {t("auth:orDivider")}
            </span>
            <div className="h-px flex-1 bg-[#e4e4e7] dark:bg-slate-700" />
          </div>

          {accountType === "patient" ? (
            <form onSubmit={onSubmitPatient} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>
                    {t("auth:signup.email")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={patientForm.email}
                    onChange={(e) => setPatient("email", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="patient@example.bi"
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>
                    {t("auth:signup.password")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={patientForm.password}
                    onChange={(e) => setPatient("password", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder={t("auth:signup.passwordPlaceholder")}
                  />
                </div>
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
                {submitting ? t("auth:signup.submittingPatient") : t("auth:signup.submitPatient")}
              </button>
            </form>
          ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>
                  {t("auth:signup.email")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="pharmacien@example.bi"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>
                  {t("auth:signup.password")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className={INPUT_CLASS}
                  placeholder={t("auth:signup.passwordPlaceholder")}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#f0f0f0] dark:border-slate-700">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#063b1e] dark:text-[#6eff8a] mt-4 mb-3">
                {t("auth:signup.pharmacyInfoTitle")}
              </h2>
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
              {submitting ? t("auth:signup.submittingPharmacy") : t("auth:signup.submitPharmacy")}
            </button>
          </form>
          )}

          <p className="text-sm text-center text-[#71717a] dark:text-slate-400 mt-6">
            {t("auth:signup.alreadyRegistered")}{" "}
            <Link to="/login" className="text-[#063b1e] dark:text-[#6eff8a] font-semibold hover:underline">
              {t("auth:signup.signInLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
