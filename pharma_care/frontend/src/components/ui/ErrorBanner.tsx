import { useTranslation } from "react-i18next";

// Standard inline error banner with optional retry, matching the app's styling
export default function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
      <span>{t("errorBanner.prefix", { message })}</span>
      {onRetry && (
        <button onClick={onRetry} className="ml-auto underline font-semibold">
          {t("buttons.retry")}
        </button>
      )}
    </div>
  );
}
