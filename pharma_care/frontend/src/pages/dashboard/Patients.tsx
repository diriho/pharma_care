import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import { formatDate } from "../../lib/format";
import { translateApiError } from "../../i18n/apiError";

type Patient = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  allergies: string | null;
  notes: string | null;
};

const EMPTY: Partial<Patient> = {
  full_name: "",
  phone: "",
  email: "",
  date_of_birth: "",
  gender: "",
  address: "",
  allergies: "",
  notes: "",
};

export default function Patients() {
  const { t } = useTranslation(["dashboard", "common"]);
  const [list, setList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Patient> | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setList(await api<Patient[]>("/data/patients"));
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = { ...editing, date_of_birth: editing.date_of_birth || null };
    try {
      if (editing.id) {
        await api(`/data/patients/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/data/patients", { method: "POST", body: JSON.stringify(payload) });
      }
      setEditing(null);
      await load();
    } catch (err) {
      alert(translateApiError(err, t));
    }
  }

  async function remove(id: string) {
    if (!confirm(t("dashboard:patients.confirmDelete"))) return;
    await api(`/data/patients/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title={t("dashboard:patients.title")}
        subtitle={t("dashboard:patients.subtitle")}
        action={
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black"
          >
            <Plus className="h-4 w-4" /> {t("dashboard:patients.addPatient")}
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
          <span>{t("common:errorBanner.prefix", { message: error })}</span>
          <button onClick={load} className="ml-auto underline font-semibold">
            {t("common:buttons.retry")}
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">{t("common:common.loading")}</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">{t("dashboard:patients.empty")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left px-4 py-3">{t("dashboard:patients.columns.name")}</th>
                <th className="text-left px-4 py-3">{t("dashboard:patients.columns.phone")}</th>
                <th className="text-left px-4 py-3">{t("dashboard:patients.columns.email")}</th>
                <th className="text-left px-4 py-3">{t("dashboard:patients.columns.dateOfBirth")}</th>
                <th className="text-left px-4 py-3">{t("dashboard:patients.columns.allergies")}</th>
                <th className="text-right px-4 py-3">{t("common:common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                    {p.full_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {formatDate(p.date_of_birth)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.allergies || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => setEditing(p)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                        aria-label={t("common:buttons.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400"
                        aria-label={t("common:buttons.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4 py-8 overflow-y-auto">
          <form
            onSubmit={save}
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl p-6 my-auto"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              {editing.id ? t("dashboard:patients.modal.editTitle") : t("dashboard:patients.modal.addTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldInput
                label={t("dashboard:patients.modal.fields.fullName")}
                required
                value={editing.full_name || ""}
                onChange={(v) => setEditing({ ...editing, full_name: v })}
              />
              <FieldInput
                label={t("dashboard:patients.modal.fields.phone")}
                value={editing.phone || ""}
                onChange={(v) => setEditing({ ...editing, phone: v })}
              />
              <FieldInput
                label={t("dashboard:patients.modal.fields.email")}
                type="email"
                value={editing.email || ""}
                onChange={(v) => setEditing({ ...editing, email: v })}
              />
              <FieldInput
                label={t("dashboard:patients.modal.fields.dateOfBirth")}
                type="date"
                value={editing.date_of_birth || ""}
                onChange={(v) => setEditing({ ...editing, date_of_birth: v })}
              />
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t("dashboard:patients.modal.fields.gender")}
                </span>
                <select
                  value={editing.gender || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, gender: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
                >
                  <option value="">—</option>
                  <option value="F">{t("dashboard:patients.modal.genderOptions.female")}</option>
                  <option value="M">{t("dashboard:patients.modal.genderOptions.male")}</option>
                  <option value="other">{t("dashboard:patients.modal.genderOptions.other")}</option>
                </select>
              </label>
              <FieldInput
                label={t("dashboard:patients.modal.fields.address")}
                value={editing.address || ""}
                onChange={(v) => setEditing({ ...editing, address: v })}
              />
              <div className="md:col-span-2">
                <FieldInput
                  label={t("dashboard:patients.modal.fields.allergies")}
                  value={editing.allergies || ""}
                  onChange={(v) => setEditing({ ...editing, allergies: v })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block">
                  <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {t("dashboard:patients.modal.fields.notes")}
                  </span>
                  <textarea
                    rows={3}
                    value={editing.notes || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, notes: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {t("common:buttons.cancel")}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black"
              >
                {t("common:buttons.save")}
              </button>
            </div>
          </form>
        </div>
      )}
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
