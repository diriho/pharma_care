import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { api } from "../api/client";

// type definitions for this app
export type Pharmacy = {
  user_id: string;
  name: string;
  address: string;
  commune: string;
  province: string;
  phone: string;
  currency: string;
  nif: string | null;
  rc: string | null;
  expiry_alert_months: number;
  low_stock_alert_level: number;
};

export type SignupPayload = {
  email: string;
  password: string;
  pharmacy: {
    name: string;
    address: string;
    commune: string;
    province: string;
    phone: string;
    currency: string;
    nif?: string;
    rc?: string;
    expiryAlertMonths: number;
    lowStockAlertLevel: number;
  };
};

type AuthContextValue = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  pharmacy: Pharmacy | null;
  pharmacyLoading: boolean;
  pharmacyError: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshPharmacy: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPharmacy = useCallback(async () => {
    setPharmacyLoading(true);
    setPharmacyError(null);
    try {
      const data = await api<{ user: User; pharmacy: Pharmacy | null }>("/auth/me");
      setPharmacy(data.pharmacy);
    } catch (err) {
      setPharmacy(null);
      setPharmacyError((err as Error).message);
    } finally {
      setPharmacyLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
        if (data.session) {
          try {
            await loadPharmacy();
          } catch (err) {
            console.error("[AuthContext] Failed to load pharmacy:", err);
          }
        }
      } catch (err) {
        console.error("[AuthContext] Session lookup failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession) {
        try {
          await loadPharmacy();
        } catch (err) {
          if (mounted) {
            console.error("[AuthContext] Failed to load pharmacy on auth change:", err);
          }
        }
      } else {
        if (mounted) {
          setPharmacy(null);
        }
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ session: Session; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await supabase.auth.setSession({
        access_token: res.session.access_token,
        refresh_token: res.session.refresh_token,
      });
      // onAuthStateChange listener will fire and call loadPharmacy automatically
    },
    []
  );

  const signup = useCallback(
    async (payload: SignupPayload) => {
      const res = await api<{ session: Session; user: User }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await supabase.auth.setSession({
        access_token: res.session.access_token,
        refresh_token: res.session.refresh_token,
      });
      // onAuthStateChange listener will fire and call loadPharmacy automatically
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ignore — clear local session below regardless
    }
    await supabase.auth.signOut();
    setPharmacy(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await api("/auth/account", { method: "DELETE" });
    await supabase.auth.signOut();
    setPharmacy(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user: session?.user ?? null,
      session,
      pharmacy,
      pharmacyLoading,
      pharmacyError,
      login,
      signup,
      logout,
      deleteAccount,
      refreshPharmacy: loadPharmacy,
    }),
    [loading, session, pharmacy, pharmacyLoading, pharmacyError, login, signup, logout, deleteAccount, loadPharmacy]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// get the current authenticated user and pharmacy info
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
