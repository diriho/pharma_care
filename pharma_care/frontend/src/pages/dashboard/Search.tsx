import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { DASHBOARD_NAV } from './nav'

// searchable pages: home + the dashboard navigation (single source of truth)
const PAGES = [
  { to: "/", label: "Accueil" },
  ...DASHBOARD_NAV.map(({ to, label }) => ({ to, label })),
];

// State Control: The query state captures the keyboard input in real-time.
function QuerySearch() {
    const [query, setQuery] = useState("");

    // filter pages based on user_input queru
    const filtered = PAGES.filter((page) =>
        page.label.toLowerCase().includes(query.toLowerCase())
    );

    return (
    <div className="relative w-full max-w-lg">
        <div className="flex items-center gap-3 rounded-full bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100 focus-within:ring-2 focus-within:ring-emerald-400 shadow-lg shadow-emerald-100/40 backdrop-blur-sm">
            <SearchIcon className="h-5 w-5 shrink-0 text-emerald-600" />
            <input
            type="text"
            placeholder="Rechercher une page…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
        </div>

        {query && (
            <ul className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            {filtered.length > 0 ? (
                filtered.map((page) => (
                <li key={page.to}>
                    <Link
                    to={page.to}
                    onClick={() => setQuery("")}
                    className="block px-4 py-3 text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                    >
                    Aller à {page.label}
                    </Link>
                </li>
                ))
            ) : (
                <li className="px-4 py-3 text-sm text-red-600 bg-red-50">
                Aucune page trouvée
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
