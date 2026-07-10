import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FileText, Minus, Plus, ShoppingBag, Trash2, Upload, X } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonLines } from "../../components/ui/Skeleton";
import OrderStatusBadge from "../../components/ui/OrderStatusBadge";
import {
  cancelOrder,
  createOrder,
  getOrderPrescriptionUrl,
  getOrders,
  getPharmacies,
  getPharmacyMedicines,
} from "../../services/patientPortal";
import type {
  MedicationOrder,
  PharmacyMedicine,
  PharmacySummary,
} from "../../types/patient";
import { formatCurrency, formatDate } from "../../lib/format";

type LocationState = {
  pharmacyUserId?: string;
  medicineId?: string;
  openForm?: boolean;
} | null;

type CartLine = { medicine: PharmacyMedicine; quantity: number };

export default function Orders() {
  const state = (useLocation().state || null) as LocationState;
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(Boolean(state?.openForm));

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setOrders(await getOrders());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(id: string) {
    if (!confirm("Annuler cette commande ?")) return;
    try {
      await cancelOrder(id);
      await load();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function openPrescription(id: string) {
    try {
      const { url } = await getOrderPrescriptionUrl(id);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Mes Commandes"
        subtitle="Commandez vos médicaments et suivez leur préparation."
        action={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black"
          >
            <Plus className="h-4 w-4" /> Nouvelle commande
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <SkeletonLines lines={5} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title="Aucune commande"
            hint="Créez votre première commande auprès d'une pharmacie proche."
            action={
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] text-sm font-semibold hover:bg-black"
              >
                <Plus className="h-4 w-4" /> Nouvelle commande
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.map((o) => (
              <li key={o.id} className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">{o.pharmacy_name}</p>
                      <OrderStatusBadge status={o.status} />
                      {o.prescription_path && (
                        <button
                          onClick={() => openPrescription(o.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" /> Voir l'ordonnance
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(o.created_at)} —{" "}
                      {o.items.length > 0
                        ? o.items
                            .map((it) => `${it.name || "Article"} ×${it.quantity}`)
                            .join(", ")
                        : "Sur ordonnance"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(o.total)}
                    </span>
                    {["pending", "approved"].includes(o.status) && (
                      <button
                        onClick={() => handleCancel(o.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Annuler
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm && (
        <NewOrderModal
          initialPharmacyId={state?.pharmacyUserId}
          initialMedicineId={state?.medicineId}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function NewOrderModal({
  initialPharmacyId,
  initialMedicineId,
  onClose,
  onCreated,
}: {
  initialPharmacyId?: string;
  initialMedicineId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [pharmacies, setPharmacies] = useState<PharmacySummary[]>([]);
  const [pharmacyId, setPharmacyId] = useState(initialPharmacyId || "");
  const [medicines, setMedicines] = useState<PharmacyMedicine[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState("");
  const [prescription, setPrescription] = useState<{
    base64: string;
    filename: string;
    contentType: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPharmacies()
      .then(setPharmacies)
      .catch((err) => setError((err as Error).message));
  }, []);

  useEffect(() => {
    setCart([]);
    if (!pharmacyId) {
      setMedicines([]);
      return;
    }
    getPharmacyMedicines(pharmacyId)
      .then((meds) => {
        setMedicines(meds);
        if (initialMedicineId) {
          const preselected = meds.find((m) => m.id === initialMedicineId);
          if (preselected && preselected.stock > 0) {
            setCart([{ medicine: preselected, quantity: 1 }]);
          }
        }
      })
      .catch((err) => setError((err as Error).message));
  }, [pharmacyId, initialMedicineId]);

  const total = useMemo(
    () =>
      cart.reduce((sum, l) => sum + l.quantity * (l.medicine.selling_price || 0), 0),
    [cart]
  );

  function addToCart(medicine: PharmacyMedicine) {
    setCart((c) =>
      c.some((l) => l.medicine.id === medicine.id)
        ? c
        : [...c, { medicine, quantity: 1 }]
    );
  }

  function setQuantity(medicineId: string, quantity: number) {
    setCart((c) =>
      quantity <= 0
        ? c.filter((l) => l.medicine.id !== medicineId)
        : c.map((l) =>
            l.medicine.id === medicineId
              ? { ...l, quantity: Math.min(quantity, l.medicine.stock) }
              : l
          )
    );
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("L'ordonnance ne doit pas dépasser 4 Mo");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setPrescription({
        base64: String(reader.result),
        filename: file.name,
        contentType: file.type || "application/octet-stream",
      });
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pharmacyId) {
      setError("Choisissez une pharmacie");
      return;
    }
    if (cart.length === 0 && !prescription) {
      setError("Ajoutez des médicaments ou joignez une ordonnance");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createOrder({
        pharmacyUserId: pharmacyId,
        items: cart.map((l) => ({ medicine_id: l.medicine.id, quantity: l.quantity })),
        notes: notes.trim() || undefined,
        prescription: prescription || undefined,
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const available = medicines.filter(
    (m) => m.stock > 0 && !cart.some((l) => l.medicine.id === m.id)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Nouvelle commande</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Fermer"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-4 overflow-y-auto space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Pharmacie <span className="text-red-500">*</span>
            </label>
            <select
              value={pharmacyId}
              onChange={(e) => setPharmacyId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#063b1e] text-sm bg-white"
              required
            >
              <option value="">— Choisir une pharmacie —</option>
              {pharmacies.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.name} ({p.commune})
                </option>
              ))}
            </select>
          </div>

          {pharmacyId && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Ajouter des médicaments
                </label>
                {available.length === 0 && cart.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Aucun médicament disponible dans cette pharmacie.
                  </p>
                ) : (
                  <select
                    value=""
                    onChange={(e) => {
                      const med = medicines.find((m) => m.id === e.target.value);
                      if (med) addToCart(med);
                    }}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#063b1e] text-sm bg-white"
                  >
                    <option value="">— Sélectionner un médicament —</option>
                    {available.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.dosage ? `· ${m.dosage}` : ""} —{" "}
                        {formatCurrency(m.selling_price)} ({m.stock} en stock)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {cart.length > 0 && (
                <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl px-4">
                  {cart.map((l) => (
                    <li
                      key={l.medicine.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {l.medicine.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(l.medicine.selling_price)} / unité
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setQuantity(l.medicine.id, l.quantity - 1)}
                          className="p-1 rounded border border-slate-200 hover:bg-slate-50"
                          aria-label="Réduire la quantité"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-sm font-bold text-slate-900 w-6 text-center">
                          {l.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(l.medicine.id, l.quantity + 1)}
                          className="p-1 rounded border border-slate-200 hover:bg-slate-50"
                          aria-label="Augmenter la quantité"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuantity(l.medicine.id, 0)}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                          aria-label="Retirer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Ordonnance (photo ou PDF)
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-slate-300 text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
              <Upload className="h-4 w-4 shrink-0" />
              {prescription ? prescription.filename : "Téléverser une ordonnance (optionnel)"}
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Notes pour la pharmacie
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#063b1e] text-sm"
              placeholder="Précisions, urgence… (optionnel)"
            />
          </div>

          {error && (
            <p className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <p className="text-sm text-slate-600">
              Total estimé :{" "}
              <span className="font-bold text-slate-900">{formatCurrency(total)}</span>
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black disabled:opacity-60 transition-colors"
            >
              {submitting ? "Envoi…" : "Passer la commande"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
