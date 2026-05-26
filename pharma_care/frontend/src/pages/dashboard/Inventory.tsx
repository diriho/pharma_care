import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency, formatDate } from "../../lib/format";
import PageHeader from "../../components/PageHeader";

type Medicine = {
  id: string;
  name: string;
  dosage: string | null;
  molecule: string | null;
  category: string | null;
  stock: number;
  min_stock_level: number;
  purchase_price: number;
  selling_price: number;
  batch_number: string | null;
  expiry_date: string | null;
  shelf_location: string | null;
  supplier_id: string | null;
  description: string | null;
};

type Supplier = { id: string; name: string };

const EMPTY: Partial<Medicine> = {
  name: "",
  dosage: "",
  molecule: "",
  category: "",
  stock: 0,
  min_stock_level: 10,
  purchase_price: 0,
  selling_price: 0,
  batch_number: "",
  expiry_date: "",
  shelf_location: "",
  supplier_id: null,
  description: "",
};

export default function Inventory() {
  const { pharmacy } = useAuth();
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Medicine> | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [m, s] = await Promise.all([
        api<Medicine[]>("/data/medicines"),
        api<Supplier[]>("/data/suppliers"),
      ]);
      setMeds(m);
      setSuppliers(s);
    } catch (err) {
      setError((err as Error).message);
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
    const payload = {
      ...editing,
      stock: Number(editing.stock || 0),
      min_stock_level: Number(editing.min_stock_level || 0),
      purchase_price: Number(editing.purchase_price || 0),
      selling_price: Number(editing.selling_price || 0),
      expiry_date: editing.expiry_date || null,
      supplier_id: editing.supplier_id || null,
    };
    try {
      if (editing.id) {
        await api(`/data/medicines/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/data/medicines", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce médicament ?")) return;
    try {
      await api(`/data/medicines/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  const filtered = meds.filter((m) =>
    [m.name, m.molecule, m.category, m.batch_number]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(query.toLowerCase()))
  );

  const currency = pharmacy?.currency || "FBU";

  return (
    <div>
      <PageHeader
        title="Inventaire des médicaments"
        subtitle="Suivi des stocks, lots, péremptions et tarification."
        action={
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black"
          >
            <Plus className="h-4 w-4" /> Ajouter un médicament
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-3">
          <span>Erreur de chargement : {error}</span>
          <button onClick={load} className="ml-auto underline font-semibold">
            Réessayer
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <input
            type="search"
            placeholder="Rechercher (nom, molécule, catégorie, lot)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full max-w-md px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {loading ? (
          <p className="p-6 text-slate-500">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-slate-500">Aucun médicament. Commencez par en ajouter un.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Médicament</th>
                  <th className="text-left px-4 py-3">Catégorie</th>
                  <th className="text-right px-4 py-3">Stock</th>
                  <th className="text-right px-4 py-3">PA</th>
                  <th className="text-right px-4 py-3">PV</th>
                  <th className="text-left px-4 py-3">Péremption</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m) => {
                  const low = m.stock <= m.min_stock_level;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{m.name}</div>
                        <div className="text-xs text-slate-500">
                          {m.dosage} {m.molecule ? `• ${m.molecule}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.category || "—"}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${low ? "text-red-600" : "text-slate-900"}`}>
                        {m.stock}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatCurrency(m.purchase_price, currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 font-semibold">
                        {formatCurrency(m.selling_price, currency)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(m.expiry_date)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => setEditing(m)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                            aria-label="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove(m.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <MedicineModal
          value={editing}
          suppliers={suppliers}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSubmit={save}
        />
      )}
    </div>
  );
}

function MedicineModal({
  value,
  suppliers,
  onChange,
  onClose,
  onSubmit,
}: {
  value: Partial<Medicine>;
  suppliers: Supplier[];
  onChange: (v: Partial<Medicine>) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  function set<K extends keyof Medicine>(k: K, v: Medicine[K] | string) {
    onChange({ ...value, [k]: v });
  }
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl w-full max-w-2xl p-6 my-auto"
      >
        <h3 className="text-xl font-bold text-slate-900 mb-4">
          {value.id ? "Modifier le médicament" : "Ajouter un médicament"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nom" required>
            <input
              required
              value={value.name || ""}
              onChange={(e) => set("name", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Catégorie">
            <input
              value={value.category || ""}
              onChange={(e) => set("category", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Dosage">
            <input
              value={value.dosage || ""}
              onChange={(e) => set("dosage", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Molécule">
            <input
              value={value.molecule || ""}
              onChange={(e) => set("molecule", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Stock initial">
            <input
              type="number"
              min={0}
              value={value.stock ?? 0}
              onChange={(e) => set("stock", Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Seuil stock bas">
            <input
              type="number"
              min={0}
              value={value.min_stock_level ?? 0}
              onChange={(e) => set("min_stock_level", Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Prix d'achat">
            <input
              type="number"
              min={0}
              step="0.01"
              value={value.purchase_price ?? 0}
              onChange={(e) => set("purchase_price", Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Prix de vente">
            <input
              type="number"
              min={0}
              step="0.01"
              value={value.selling_price ?? 0}
              onChange={(e) => set("selling_price", Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="N° de lot">
            <input
              value={value.batch_number || ""}
              onChange={(e) => set("batch_number", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Date de péremption">
            <input
              type="date"
              value={value.expiry_date || ""}
              onChange={(e) => set("expiry_date", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Emplacement (rayon)">
            <input
              value={value.shelf_location || ""}
              onChange={(e) => set("shelf_location", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Fournisseur">
            <select
              value={value.supplier_id || ""}
              onChange={(e) => set("supplier_id", e.target.value || null)}
              className="input"
            >
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <textarea
                rows={3}
                value={value.description || ""}
                onChange={(e) => set("description", e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
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
        <style>{`.input{width:100%;padding:.5rem .75rem;border:1px solid #e2e8f0;border-radius:.5rem;font-size:.875rem;background:#fff}.input:focus{outline:none;box-shadow:0 0 0 2px rgb(16 185 129 / .4);border-color:transparent}`}</style>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
