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
import { api, ApiError } from "../api/client";

// type definitions for this app
export type UserRole = "facility_admin" | "patient";

export type PatientProfile = {
  user_id: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  allergies: string | null;
};

// Roles are stored server-side in app_metadata; accounts predating roles are admins.
export function resolveRole(user: User | null): UserRole | null {
  if (!user) return null;
  return user.app_metadata?.role === "patient" ? "patient" : "facility_admin";
}

// Landing page for a role after login
export function homePathForRole(role: UserRole | null): string {
  return role === "patient" ? "/patient" : "/dashboard";
}

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

export type PatientSignupPayload = {
  email: string;
  password: string;
  profile: {
    fullName: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    allergies?: string;
  };
};

type AuthContextValue = {
  loading: boolean;
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  pharmacy: Pharmacy | null;
  patientProfile: PatientProfile | null;
  pharmacyLoading: boolean;
  pharmacyError: string | null;
  login: (
    email: string,
    password: string,
    expectedRole?: UserRole
  ) => Promise<UserRole>;
  signup: (payload: SignupPayload) => Promise<void>;
  signupPatient: (payload: PatientSignupPayload) => Promise<void>;
  loginWithGitHub: (intent?: "patient" | "pharmacy") => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshPharmacy: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load the role-specific profile (pharmacy for admins, patient profile for patients)
  const loadPharmacy = useCallback(async () => {
    setPharmacyLoading(true);
    setPharmacyError(null);
    try {
      const data = await api<{
        user: User;
        role: UserRole;
        pharmacy: Pharmacy | null;
        patientProfile: PatientProfile | null;
      }>("/auth/me");
      setPharmacy(data.pharmacy);
      setPatientProfile(data.patientProfile ?? null);
    } catch (err) {
      console.error("[AuthContext] loadPharmacy failed:", err);
      setPharmacy(null);
      setPatientProfile(null);
      setPharmacyError((err as Error).message);
    } finally {
      setPharmacyLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[AuthContext] getSession error:", error);
        }

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
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (newSession) {
        setTimeout(() => {
          loadPharmacy().catch((err) => {
            console.error(
              "[AuthContext] Failed to load pharmacy on auth change:",
              err
            );
          });
        }, 0);
      } else {
        setPharmacy(null);
        setPatientProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadPharmacy]);

  const login = useCallback(
    async (email: string, password: string, expectedRole?: UserRole) => {
      const res = await api<{ session: Session; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const role = resolveRole(res.user) ?? "facility_admin";
      // Enforce the selected portal BEFORE installing the session, so a
      // mismatch never leaves the user half-logged-in on the wrong side.
      if (expectedRole && role !== expectedRole) {
        // Thrown as an ApiError (with a code) rather than a plain Error so
        // Login.tsx's translateApiError() renders it in the active language
        // instead of this French fallback text.
        throw new ApiError(
          role === "patient"
            ? "Ce compte est un compte patient. Sélectionnez « Patient » pour vous connecter."
            : "Ce compte est un compte pharmacie. Sélectionnez « Pharmacie » pour vous connecter.",
          role === "patient" ? "ROLE_MISMATCH_PATIENT" : "ROLE_MISMATCH_PHARMACY"
        );
      }
      await supabase.auth.setSession({
        access_token: res.session.access_token,
        refresh_token: res.session.refresh_token,
      });
      // onAuthStateChange listener will fire and call loadPharmacy automatically
      return role;
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

  const signupPatient = useCallback(
    async (payload: PatientSignupPayload) => {
      const res = await api<{ session: Session; user: User }>(
        "/auth/signup/patient",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
      await supabase.auth.setSession({
        access_token: res.session.access_token,
        refresh_token: res.session.refresh_token,
      });
      // onAuthStateChange listener will fire and call loadPharmacy automatically
    },
    []
  );

  const loginWithGitHub = useCallback(async (intent?: "patient" | "pharmacy") => {
    const redirectTo = `${window.location.origin}/oauth/callback${intent ? `?intent=${intent}` : ""}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });
    if (error) throw new ApiError(error.message, "OAUTH_FAILED");
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // ignore — clear local session below regardless
    }
    await supabase.auth.signOut();
    setPharmacy(null);
    setPatientProfile(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await api("/auth/account", { method: "DELETE" });
    await supabase.auth.signOut();
    setPharmacy(null);
    setPatientProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user: session?.user ?? null,
      session,
      role: resolveRole(session?.user ?? null),
      pharmacy,
      patientProfile,
      pharmacyLoading,
      pharmacyError,
      login,
      signup,
      signupPatient,
      loginWithGitHub,
      logout,
      deleteAccount,
      refreshPharmacy: loadPharmacy,
    }),
    [loading, session, pharmacy, patientProfile, pharmacyLoading, pharmacyError, login, signup, signupPatient, loginWithGitHub, logout, deleteAccount, loadPharmacy]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// get the current authenticated user and pharmacy info
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
