import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { homePathForRole, useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { api } from "../api/client";
import { translateApiError } from "../i18n/apiError";
import { ThemeToggleButton } from "../components/ui/ThemeToggle";
import { LanguageSwitcherButton } from "../components/ui/LanguageSwitcher";

type FinishResponse = {
  role: "patient" | "facility_admin" | null;
  profileComplete: boolean;
};

// Lands here after supabase-js parses the GitHub OAuth redirect's token hash
// (automatic — detectSessionInUrl is on by default) and AuthContext picks up
// the new session. A first-time OAuth sign-in has no role/profile yet, so
// this page assigns one (from ?intent=, set by whichever RoleToggle tab the
// user clicked "Continue with GitHub" from) and routes to /onboarding if a
// profile still needs to be filled in.
export default function OAuthCallback() {
  const { user, loading, refreshPharmacy } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(["auth", "common"]);
  const [error, setError] = useState<string | null>(null);
  const [needsChoice, setNeedsChoice] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const ranRef = useRef(false);

  async function finish(intent?: "patient" | "pharmacy") {
    try {
      const res = await api<FinishResponse>("/auth/oauth/finish", {
        method: "POST",
        body: JSON.stringify({ intent }),
      });
      const role = res.role;
      if (!role) {
        setNeedsChoice(true);
        return;
      }
      setNeedsChoice(false);
      // app_metadata is embedded in the JWT at issuance — refresh so the
      // locally-cached session reflects a role that was just assigned.
      await supabase.auth.refreshSession();
      await refreshPharmacy();
      navigate(res.profileComplete ? homePathForRole(role) : "/onboarding", { replace: true });
    } catch (err) {
      setError(translateApiError(err, t));
    }
  }

  useEffect(() => {
    if (loading || ranRef.current) return;
    if (!user) {
      setError(t("auth:oauth.noSession"));
      return;
    }
    ranRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const intent = params.get("intent");
    void finish(intent === "patient" || intent === "pharmacy" ? intent : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  async function onChoose(intent: "patient" | "pharmacy") {
    setChoosing(true);
    setError(null);
    try {
      await finish(intent);
    } finally {
      setChoosing(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#fcfcfc] to-[#e9f7ef] dark:from-slate-950 dark:to-slate-900">
      <div className="fixed top-4 right-4 flex items-center gap-1">
        <LanguageSwitcherButton />
        <ThemeToggleButton />
      </div>
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#f0f0f0] dark:border-slate-700 p-8 text-center">
        {error ? (
          <>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-[#063b1e] dark:text-[#6eff8a] hover:underline"
            >
              {t("auth:oauth.backToLogin")}
            </button>
          </>
        ) : needsChoice ? (
          <>
            <p className="text-sm text-[#3f3f46] dark:text-slate-300 mb-5">
              {t("auth:oauth.chooseRole")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={choosing}
                onClick={() => onChoose("patient")}
                className="py-2.5 rounded-lg border border-[#e4e4e7] dark:border-slate-600 font-semibold text-sm hover:bg-[#f4f4f5] dark:hover:bg-slate-700 disabled:opacity-60 transition-colors"
              >
                {t("auth:roleToggle.patient")}
              </button>
              <button
                disabled={choosing}
                onClick={() => onChoose("pharmacy")}
                className="py-2.5 rounded-lg border border-[#e4e4e7] dark:border-slate-600 font-semibold text-sm hover:bg-[#f4f4f5] dark:hover:bg-slate-700 disabled:opacity-60 transition-colors"
              >
                {t("auth:roleToggle.pharmacy")}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-[#71717a] dark:text-slate-400">{t("auth:oauth.connecting")}</p>
        )}
      </div>
    </div>
  );
}
