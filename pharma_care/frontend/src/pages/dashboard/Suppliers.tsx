import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, PackageCheck } from "lucide-react";
import { api } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency, formatDate } from "../../lib/format";

type Supplier = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  categories: string[] | null;
};

type Medicine = { id: string; name: string; purchase_price: number };

type OrderLine = { medicine_id: string; name: string; quantity: number; unit_cost: number };

type RestockOrder = {
  id: string;
  supplier_id: string | null;
  items: OrderLine[];
  total: number;
  status: string;
  expected_at: string | null;
  received_at: string | null;
  created_at: string;
};

const EMPTY_SUPPLIER: Partial<Supplier> = {
  name: "",
  contact_name: "",
  phone: "",
  email: "",
  address: "",
  categories: [],
};

export default function Suppliers() {
  const { pharmacy } = useAuth();
  const currency = pharmacy?.currency || "FBU";
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<RestockOrder[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderModal, setOrderModal] = useState<{
    supplierId: string;
    items: OrderLine[];
  } | null>(null);

  async function load() {
    setError(null);
    try {
      const [s, o, m] = await Promise.all([
        api<Supplier[]>("/data/suppliers"),
        api<RestockOrder[]>("/data/restock-orders"),
        api<Medicine[]>("/data/medicines"),
      ]);
      setSuppliers(s);
      setOrders(o);
      setMedicines(m);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function saveSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      ...editing,
      categories:
        typeof editing.categories === "string"
          ? (editing.categories as unknown as string)
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean)
          : editing.categories || [],
    };
    try {
      if (editing.id) {
        await api(`/data/suppliers/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/data/suppliers", { method: "POST", body: JSON.stringify(payload) });
      }
      setEditing(null);
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function removeSupplier(id: string) {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    await api(`/data/suppliers/${id}`, { method: "DELETE" });
    await load();
  }

  async function submitOrder() {
    if (!orderModal) return;
    const total = orderModal.items.reduce(
      (s, l) => s + l.quantity * l.unit_cost,
      0
    );
    try {
      await api("/data/restock-orders", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: orderModal.supplierId,
          items: orderModal.items,
          total,
          status: "pending",
        }),
      });
      setOrderModal(null);
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function receiveOrder(id: string) {
    if (!confirm("Marquer cette commande comme reçue ? Les stocks seront incrémentés.")) return;
    try {
      await api(`/data/restock-orders/${id}/receive`, { method: "POST" });
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Fournisseurs & Approvisionnements"
        subtitle="Gérez vos partenaires et passez des commandes de réapprovisionnement."
        action={
          <button
            onClick={() => setEditing({ ...EMPTY_SUPPLIER })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black"
          >
            <Plus className="h-4 w-4" /> Ajouter un fournisseur
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-900 mb-3">Fournisseurs</h3>
          {suppliers.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun fournisseur.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">
                      {s.contact_name || "—"} · {s.phone || "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrderModal({ supplierId: s.id, items: [] })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      Nouvelle commande
                    </button>
                    <button
                      onClick={() => setEditing(s)}
                      className="p-1.5 rounded-lg hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeSupplier(s.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-900 mb-3">Commandes d'approvisionnement</h3>
          {orders.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune commande enregistrée.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {orders.map((o) => {
                const supplier = suppliers.find((s) => s.id === o.supplier_id);
                return (
                  <li key={o.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {supplier?.name || "Fournisseur inconnu"} —{" "}
                          {formatCurrency(o.total, currency)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {o.items.length} ligne(s) · créée le {formatDate(o.created_at)}
                        </p>
                      </div>
                      {o.status === "received" ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                          Reçue
                        </span>
                      ) : (
                        <button
                          onClick={() => receiveOrder(o.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          Marquer reçue
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {editing && (
        <Modal title={editing.id ? "Modifier le fournisseur" : "Ajouter un fournisseur"} onClose={() => setEditing(null)}>
          <form onSubmit={saveSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldInput label="Nom" required value={editing.name || ""} onChange={(v) => setEditing({ ...editing, name: v })} />
            <FieldInput label="Contact" value={editing.contact_name || ""} onChange={(v) => setEditing({ ...editing, contact_name: v })} />
            <FieldInput label="Téléphone" value={editing.phone || ""} onChange={(v) => setEditing({ ...editing, phone: v })} />
            <FieldInput label="Email" type="email" value={editing.email || ""} onChange={(v) => setEditing({ ...editing, email: v })} />
            <div className="md:col-span-2">
              <FieldInput label="Adresse" value={editing.address || ""} onChange={(v) => setEditing({ ...editing, address: v })} />
            </div>
            <div className="md:col-span-2">
              <FieldInput
                label="Catégories (séparées par des virgules)"
                value={Array.isArray(editing.categories) ? editing.categories.join(", ") : (editing.categories as unknown as string) || ""}
                onChange={(v) => setEditing({ ...editing, categories: v as unknown as string[] })}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50">Annuler</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}

      {orderModal && (
        <Modal title="Nouvelle commande" onClose={() => setOrderModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Sélectionnez les médicaments et quantités. Le stock sera incrémenté à la réception.
            </p>
            <select
              onChange={(e) => {
                const med = medicines.find((m) => m.id === e.target.value);
                if (!med) return;
                if (orderModal.items.find((l) => l.medicine_id === med.id)) return;
                setOrderModal({
                  ...orderModal,
                  items: [
                    ...orderModal.items,
                    {
                      medicine_id: med.id,
                      name: med.name,
                      quantity: 1,
                      unit_cost: med.purchase_price,
                    },
                  ],
                });
                e.target.value = "";
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Ajouter un médicament…
              </option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <ul className="space-y-2">
              {orderModal.items.map((l, i) => (
                <li key={l.medicine_id} className="flex items-center gap-2 p-2 border border-slate-100 rounded-lg">
                  <span className="flex-1 text-sm font-semibold">{l.name}</span>
                  <input
                    type="number"
                    min={1}
                    value={l.quantity}
                    onChange={(e) => {
                      const next = [...orderModal.items];
                      next[i] = { ...l, quantity: Number(e.target.value) };
                      setOrderModal({ ...orderModal, items: next });
                    }}
                    className="w-20 px-2 py-1 rounded border border-slate-200 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={l.unit_cost}
                    onChange={(e) => {
                      const next = [...orderModal.items];
                      next[i] = { ...l, unit_cost: Number(e.target.value) };
                      setOrderModal({ ...orderModal, items: next });
                    }}
                    className="w-28 px-2 py-1 rounded border border-slate-200 text-sm"
                  />
                  <button
                    onClick={() =>
                      setOrderModal({
                        ...orderModal,
                        items: orderModal.items.filter((x) => x.medicine_id !== l.medicine_id),
                      })
                    }
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="font-bold">Total</span>
              <span className="font-bold text-emerald-700">
                {formatCurrency(
                  orderModal.items.reduce((s, l) => s + l.quantity * l.unit_cost, 0),
                  currency
                )}
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOrderModal(null)} className="px-4 py-2 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50">Annuler</button>
              <button
                onClick={submitOrder}
                disabled={orderModal.items.length === 0}
                className="px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black disabled:opacity-60"
              >
                Créer la commande
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 my-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {children}
      </div>
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
