import type { TFunction } from "i18next";
import { ApiError } from "../api/client";

// Best-effort mapping for the backend's older, non-coded error strings (data
// routes that haven't been migrated to the `code` pattern yet — see
// backend/supabase/auth/routes.ts's authError for the coded ones). Anything
// not listed here falls back to the raw server message so nothing is hidden,
// just not translated.
const KNOWN_MESSAGES: Record<string, string> = {
  "Email et mot de passe requis": "errors.MISSING_CREDENTIALS",
  "Nom complet requis": "errors.nameRequired",
  "Statut invalide": "errors.invalidStatus",
  "Commande introuvable": "errors.notFound",
};

// Resolve a caught API error to a translated, user-safe message. Prefers the
// backend's stable `code` (auth routes) over string-matching, and never
// surfaces raw internal error text that wasn't intended for display.
export function translateApiError(err: unknown, t: TFunction): string {
  if (err instanceof ApiError) {
    if (err.code) {
      const key = `errors.${err.code}`;
      const translated = t(key, { defaultValue: "" });
      if (translated) return translated;
    }
    const mapped = KNOWN_MESSAGES[err.message];
    if (mapped) {
      const translated = t(mapped, { defaultValue: "" });
      if (translated) return translated;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : t("errors.generic");
}
