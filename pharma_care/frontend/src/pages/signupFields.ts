import type { TFunction } from "i18next";

// Field metadata shared between the full Signup form and the post-OAuth
// CompleteProfile form (same pharmacy/patient fields, minus email/password).

export type PharmacyFormState = {
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

export const PHARMACY_INITIAL: PharmacyFormState = {
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

export type PharmacyField = {
  key: keyof PharmacyFormState;
  labelKey: string;
  required?: boolean;
  type?: string;
  placeholderKey?: string;
  hintKey?: string;
};

export const PHARMACY_FIELDS: PharmacyField[] = [
  { key: "name", labelKey: "fields.pharmacyName", required: true, placeholderKey: "fields.pharmacyNamePlaceholder" },
  { key: "address", labelKey: "fields.address", required: true, placeholderKey: "fields.addressPlaceholder" },
  { key: "commune", labelKey: "fields.commune", required: true, placeholderKey: "fields.communePlaceholder" },
  { key: "province", labelKey: "fields.province", required: true, placeholderKey: "fields.provincePlaceholder" },
  { key: "phone", labelKey: "fields.phone", required: true, placeholderKey: "fields.phonePlaceholder" },
  {
    key: "currency",
    labelKey: "fields.currency",
    required: true,
    placeholderKey: "fields.currencyPlaceholder",
    hintKey: "fields.currencyHint",
  },
  { key: "nif", labelKey: "fields.nif", placeholderKey: "fields.optionalPlaceholder" },
  { key: "rc", labelKey: "fields.rc", placeholderKey: "fields.optionalPlaceholder" },
  { key: "expiryAlertMonths", labelKey: "fields.expiryAlertMonths", required: true, type: "number" },
  { key: "lowStockAlertLevel", labelKey: "fields.lowStockAlertLevel", required: true, type: "number" },
];

export type PatientFormFields = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  allergies: string;
};

export const PATIENT_FIELDS_INITIAL: PatientFormFields = {
  fullName: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  allergies: "",
};

export const INPUT_CLASS =
  "w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] dark:border-slate-600 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#063b1e] dark:focus:ring-[#6eff8a]";
export const LABEL_CLASS = "block text-sm font-semibold text-[#3f3f46] dark:text-slate-300 mb-1.5";

export function fieldLabel(t: TFunction, key: string) {
  return t(`auth:${key}`);
}
