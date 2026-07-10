import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { updatePatientProfile } from "../../services/patientPortal";

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
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteAccount();
      navigate("/");
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Profil"
        subtitle="Vos informations personnelles et médicales de base."
      />

      <div className="max-w-2xl">
        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nom complet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#063b1e] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Téléphone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#063b1e] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Date de naissance
              </label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => set("date_of_birth", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#063b1e] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Genre
              </label>
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#063b1e] text-sm bg-white"
              >
                <option value="">—</option>
                <option value="femme">Femme</option>
                <option value="homme">Homme</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Adresse
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#063b1e] text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Allergies connues
              </label>
              <input
                type="text"
                value={form.allergies}
                onChange={(e) => set("allergies", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#063b1e] text-sm"
                placeholder="Pénicilline, arachides…"
              />
              <p className="text-xs text-slate-400 mt-1">
                Ces informations alimentent votre dossier de santé.
              </p>
            </div>
          </div>

          {error && (
            <p className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </p>
          )}
          {saved && (
            <p className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              Profil mis à jour.
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black disabled:opacity-60 transition-colors"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>

        <div className="mt-6 bg-white rounded-2xl border border-red-200 p-5 md:p-6">
          <h3 className="font-bold text-red-700 mb-1">Zone dangereuse</h3>
          <p className="text-sm text-slate-600 mb-4">
            Supprimer votre compte effacera définitivement votre profil, vos commandes
            et vos messages.
          </p>
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-50"
          >
            Supprimer mon compte
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Supprimer définitivement votre compte ?
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Cette action est irréversible : profil, commandes, évaluations et
              messages seront supprimés.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
