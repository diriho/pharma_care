import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, apiDownload } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { translateApiError } from "../../i18n/apiError";
import { Download } from "lucide-react";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import ThemeToggle from "../../components/ui/ThemeToggle";

type SettingsForm = {
  name: string;
  address: string;
  commune: string;
  province: string;
  phone: string;
  currency: string;
  nif: string;
  rc: string;
  expiry_alert_months: number;
  low_stock_alert_level: number;
};

export default function Settings() {
  const { pharmacy, pharmacyLoading, pharmacyError, refreshPharmacy } = useAuth();
  const { t } = useTranslation(["settings", "common"]);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (pharmacy) {
      setForm({
        name: pharmacy.name,
        address: pharmacy.address,
        commune: pharmacy.commune,
        province: pharmacy.province,
        phone: pharmacy.phone,
        currency: pharmacy.currency,
        nif: pharmacy.nif || "",
        rc: pharmacy.rc || "",
        expiry_alert_months: pharmacy.expiry_alert_months,
        low_stock_alert_level: pharmacy.low_stock_alert_level,
      });
    }
  }, [pharmacy]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      await api("/data/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          expiry_alert_months: Number(form.expiry_alert_months),
          low_stock_alert_level: Number(form.low_stock_alert_level),
          nif: form.nif || null,
          rc: form.rc || null,
        }),
      });
      await refreshPharmacy();
      setMessage(t("settings:pharmacy.saved"));
    } catch (err) {
      setMessage(translateApiError(err, t));
    } finally {
      setSaving(false);
    }
  }

  async function exportJson() {
    await apiDownload(
      "/data/export",
      `pharma-core-${(pharmacy?.name || "pharmacie").replace(/\s+/g, "-").toLowerCase()}.json`
    );
  }

  const preferences = (
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
  );

  if (!form) {
    if (pharmacyLoading) return <p className="text-slate-500 dark:text-slate-400">{t("common:common.loading")}</p>;
    if (pharmacyError) {
      return (
        <>
          {preferences}
          <div className="px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
            <span>{t("settings:pharmacy.loadError", { message: pharmacyError })}</span>
            <button
              onClick={() => refreshPharmacy()}
              className="ml-auto underline font-semibold"
            >
              {t("common:buttons.retry")}
            </button>
          </div>
        </>
      );
    }
    return (
      <>
        {preferences}
        <p className="text-slate-500 dark:text-slate-400">{t("settings:pharmacy.noProfile")}</p>
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("settings:pharmacy.title")}
        subtitle={t("settings:pharmacy.subtitle")}
        action={
          <button
            onClick={exportJson}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4" /> {t("settings:pharmacy.exportHistory")}
          </button>
        }
      />

      {preferences}

      <form
        onSubmit={save}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <FieldInput label={t("settings:pharmacy.fields.name")} required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <FieldInput label={t("settings:pharmacy.fields.phone")} required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <div className="md:col-span-2">
          <FieldInput label={t("settings:pharmacy.fields.address")} required value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        </div>
        <FieldInput label={t("settings:pharmacy.fields.commune")} required value={form.commune} onChange={(v) => setForm({ ...form, commune: v })} />
        <FieldInput label={t("settings:pharmacy.fields.province")} required value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
        <FieldInput label={t("settings:pharmacy.fields.currency")} required value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} />
        <FieldInput label={t("settings:pharmacy.fields.nif")} value={form.nif} onChange={(v) => setForm({ ...form, nif: v })} />
        <FieldInput label={t("settings:pharmacy.fields.rc")} value={form.rc} onChange={(v) => setForm({ ...form, rc: v })} />
        <FieldInput
          label={t("settings:pharmacy.fields.expiryAlertMonths")}
          type="number"
          required
          value={String(form.expiry_alert_months)}
          onChange={(v) => setForm({ ...form, expiry_alert_months: Number(v) })}
        />
        <FieldInput
          label={t("settings:pharmacy.fields.lowStockAlertLevel")}
          type="number"
          required
          value={String(form.low_stock_alert_level)}
          onChange={(v) => setForm({ ...form, low_stock_alert_level: Number(v) })}
        />
        <div className="md:col-span-2 flex items-center justify-between pt-2">
          {message && <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto px-5 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black disabled:opacity-60"
          >
            {saving ? t("common:buttons.saving") : t("common:buttons.save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </label>
  );
}
