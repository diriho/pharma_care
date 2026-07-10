import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import "dotenv/config";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missing: string[] = [];
if (!url) missing.push("SUPABASE_URL");
if (!anonKey) missing.push("SUPABASE_ANON_KEY");
if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

if (missing.length) {
  console.warn(
    `[supabase] Missing ${missing.join(", ")} in env. ` +
      "Server will start but Supabase calls will fail until backend/.env is populated."
  );
}

let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_admin) {
    if (!url || !serviceKey) {
      throw new Error(
        "Supabase non configuré: SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans backend/.env"
      );
    }
    _admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

// IMPORTANT: never call user-session methods (signInWithPassword, setSession, …)
// on this client. supabase-js stores the resulting session in memory even with
// persistSession:false, and every later .from()/.storage call would then send
// that user's JWT instead of the service key — silently demoting this client
// from service_role (bypasses RLS) to `authenticated` (subject to RLS).
// Use credentialClient() for anything that verifies user credentials.
export const admin = new Proxy({} as SupabaseClient, {
  get(_target, prop: string) {
    const client = getAdmin() as unknown as Record<string, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
});

// Fresh, throwaway anon-key client for credential verification (login/signup).
// A new instance per call guarantees the session it acquires can never leak
// into the shared service-role client above.
export function credentialClient(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("Supabase non configuré: SUPABASE_URL et SUPABASE_ANON_KEY requis");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClient(accessToken: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("Supabase non configuré: SUPABASE_URL et SUPABASE_ANON_KEY requis");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
