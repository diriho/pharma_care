import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FileText, Minus, Plus, ShoppingBag, Trash2, Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { translateApiError } from "../../i18n/apiError";

type LocationState = {
  pharmacyUserId?: string;
  medicineId?: string;
  openForm?: boolean;
} | null;

type CartLine = { medicine: PharmacyMedicine; quantity: number };

export default function Orders() {
  const state = (useLocation().state || null) as LocationState;
  const { t } = useTranslation(["patient", "common"]);
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
      setError(translateApiError(err, t));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel(id: string) {
    if (!confirm(t("patient:orders.confirmCancel"))) return;
    try {
      await cancelOrder(id);
      await load();
    } catch (err) {
      alert(translateApiError(err, t));
    }
  }

  async function openPrescription(id: string) {
    try {
      const { url } = await getOrderPrescriptionUrl(id);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      alert(translateApiError(err, t));
    }
  }

  return (
    <div>
      <PageHeader
        title={t("patient:orders.title")}
        subtitle={t("patient:orders.subtitle")}
        action={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] font-semibold hover:bg-black"
          >
            <Plus className="h-4 w-4" /> {t("patient:orders.newOrder")}
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <SkeletonLines lines={5} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title={t("patient:orders.emptyTitle")}
            hint={t("patient:orders.emptyHint")}
            action={
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#063b1e] text-[#6eff8a] text-sm font-semibold hover:bg-black"
              >
                <Plus className="h-4 w-4" /> {t("patient:orders.newOrder")}
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {orders.map((o) => {
              const itemsText =
                o.items.length > 0
                  ? o.items
                      .map((it) => `${it.name || t("patient:orders.item")} ×${it.quantity}`)
                      .join(", ")
                  : t("patient:orders.prescriptionOnly");
              return (
                <li key={o.id} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {o.pharmacy_name}
                        </p>
                        <OrderStatusBadge status={o.status} />
                        {o.prescription_path && (
                          <button
                            onClick={() => openPrescription(o.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" /> {t("patient:orders.viewPrescription")}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t("patient:orders.summaryLine", {
                          date: formatDate(o.created_at),
                          items: itemsText,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(o.total)}
                      </span>
                      {["pending", "approved"].includes(o.status) && (
                        <button
                          onClick={() => handleCancel(o.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t("common:buttons.cancel")}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
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
  const { t } = useTranslation(["patient", "common"]);
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
      .catch((err) => setError(translateApiError(err, t)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      .catch((err) => setError(translateApiError(err, t)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError(t("patient:orders.fileTooLarge"));
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
      setError(t("patient:orders.pharmacyRequired"));
      return;
    }
    if (cart.length === 0 && !prescription) {
      setError(t("patient:orders.itemsOrPrescriptionRequired"));
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
      setError(translateApiError(err, t));
      setSubmitting(false);
    }
  }

  const available = medicines.filter(
    (m) => m.stock > 0 && !cart.some((l) => l.medicine.id === m.id)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t("patient:orders.newOrder")}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label={t("common:buttons.close")}
          >
            <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-4 overflow-y-auto space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t("patient:orders.pharmacyLabel")} <span className="text-red-500">*</span>
            </label>
            <select
              value={pharmacyId}
              onChange={(e) => setPharmacyId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#063b1e] dark:focus:ring-[#6eff8a] text-sm"
              required
            >
              <option value="">{t("patient:orders.choosePharmacyOption")}</option>
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
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t("patient:orders.addMedicines")}
                </label>
                {available.length === 0 && cart.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("patient:orders.noMedicinesAvailable")}
                  </p>
                ) : (
                  <select
                    value=""
                    onChange={(e) => {
                      const med = medicines.find((m) => m.id === e.target.value);
                      if (med) addToCart(med);
                    }}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#063b1e] dark:focus:ring-[#6eff8a] text-sm"
                  >
                    <option value="">{t("patient:orders.selectMedicineOption")}</option>
                    {available.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.dosage ? `· ${m.dosage}` : ""} —{" "}
                        {formatCurrency(m.selling_price)} ({t("patient:orders.inStockCount", { count: m.stock })})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {cart.length > 0 && (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-100 dark:border-slate-700 rounded-xl px-4">
                  {cart.map((l) => (
                    <li
                      key={l.medicine.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {l.medicine.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("patient:orders.pricePerUnit", { price: formatCurrency(l.medicine.selling_price) })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setQuantity(l.medicine.id, l.quantity - 1)}
                          className="p-1 rounded border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                          aria-label={t("patient:orders.decreaseQty")}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 w-6 text-center">
                          {l.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(l.medicine.id, l.quantity + 1)}
                          className="p-1 rounded border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                          aria-label={t("patient:orders.increaseQty")}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuantity(l.medicine.id, 0)}
                          className="p-1 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                          aria-label={t("patient:orders.remove")}
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
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t("patient:orders.prescriptionLabel")}
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60">
              <Upload className="h-4 w-4 shrink-0" />
              {prescription ? prescription.filename : t("patient:orders.uploadPlaceholder")}
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t("patient:orders.notesLabel")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#063b1e] dark:focus:ring-[#6eff8a] text-sm"
              placeholder={t("patient:orders.notesPlaceholder")}
            />
          </div>

          {error && (
            <p className="px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t("patient:orders.estimatedTotal")}{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(total)}</span>
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black disabled:opacity-60 transition-colors"
            >
              {submitting ? t("patient:orders.submitting") : t("patient:orders.placeOrder")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
