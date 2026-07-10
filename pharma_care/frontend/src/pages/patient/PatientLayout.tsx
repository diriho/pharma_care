import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Search,
  ShoppingBag,
  MessageSquare,
  Bell,
  ClipboardList,
  FolderHeart,
  UserRound,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { getNotifications } from "../../services/patientPortal";
import { useRealtimeTable } from "../../hooks/useRealtimeTable";
import type { PatientNotification } from "../../types/patient";

// patient portal navigation
const NAV = [
  { to: "/patient/dashboard", label: "Tableau de Bord", icon: LayoutDashboard },
  { to: "/patient/pharmacies", label: "Pharmacies à Proximité", icon: MapPin },
  { to: "/patient/find-medication", label: "Trouver un Médicament", icon: Search },
  { to: "/patient/orders", label: "Mes Commandes", icon: ShoppingBag },
  { to: "/patient/messages", label: "Messages", icon: MessageSquare },
  { to: "/patient/history", label: "Historique Médical", icon: ClipboardList },
  { to: "/patient/health-records", label: "Dossier de Santé", icon: FolderHeart },
  { to: "/patient/profile", label: "Profil", icon: UserRound },
];

// patient portal shell: sidebar (desktop), top nav (mobile), notification bell
export default function PatientLayout() {
  const { patientProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const data = await getNotifications();
      setUnread(data.unread);
    } catch {
      // session may be expiring — ignore
    }
  }, []);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  // Live unread badge: new notifications and read-state changes arrive via
  // Realtime (RLS only delivers this user's rows), no polling needed.
  useRealtimeTable<PatientNotification>({
    table: "notifications",
    events: ["INSERT", "UPDATE"],
    onChange: refreshUnread,
    onResync: refreshUnread,
  });

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-900 text-slate-300 shrink-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800 bg-slate-950">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div>
            <Link to="/">
              <h1 className="text-lg font-bold text-white tracking-tight">Pharma Core</h1>
            </Link>
            <p className="text-xs text-emerald-400 font-medium">Espace Patient</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-md"
                      : "hover:bg-slate-800/60 hover:text-slate-100"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {patientProfile?.full_name || "Patient"}
            </p>
            <p className="text-xs text-slate-500 hidden sm:block">Espace Patient</p>
          </div>
          <div className="flex items-center gap-2">
            <NavLink
              to="/patient/notifications"
              className={({ isActive }) =>
                `relative p-2 rounded-lg transition-colors ${
                  isActive ? "bg-emerald-50" : "hover:bg-slate-100"
                }`
              }
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-slate-700" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </NavLink>
            <button
              onClick={handleLogout}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
              aria-label="Déconnexion"
            >
              <LogOut className="h-5 w-5 text-slate-700" />
            </button>
          </div>
        </header>

        {/* Mobile navigation */}
        <nav className="md:hidden bg-slate-900 px-2 py-2 flex gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "text-slate-300 hover:bg-slate-800"
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
