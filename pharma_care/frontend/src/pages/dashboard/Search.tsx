import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DASHBOARD_NAV } from './nav'

// State Control: The query state captures the keyboard input in real-time.
function QuerySearch() {
    const { t } = useTranslation("dashboard");
    const [query, setQuery] = useState("");

    // searchable pages: home + the dashboard navigation (single source of truth)
    const pages = [
      { to: "/", label: t("search.home") },
      ...DASHBOARD_NAV.map(({ to, labelKey }) => ({ to, label: t(labelKey) })),
    ];

    // filter pages based on user_input queru
    const filtered = pages.filter((page) =>
        page.label.toLowerCase().includes(query.toLowerCase())
    );

    return (
    <div className="relative w-full max-w-lg">
        <div className="flex items-center gap-3 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 ring-1 ring-emerald-100 dark:ring-emerald-900 focus-within:ring-2 focus-within:ring-emerald-400 shadow-lg shadow-emerald-100/40 dark:shadow-none backdrop-blur-sm">
            <SearchIcon className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <input
            type="text"
            placeholder={t("search.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
        </div>

        {query && (
            <ul className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
            {filtered.length > 0 ? (
                filtered.map((page) => (
                <li key={page.to}>
                    <Link
                    to={page.to}
                    onClick={() => setQuery("")}
                    className="block px-4 py-3 text-sm text-slate-700 dark:text-slate-300 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400"
                    >
                    {t("search.goTo", { page: page.label })}
                    </Link>
                </li>
                ))
            ) : (
                <li className="px-4 py-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40">
                {t("search.noResults")}
                </li>
            )}
            </ul>
        )}
    </div>
  )
}

//Dynamic Linking:
export default function Search() {
  return <QuerySearch />
}
