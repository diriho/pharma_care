import { useEffect, useMemo, useState } from "react";
import { Plus, Minus, Trash2, Receipt } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../lib/format";
import PageHeader from "../../components/PageHeader";

type Medicine = {
  id: string;
  name: string;
  dosage: string | null;
  stock: number;
  selling_price: number;
};
type Patient = { id: string; full_name: string };
type Line = { medicine_id: string; name: string; quantity: number; unit_price: number };

export default function Pos() {
  const { pharmacy } = useAuth();
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [cart, setCart] = useState<Line[]>([]);
  const [patientId, setPatientId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [m, p] = await Promise.all([
        api<Medicine[]>("/data/medicines"),
        api<Patient[]>("/data/patients"),
      ]);
      setMeds(m);
      setPatients(p);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      meds
        .filter((m) => m.stock > 0)
        .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 20),
    [meds, query]
  );

  function addToCart(m: Medicine) {
    setCart((prev) => {
      const existing = prev.find((l) => l.medicine_id === m.id);
      if (existing) {
        if (existing.quantity >= m.stock) return prev;
        return prev.map((l) =>
          l.medicine_id === m.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        { medicine_id: m.id, name: m.name, quantity: 1, unit_price: m.selling_price },
      ];
    });
  }

  function setQty(id: string, qty: number) {
    const med = meds.find((m) => m.id === id);
    const max = med?.stock ?? qty;
    const clamped = Math.max(0, Math.min(qty, max));
    if (clamped === 0) {
      setCart((prev) => prev.filter((l) => l.medicine_id !== id));
    } else {
      setCart((prev) =>
        prev.map((l) => (l.medicine_id === id ? { ...l, quantity: clamped } : l))
      );
    }
  }

  const total = cart.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  async function checkout() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      await api("/data/sales/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((l) => ({
            medicine_id: l.medicine_id,
            name: l.name,
            quantity: l.quantity,
            unit_price: l.unit_price,
          })),
          patient_id: patientId || null,
          total,
          payment_method: paymentMethod,
        }),
      });
      setConfirmation(`Vente enregistrée — ${formatCurrency(total, pharmacy?.currency)}`);
      setCart([]);
      setPatientId("");
      await load();
      setTimeout(() => setConfirmation(null), 4000);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const currency = pharmacy?.currency || "FBU";

  return (
    <div>
      <PageHeader
        title="Point de Vente"
        subtitle="Enregistrez les ventes en quelques clics. Le stock est mis à jour automatiquement."
      />
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-3">
          <span>Erreur de chargement : {error}</span>
          <button onClick={load} className="ml-auto underline font-semibold">
            Réessayer
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4">
          <input
            type="search"
            placeholder="Rechercher un médicament…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 mb-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => addToCart(m)}
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
              >
                <div className="font-semibold text-slate-900 text-sm">{m.name}</div>
                <div className="text-xs text-slate-500">{m.dosage}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Stock: {m.stock}</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {formatCurrency(m.selling_price, currency)}
                  </span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-sm text-slate-500 py-4">
                Aucun médicament en stock pour cette recherche.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Panier ({cart.length})
          </h3>
          <div className="flex-1 overflow-y-auto -mx-2 px-2">
            {cart.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun article.</p>
            ) : (
              <ul className="space-y-2">
                {cart.map((l) => (
                  <li
                    key={l.medicine_id}
                    className="p-2 rounded-lg border border-slate-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">
                        {l.name}
                      </div>
                      <button
                        onClick={() => setQty(l.medicine_id, 0)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setQty(l.medicine_id, l.quantity - 1)}
                          className="p-1 rounded border border-slate-200 hover:bg-slate-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-semibold text-sm w-6 text-center">
                          {l.quantity}
                        </span>
                        <button
                          onClick={() => setQty(l.medicine_id, l.quantity + 1)}
                          className="p-1 rounded border border-slate-200 hover:bg-slate-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(l.quantity * l.unit_price, currency)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
            <label className="block text-xs font-semibold text-slate-600">
              Patient (optionnel)
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200"
              >
                <option value="">Client de passage</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Paiement
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200"
              >
                <option value="cash">Espèces</option>
                <option value="mobile">Mobile Money</option>
                <option value="card">Carte</option>
                <option value="insurance">Assurance</option>
              </select>
            </label>
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-emerald-700">
                {formatCurrency(total, currency)}
              </span>
            </div>
            <button
              disabled={cart.length === 0 || submitting}
              onClick={checkout}
              className="w-full py-3 rounded-lg bg-[#063b1e] text-[#6eff8a] font-bold hover:bg-black disabled:opacity-60"
            >
              {submitting ? "Enregistrement…" : "Valider la vente"}
            </button>
            {confirmation && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                {confirmation}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
