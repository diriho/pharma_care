import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'

const NAV = [
    { id: 1, to: "/", label: "Accueil" },
    { id: 2, to: "/dashboard", label: "Tableau de Bord" },
    { id: 3, to: "/dashboard/pos", label: "Caisse (POS)"},
    { id: 4, to: "/dashboard/inventory", label: "Inventaire Médicaments"},
    { id: 5, to: "/dashboard/patients", label: "Patients & Clients"},
    { id: 6, to: "/dashboard/suppliers", label: "Fournisseurs"},
    { id: 7, to: "/dashboard/analytics", label: "Analyses"},
    { id: 8, to: "/dashboard/settings", label: "Profile"},
];

// State Control: The query state captures the keyboard input in real-time.
function QuerySearch() { 
    const [query, setQuery] = useState("");

    // filter pages based on user_input queru
    const filtered = NAV.filter((page) =>
        page.label.toLowerCase().includes(query.toLowerCase())
    );

    return (
    <div style={{ width: '500px' }} className="relative">
        <div className="flex items-center gap-3 rounded-full bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100 focus-within:ring-2 focus-within:ring-emerald-400 shadow-lg shadow-emerald-100/40 backdrop-blur-sm">
            <SearchIcon className="h-5 w-5 shrink-0 text-emerald-600" />
            <input
            type="text"
            placeholder="Type to search pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
        </div>

        {query && (
            <ul className="mt-3 space-y-2">
            {filtered.length > 0 ? (
                filtered.map((page) => (
                <li key={page.id}>
                    <Link
                    to={page.to}
                    className="block rounded-xl px-4 py-3 text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                    >
                    Go to {page.label}
                    </Link>
                </li>
                ))
            ) : (
                <li className="rounded-xl px-4 py-3 text-sm text-red-600 bg-red-50">
                No matching pages found
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
