import { useTranslation } from "react-i18next";

// Pulse skeleton placeholders for loading states

export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  const { t } = useTranslation("common");
  return (
    <div className="animate-pulse space-y-3 p-5" role="status" aria-label={t("loadingLabel")}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-200 dark:bg-slate-700 rounded"
          style={{ width: `${85 - (i % 3) * 15}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse space-y-3"
        >
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
          <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-full" />
          <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-4/5" />
          <div className="h-8 bg-slate-100 dark:bg-slate-700/60 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
