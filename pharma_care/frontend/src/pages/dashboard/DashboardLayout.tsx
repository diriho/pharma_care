import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Download, LogOut, Trash2, Bell } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { api, apiDownload } from "../../api/client";
import Search from "./Search";
import { DASHBOARD_NAV } from "./nav";
import { getInboxNotifications } from "../../services/pharmacyAdmin";
import { useRealtimeTable } from "../../hooks/useRealtimeTable";
import type { PatientNotification } from "../../types/patient";

type Alert = { type: string; severity: string; message: string };


// main dashboard layout with sidebar and header
export default function DashboardLayout() {
  const { pharmacy, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadInbox, setUnreadInbox] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Stock/expiry alerts are computed from inventory levels (no realtime source),
  // so they keep a slow poll.
  useEffect(() => {
    let mounted = true;
    async function tick() {
      try {
        const data = await api<{ alerts: Alert[] }>("/data/notifications");
        if (mounted) setAlerts(data.alerts || []);
      } catch {
        // session may be expiring — ignore
      }
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const refreshInbox = useCallback(async () => {
    try {
      const data = await getInboxNotifications();
      setUnreadInbox(data.unread);
    } catch {
      // session may be expiring — ignore
    }
  }, []);

  useEffect(() => {
    refreshInbox();
  }, [refreshInbox]);

  // Live unread badge for orders/ratings/messages notifications
  // (RLS only delivers this pharmacy's rows).
  useRealtimeTable<PatientNotification>({
    table: "notifications",
    events: ["INSERT", "UPDATE"],
    onChange: refreshInbox,
    onResync: refreshInbox,
  });

  const bellCount = unreadInbox + alerts.length;

  // logout handling
  async function handleLogout() {
    await logout();
    navigate("/");
  }

  // delete account handling
  async function handleDelete() {
    try {
      await deleteAccount();
      navigate("/");
    } catch (err) {
      alert((err as Error).message);
    }
  }

  // data export handling
  async function handleExport() {
    try {
      await apiDownload(
        "/data/export",
        `pharma-core-${(pharmacy?.name || "pharmacie").replace(/\s+/g, "-").toLowerCase()}.json`
      );
    } catch (err) {
      alert((err as Error).message);
    }
  }

  // DOM element to return
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
            <p className="text-xs text-emerald-400 font-medium">
              {pharmacy?.name || "Gestion Pharmacie"}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {DASHBOARD_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
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

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            Exporter (JSON)
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/40 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer le compte
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search />
          </div>
          <NavLink
            to="/dashboard/notifications"
            className={({ isActive }) =>
              `relative p-2 rounded-lg transition-colors ${
                isActive ? "bg-emerald-50" : "hover:bg-slate-100"
              }`
            }
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-slate-700" />
            {bellCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                {bellCount}
              </span>
            )}
          </NavLink>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Supprimer définitivement votre compte ?
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Cette action supprimera toutes vos données (inventaire, ventes,
              patients, fournisseurs). Cette opération est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 font-semibold hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
