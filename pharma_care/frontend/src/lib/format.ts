export function formatCurrency(value: number, currency = "FBU") {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString("fr-FR")} ${currency}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("fr-FR");
  } catch {
    return value;
  }
}

// Compact day/month label for chart axes and tooltips (e.g. "12 sept." / "Sep 12").
// Pass the active i18next language so it follows the language switcher instead of staying French.
export function formatShortDate(value: string, language?: string) {
  const locale = language?.startsWith("en") ? "en-US" : "fr-FR";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
  } catch {
    return value;
  }
}
