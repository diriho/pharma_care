import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { homePathForRole, useAuth } from "../contexts/AuthContext";
import RoleToggle, { type AccountType } from "../components/ui/RoleToggle";
import { translateApiError } from "../i18n/apiError";
import { ThemeToggleButton } from "../components/ui/ThemeToggle";
import { LanguageSwitcherButton } from "../components/ui/LanguageSwitcher";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(["auth", "common"]);
  const [accountType, setAccountType] = useState<AccountType>("pharmacy");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const role = await login(
        email,
        password,
        accountType === "patient" ? "patient" : "facility_admin"
      );
      navigate(homePathForRole(role));
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#fcfcfc] to-[#e9f7ef] dark:from-slate-950 dark:to-slate-900">
      <div className="fixed top-4 right-4 flex items-center gap-1">
        <LanguageSwitcherButton />
        <ThemeToggleButton />
      </div>
      <div className="w-full max-w-md">
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
          <span className="text-2xl font-bold text-[#063b1e] dark:text-[#6eff8a]">
            {t("common:app.name")}
          </span>
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#f0f0f0] dark:border-slate-700 p-8">
          <h1 className="text-2xl font-bold text-[#063b1e] dark:text-[#6eff8a] mb-1">
            {t("auth:login.title")}
          </h1>
          <p className="text-sm text-[#71717a] dark:text-slate-400 mb-6">
            {accountType === "pharmacy"
              ? t("auth:login.subtitlePharmacy")
              : t("auth:login.subtitlePatient")}
          </p>

          <RoleToggle
            value={accountType}
            onChange={(v) => {
              setAccountType(v);
              setError(null);
            }}
          />

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#3f3f46] dark:text-slate-300 mb-1.5">
                {t("auth:login.email")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] dark:border-slate-600 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#063b1e] dark:focus:ring-[#6eff8a] focus:border-transparent"
                placeholder={
                  accountType === "pharmacy"
                    ? t("auth:login.emailPlaceholderPharmacy")
                    : t("auth:login.emailPlaceholderPatient")
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#3f3f46] dark:text-slate-300 mb-1.5">
                {t("auth:login.password")}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] dark:border-slate-600 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#063b1e] dark:focus:ring-[#6eff8a] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black dark:hover:bg-slate-950 disabled:opacity-60 transition-colors"
            >
              {submitting ? t("auth:login.submitting") : t("auth:login.submit")}
            </button>
          </form>

          <p className="text-sm text-center text-[#71717a] dark:text-slate-400 mt-6">
            {t("auth:login.noAccount")}{" "}
            <Link to="/signup" className="text-[#063b1e] dark:text-[#6eff8a] font-semibold hover:underline">
              {t("auth:login.signUpLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
