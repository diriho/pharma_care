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
