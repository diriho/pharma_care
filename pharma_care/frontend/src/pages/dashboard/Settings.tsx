import { useEffect, useState } from "react";
import { api, apiDownload } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { Download } from "lucide-react";

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
  const { pharmacy, refreshPharmacy } = useAuth();
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
      setMessage("Paramètres enregistrés.");
    } catch (err) {
      setMessage((err as Error).message);
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

  if (!form) return <p className="text-slate-500">Chargement…</p>;

  return (
    <div>
      <PageHeader
        title="Configuration de l'officine"
        subtitle="Mettez à jour les informations et seuils d'alerte."
        action={
          <button
            onClick={exportJson}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Exporter l'historique (JSON)
          </button>
        }
      />

      <form
        onSubmit={save}
        className="bg-white rounded-2xl border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <FieldInput label="Nom de la pharmacie" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <FieldInput label="Téléphone" required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <div className="md:col-span-2">
          <FieldInput label="Adresse" required value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        </div>
        <FieldInput label="Commune" required value={form.commune} onChange={(v) => setForm({ ...form, commune: v })} />
        <FieldInput label="Province" required value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
        <FieldInput label="Devise" required value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} />
        <FieldInput label="NIF" value={form.nif} onChange={(v) => setForm({ ...form, nif: v })} />
        <FieldInput label="RC" value={form.rc} onChange={(v) => setForm({ ...form, rc: v })} />
        <FieldInput
          label="Alerte péremption (mois)"
          type="number"
          required
          value={String(form.expiry_alert_months)}
          onChange={(v) => setForm({ ...form, expiry_alert_months: Number(v) })}
        />
        <FieldInput
          label="Seuil stock bas général"
          type="number"
          required
          value={String(form.low_stock_alert_level)}
          onChange={(v) => setForm({ ...form, low_stock_alert_level: Number(v) })}
        />
        <div className="md:col-span-2 flex items-center justify-between pt-2">
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto px-5 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
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
      <span className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </label>
  );
}
