import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#fcfcfc] to-[#e9f7ef]">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="h-10 w-10 rounded-xl bg-[#063b1e] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[#6eff8a]"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-[#063b1e]">Pharma Core</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-[#f0f0f0] p-8">
          <h1 className="text-2xl font-bold text-[#063b1e] mb-1">Connexion</h1>
          <p className="text-sm text-[#71717a] mb-6">
            Accédez à votre tableau de bord Pharma Core.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e] focus:border-transparent"
                placeholder="pharmacien@example.bi"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#3f3f46] mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#e4e4e7] focus:outline-none focus:ring-2 focus:ring-[#063b1e] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#063b1e] text-[#6eff8a] rounded-lg font-bold hover:bg-black disabled:opacity-60 transition-colors"
            >
              {submitting ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p className="text-sm text-center text-[#71717a] mt-6">
            Pas encore de compte ?{" "}
            <Link to="/signup" className="text-[#063b1e] font-semibold hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
