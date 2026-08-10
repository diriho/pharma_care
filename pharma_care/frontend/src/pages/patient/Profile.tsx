import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { updatePatientProfile } from "../../services/patientPortal";
import { translateApiError } from "../../i18n/apiError";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import ThemeToggle from "../../components/ui/ThemeToggle";

type FormState = {
  full_name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  allergies: string;
};

export default function Profile() {
  const { user, patientProfile, refreshPharmacy, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(["patient", "settings", "common"]);
  const [form, setForm] = useState<FormState>({
    full_name: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    allergies: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!patientProfile) return;
    setForm({
      full_name: patientProfile.full_name || "",
      phone: patientProfile.phone || "",
      date_of_birth: patientProfile.date_of_birth || "",
      gender: patientProfile.gender || "",
      address: patientProfile.address || "",
      allergies: patientProfile.allergies || "",
    });
  }, [patientProfile]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updatePatientProfile({
        ...form,
        date_of_birth: form.date_of_birth || null,
      });
      await refreshPharmacy();
      setSaved(true);
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteAccount();
      navigate("/");
    } catch (err) {
      alert(translateApiError(err, t));
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#063b1e] dark:focus:ring-[#6eff8a] text-sm";
  const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

  return (
    <div>
      <PageHeader title={t("patient:profile.title")} subtitle={t("patient:profile.subtitle")} />

      <div className="max-w-2xl">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-4">
            {t("settings:preferences.title")}
          </h2>
          <div className="flex flex-col sm:flex-row gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                {t("settings:preferences.language")}
              </p>
              <LanguageSwitcher />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                {t("settings:preferences.theme")}
              </p>
              <ThemeToggle />
            </div>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 md:p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("patient:profile.email")}</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-sm"
              />
            </div>
            <div>
              <label className={labelClass}>
                {t("patient:profile.fullName")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("patient:profile.phone")}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("patient:profile.dateOfBirth")}</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => set("date_of_birth", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("patient:profile.gender")}</label>
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className={`${inputClass} bg-white dark:bg-slate-900`}
              >
                <option value="">—</option>
                <option value="femme">{t("patient:profile.genderFemale")}</option>
                <option value="homme">{t("patient:profile.genderMale")}</option>
                <option value="autre">{t("patient:profile.genderOther")}</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{t("patient:profile.address")}</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>{t("patient:profile.allergies")}</label>
              <input
                type="text"
                value={form.allergies}
                onChange={(e) => set("allergies", e.target.value)}
                className={inputClass}
                placeholder={t("patient:profile.allergiesPlaceholder")}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {t("patient:profile.allergiesHint")}
              </p>
            </div>
          </div>

          {error && (
            <p className="px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          {saved && (
            <p className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
              {t("patient:profile.updated")}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black disabled:opacity-60 transition-colors"
          >
            {saving ? t("common:buttons.saving") : t("common:buttons.save")}
          </button>
        </form>

        <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900 p-5 md:p-6">
          <h3 className="font-bold text-red-700 dark:text-red-400 mb-1">{t("patient:profile.dangerZone")}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {t("patient:profile.dangerZoneDesc")}
          </p>
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            {t("patient:profile.deleteButton")}
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t("patient:profile.deleteConfirmTitle")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {t("patient:profile.deleteConfirmMessage")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {t("common:buttons.cancel")}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                {t("patient:profile.deleteConfirmButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
