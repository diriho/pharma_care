import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";

// Icon-only toggle for layout headers.
export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation("common");
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t("theme.light") : t("theme.dark")}
      title={isDark ? t("theme.light") : t("theme.dark")}
      className={`h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${className}`}
    >
      {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </button>
  );
}

// Labeled light/dark segmented control for settings/preferences pages.
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation("common");
  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-900">
      {(["light", "dark"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setTheme(option)}
          aria-pressed={theme === option}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            theme === option
              ? "bg-white dark:bg-slate-700 text-[#063b1e] dark:text-[#6eff8a] shadow"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {option === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {t(`theme.${option}`)}
        </button>
      ))}
    </div>
  );
}
