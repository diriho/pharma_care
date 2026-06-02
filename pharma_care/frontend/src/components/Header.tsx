import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// header component with the app name and navigation links
export default function Header() {
  const { user } = useAuth();
  return (
    <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur bg-white/80 border-b border-[#f0f0f0]">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-[#063b1e] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[#6eff8a]"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#063b1e]">
            Pharma Core
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#52525b]">
          <a href="#services" className="hover:text-[#063b1e] transition-colors">
            Services
          </a>
          <a href="#features" className="hover:text-[#063b1e] transition-colors">
            Fonctionnalités
          </a>
          <a href="#contact" className="hover:text-[#063b1e] transition-colors">
            Contact
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="px-5 py-2 rounded-full bg-[#063b1e] text-[#6eff8a] font-semibold text-sm hover:bg-black transition-colors"
            >
              Tableau de bord
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-full text-sm font-semibold text-[#063b1e] hover:bg-[#f4f4f5] transition-colors"
              >
                Se connecter
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2 rounded-full bg-[#063b1e] text-[#6eff8a] font-semibold text-sm shadow-sm hover:bg-black transition-colors"
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
