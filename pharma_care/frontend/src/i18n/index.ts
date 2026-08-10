import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import commonEn from "./locales/en/common.json";
import commonFr from "./locales/fr/common.json";
import authEn from "./locales/en/auth.json";
import authFr from "./locales/fr/auth.json";
import settingsEn from "./locales/en/settings.json";
import settingsFr from "./locales/fr/settings.json";
import notificationsEn from "./locales/en/notifications.json";
import notificationsFr from "./locales/fr/notifications.json";
import dashboardEn from "./locales/en/dashboard.json";
import dashboardFr from "./locales/fr/dashboard.json";
import patientEn from "./locales/en/patient.json";
import patientFr from "./locales/fr/patient.json";

// Keep in sync with any storage-key assumptions elsewhere (ThemeContext uses
// its own separate key — language and theme are independent preferences).
const STORAGE_KEY = "pharma-core-language";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        auth: authEn,
        settings: settingsEn,
        notifications: notificationsEn,
        dashboard: dashboardEn,
        patient: patientEn,
      },
      fr: {
        common: commonFr,
        auth: authFr,
        settings: settingsFr,
        notifications: notificationsFr,
        dashboard: dashboardFr,
        patient: patientFr,
      },
    },
    ns: ["common", "auth", "settings", "notifications", "dashboard", "patient"],
    defaultNS: "common",
    // The app has always been French-first (Burundi market); fall back to
    // French rather than i18next's default "en" when detection is inconclusive.
    fallbackLng: "fr",
    supportedLngs: ["en", "fr"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export default i18n;
