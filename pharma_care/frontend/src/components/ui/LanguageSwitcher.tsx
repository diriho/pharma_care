import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
] as const;

// Icon-only switch for layout headers.
export function LanguageSwitcherButton({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("en") ? "en" : "fr";
  const next = current === "fr" ? "en" : "fr";
  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      aria-label={next === "en" ? "Switch to English" : "Passer en français"}
      title={next === "en" ? "Switch to English" : "Passer en français"}
      className={`h-9 px-2.5 flex items-center gap-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold ${className}`}
    >
      <Languages className="h-4 w-4" />
      {current.toUpperCase()}
    </button>
  );
}

// Labeled segmented control for settings/preferences pages.
export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("en") ? "en" : "fr";
  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-900">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => i18n.changeLanguage(lang.code)}
          aria-pressed={current === lang.code}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            current === lang.code
              ? "bg-white dark:bg-slate-700 text-[#063b1e] dark:text-[#6eff8a] shadow"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
