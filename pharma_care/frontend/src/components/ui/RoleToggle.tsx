import { Building2, UserRound } from "lucide-react";

export type AccountType = "pharmacy" | "patient";

// Pharmacie / Patient segmented control shared by the login and signup pages
export default function RoleToggle({
  value,
  onChange,
}: {
  value: AccountType;
  onChange: (value: AccountType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 p-1 mb-6 bg-[#f4f4f5] rounded-xl">
      {(
        [
          { key: "pharmacy", label: "Pharmacie", icon: Building2 },
          { key: "patient", label: "Patient", icon: UserRound },
        ] as const
      ).map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            value === key
              ? "bg-[#063b1e] text-[#6eff8a] shadow"
              : "text-[#3f3f46] hover:bg-white"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
