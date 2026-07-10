import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, UserRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type Field = {
  key: keyof FormState;
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  hint?: string;
};

type FormState = {
  email: string;
  password: string;
  name: string;
  address: string;
  commune: string;
  province: string;
  phone: string;
  currency: string;
  nif: string;
  rc: string;
  expiryAlertMonths: string;
  lowStockAlertLevel: string;
};

const INITIAL: FormState = {
  email: "",
  password: "",
  name: "",
  address: "",
  commune: "",
  province: "",
  phone: "",
  currency: "FBU",
  nif: "",
  rc: "",
  expiryAlertMonths: "6",
  lowStockAlertLevel: "15",
};

const PHARMACY_FIELDS: Field[] = [
  { key: "name", label: "Nom de la pharmacie", required: true, placeholder: "Pharmacie Centrale" },
  { key: "address", label: "Adresse de l'Officine", required: true, placeholder: "Avenue, Quartier" },
  { key: "commune", label: "Commune", required: true, placeholder: "Mukaza" },
  { key: "province", label: "Province", required: true, placeholder: "Bujumbura Mairie" },
  { key: "phone", label: "Téléphone", required: true, placeholder: "+257 22 ..." },
  {
    key: "currency",
    label: "Devise du Système",
    required: true,
    placeholder: "FBU",
    hint: "Par défaut: FBU (Franc burundais)",
  },
  { key: "nif", label: "NIF (N° Identification Fiscale - Burundi)", placeholder: "Optionnel" },
  { key: "rc", label: "RC (Registre du Commerce)", placeholder: "Optionnel" },
  {
    key: "expiryAlertMonths",
    label: "Alerte Péremption Proche (Mois)",
    required: true,
    type: "number",
    placeholder: "6",
  },
  {
    key: "lowStockAlertLevel",
    label: "Seuil d'Alerte de Stock Bas Général",
    required: true,
    type: "number",
    placeholder: "15",
  },
];

type PatientFormState = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  allergies: string;
};

const PATIENT_INITIAL: PatientFormState = {
  email: "",
  password: "",
  fullName: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  allergies: "",
};

export default function Signup() {
  const { signup, signupPatient } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<"pharmacy" | "patient">("pharmacy");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [patientForm, setPatientForm] = useState<PatientFormState>(PATIENT_INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function setPatient<K extends keyof PatientFormState>(
    key: K,
    value: PatientFormState[K]
  ) {
    setPatientForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmitPatient(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signupPatient({
        email: patientForm.email,
        password: patientForm.password,
        profile: {
          fullName: patientForm.fullName.trim(),
          phone: patientForm.phone.trim() || undefined,
          dateOfBirth: patientForm.dateOfBirth || undefined,
          gender: patientForm.gender || undefined,
          address: patientForm.address.trim() || undefined,
          allergies: patientForm.allergies.trim() || undefined,
        },
      });
      navigate("/patient");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({
        email: form.email,
        password: form.password,
        pharmacy: {
          name: form.name.trim(),
          address: form.address.trim(),
          commune: form.commune.trim(),
          province: form.province.trim(),
          phone: form.phone.trim(),
          currency: form.currency.trim() || "FBU",
          nif: form.nif.trim() || undefined,
          rc: form.rc.trim() || undefined,
          expiryAlertMonths: Number(form.expiryAlertMonths),
          lowStockAlertLevel: Number(form.lowStockAlertLevel),
        },
      });
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-12 bg-gradient-to-br from-[#fcfcfc] to-[#e9f7ef]">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="h-10 w-10 rounded-xl bg-[#063b1e] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[#6eff8a]"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-[#063b1e]">Pharma Core</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-[#f0f0f0] p-8">
          <h1 className="text-2xl font-bold text-[#063b1e] mb-1">
            {accountType === "pharmacy" ? "Créer un compte pharmacie" : "Créer un compte patient"}
          </h1>
          <p className="text-sm text-[#71717a] mb-6">
            {accountType === "pharmacy"
              ? "Renseignez les informations de votre officine pour commencer."
              : "Créez votre espace patient pour commander vos médicaments."}
          </p>

          <div className="grid grid-cols-2 gap-2 p-1 mb-6 bg-[#f4f4f5] rounded-xl">
            {(
              [
                { key: "pharmacy", label: "Pharmacie", icon: Building2 },
                { key: "patient", label: "Patient", icon: UserRound },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setAccountType(key);
                  setError(null);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  accountType === key
                    ? "bg-[#063b1e] text-[#6eff8a] shadow"
                    : "text-[#3f3f46] hover:bg-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {accountType === "patient" ? (
            <form onSubmit={onSubmitPatient} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={patientForm.email}
                    onChange={(e) => setPatient("email", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e]"
                    placeholder="patient@example.bi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={patientForm.password}
                    onChange={(e) => setPatient("password", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e]"
                    placeholder="Minimum 6 caractères"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={patientForm.fullName}
                    onChange={(e) => setPatient("fullName", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e]"
                    placeholder="Jean Ndayizeye"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={patientForm.phone}
                    onChange={(e) => setPatient("phone", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e]"
                    placeholder="+257 79 ..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={patientForm.dateOfBirth}
                    onChange={(e) => setPatient("dateOfBirth", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                    Genre
                  </label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) => setPatient("gender", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e] bg-white"
                  >
                    <option value="">—</option>
                    <option value="femme">Femme</option>
                    <option value="homme">Homme</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={patientForm.address}
                    onChange={(e) => setPatient("address", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e]"
                    placeholder="Avenue, Quartier"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                    Allergies connues
                  </label>
                  <input
                    type="text"
                    value={patientForm.allergies}
                    onChange={(e) => setPatient("allergies", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e]"
                    placeholder="Pénicilline, arachides… (optionnel)"
                  />
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black disabled:opacity-60 transition-colors"
              >
                {submitting ? "Création en cours…" : "Créer mon compte patient"}
              </button>
            </form>
          ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e]"
                  placeholder="pharmacien@example.bi"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e]"
                  placeholder="Minimum 6 caractères"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#f0f0f0]">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#063b1e] mt-4 mb-3">
                Informations de l'officine
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PHARMACY_FIELDS.map((f) => (
                  <div key={f.key} className={f.key === "address" ? "md:col-span-2" : ""}>
                    <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                      {f.label}{" "}
                      {f.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={f.type || "text"}
                      required={f.required}
                      value={form[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e]"
                      placeholder={f.placeholder}
                    />
                    {f.hint && (
                      <p className="text-xs text-[#71717a] mt-1">{f.hint}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black disabled:opacity-60 transition-colors"
            >
              {submitting ? "Création en cours…" : "Créer mon compte"}
            </button>
          </form>
          )}

          <p className="text-sm text-center text-[#71717a] mt-6">
            Déjà inscrit ?{" "}
            <Link to="/login" className="text-[#063b1e] font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
