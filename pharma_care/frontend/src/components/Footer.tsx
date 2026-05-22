export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#f0f0f0] py-10">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[#063b1e] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-[#6eff8a]"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="font-bold text-[#063b1e]">Pharma Core</span>
        </div>
        <p className="text-sm text-[#71717a]">
          © {new Date().getFullYear()} Pharma Core. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
