import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import { formatDate } from "../../lib/format";

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
  const [list, setList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Patient> | null>(null);

  async function load() {
    setLoading(true);
    try {
      setList(await api<Patient[]>("/data/patients"));
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
      alert((err as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce patient ?")) return;
    await api(`/data/patients/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Patients & Clients"
        subtitle="Base de données patients avec coordonnées et notes cliniques."
        action={
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black"
          >
            <Plus className="h-4 w-4" /> Ajouter un patient
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500">Chargement…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-slate-500">Aucun patient enregistré.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Nom</th>
                <th className="text-left px-4 py-3">Téléphone</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Date de naissance</th>
                <th className="text-left px-4 py-3">Allergies</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {p.full_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(p.date_of_birth)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.allergies || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => setEditing(p)}
                        className="p-1.5 rounded-lg hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
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
            className="bg-white rounded-2xl w-full max-w-xl p-6 my-auto"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {editing.id ? "Modifier le patient" : "Ajouter un patient"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldInput
                label="Nom complet"
                required
                value={editing.full_name || ""}
                onChange={(v) => setEditing({ ...editing, full_name: v })}
              />
              <FieldInput
                label="Téléphone"
                value={editing.phone || ""}
                onChange={(v) => setEditing({ ...editing, phone: v })}
              />
              <FieldInput
                label="Email"
                type="email"
                value={editing.email || ""}
                onChange={(v) => setEditing({ ...editing, email: v })}
              />
              <FieldInput
                label="Date de naissance"
                type="date"
                value={editing.date_of_birth || ""}
                onChange={(v) => setEditing({ ...editing, date_of_birth: v })}
              />
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1">
                  Genre
                </span>
                <select
                  value={editing.gender || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, gender: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                >
                  <option value="">—</option>
                  <option value="F">Féminin</option>
                  <option value="M">Masculin</option>
                  <option value="other">Autre</option>
                </select>
              </label>
              <FieldInput
                label="Adresse"
                value={editing.address || ""}
                onChange={(v) => setEditing({ ...editing, address: v })}
              />
              <div className="md:col-span-2">
                <FieldInput
                  label="Allergies"
                  value={editing.allergies || ""}
                  onChange={(v) => setEditing({ ...editing, allergies: v })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block">
                  <span className="block text-xs font-semibold text-slate-600 mb-1">
                    Notes
                  </span>
                  <textarea
                    rows={3}
                    value={editing.notes || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, notes: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black"
              >
                Enregistrer
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
