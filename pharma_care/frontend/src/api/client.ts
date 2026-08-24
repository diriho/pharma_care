import { supabase } from "../lib/supabase";

// base api path
const BASE = import.meta.env.VITE_API_BASE || "/api";

// Backend error responses may include a stable `code` (see backend/supabase/auth/routes.ts's
// authError helper) so the frontend can show a translated, enumeration-safe message
// instead of raw server text. See src/i18n/apiError.ts for the code -> translation mapping.
export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

// Compute Supabase session storage key dynamically from configured URL
function getSupabaseSessionKey(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) return "sb-auth-token"

  // Extract project ref from URL like "https://abcdef.supabase.co" and validate that it matches expected schema
  const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  const projectRef = match?.[1];

  return projectRef ? `sb-${projectRef}-auth-token` : "sb-auth-token";
}

type StoredSession = { access_token?: string; expires_at?: number };

// supabase-js has used a few storage shapes across versions; normalise them.
function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(getSupabaseSessionKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.access_token) return parsed as StoredSession;
    if (parsed?.currentSession?.access_token) return parsed.currentSession as StoredSession;
    if (Array.isArray(parsed) && parsed[0]?.access_token) return parsed[0] as StoredSession;
    return null;
  } catch {
    return null;
  }
}

// 30s of slack so a token that would expire mid-flight is not used either.
// An entry with no expires_at cannot be verified, so it is not trusted.
function isExpired(session: StoredSession): boolean {
  if (typeof session.expires_at !== "number") return true;
  return Date.now() >= session.expires_at * 1000 - 30_000;
}

// get the athorization header with the current access token
async function authHeader(): Promise<Record<string, string>> {
  try {
    // First try the official Supabase API
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("[authHeader] getSession error:", error);
    }

    let token = data?.session?.access_token;

    // Fallback to localStorage: getSession() can fail transiently (offline, or
    // a refresh that lost a race) while a still-valid token sits in storage.
    // Only use it if it has not expired — an expired token comes back as a 401,
    // and the 401 branch in api() below signs the user out, so replaying a
    // stale token would turn a recoverable blip into a forced logout.
    if (!token) {
      const stored = readStoredSession();
      if (stored && !isExpired(stored)) {
        token = stored.access_token;
      }
    }

    return token
      ? { Authorization: `Bearer ${token}` }
      : {};
  } catch (err) {
    console.error("[authHeader] Failed:", err);
    return {};
  }
}

// get the api content
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const auth = await authHeader();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...auth,
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!res.ok) {
      if (res.status === 401 && auth.Authorization) {
        await supabase.auth.signOut().catch(() => {});
      }
      const message =
        (body && typeof body === "object" && "error" in body && (body as { error?: string }).error) ||
        `Request failed (${res.status})`;
      const code =
        body && typeof body === "object" && "code" in body
          ? (body as { code?: string }).code
          : undefined;
      throw new ApiError(message as string, code);
    }
    return body as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Download that datafile from the api
export async function apiDownload(path: string, filename: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) {
    if (res.status === 401 && headers.Authorization) {
      await supabase.auth.signOut().catch(() => {});
    }
    throw new ApiError(`Téléchargement échoué (${res.status})`, "DOWNLOAD_FAILED");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
