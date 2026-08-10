import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

// Star display + optional interactive selection (onChange makes it editable)
export default function StarRating({
  value,
  onChange,
  size = "sm",
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "lg";
}) {
  const { t } = useTranslation("common");
  const dim = size === "lg" ? "h-7 w-7" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5" role={onChange ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        const cls = `${dim} ${filled ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"}`;
        if (!onChange) return <Star key={star} className={cls} />;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === Math.round(value)}
            aria-label={t("starRating.starLabel", { count: star })}
            onClick={() => onChange(star)}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <Star className={cls} />
          </button>
        );
      })}
    </div>
  );
}
