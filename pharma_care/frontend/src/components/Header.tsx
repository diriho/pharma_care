import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { ThemeToggleButton } from "./ui/ThemeToggle";
import { LanguageSwitcherButton } from "./ui/LanguageSwitcher";

// header component with the app name and navigation links
export default function Header() {
  const { user } = useAuth();
  const { t } = useTranslation("common");

  return (
    <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur bg-white/80 dark:bg-slate-950/80 border-b border-[#f0f0f0] dark:border-slate-800">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-[#063b1e] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[#6eff8a]"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#063b1e] dark:text-[#6eff8a]">
            {t("app.name")}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#52525b] dark:text-slate-400">
          <a href="#services" className="hover:text-[#063b1e] dark:hover:text-[#6eff8a] transition-colors">
            {t("header.services")}
          </a>
          <a href="#features" className="hover:text-[#063b1e] dark:hover:text-[#6eff8a] transition-colors">
            {t("header.features")}
          </a>
          <a href="#contact" className="hover:text-[#063b1e] dark:hover:text-[#6eff8a] transition-colors">
            {t("header.contact")}
          </a>
        </nav>

        <div className="flex items-center gap-1">
          <LanguageSwitcherButton />
          <ThemeToggleButton />
          {user ? (
            <Link
              to="/dashboard"
              className="ml-2 px-5 py-2 rounded-full bg-[#063b1e] text-[#6eff8a] font-semibold text-sm hover:bg-black transition-colors"
            >
              {t("header.dashboard")}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="ml-2 px-4 py-2 rounded-full text-sm font-semibold text-[#063b1e] dark:text-[#6eff8a] hover:bg-[#f4f4f5] dark:hover:bg-slate-800 transition-colors"
              >
                {t("header.login")}
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2 rounded-full bg-[#063b1e] text-[#6eff8a] font-semibold text-sm shadow-sm hover:bg-black transition-colors"
              >
                {t("header.signup")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
