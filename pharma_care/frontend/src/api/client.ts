import { supabase } from "../lib/supabase";

const BASE = ((import.meta as any).env.VITE_API_BASE as string) || "/api";

// Compute Supabase session storage key dynamically from configured URL
function getSupabaseSessionKey(): string {
  const url = (import.meta as any).env.VITE_SUPABASE_URL as string;
  if (!url) return "sb-auth-token"

  // Extract project ref from URL like "https://abcdef.supabase.co"
  const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  const projectRef = match?.[1];

  return projectRef ? `sb-${projectRef}-auth-token` : "sb-auth-token";
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

    // Fallback to localStorage
    if (!token) {
      const sessionKey = getSupabaseSessionKey();
      const sessionStr = localStorage.getItem(sessionKey);

      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);

        // Handle several possible storage formats
        if (parsed?.access_token) {
          token = parsed.access_token;
        } else if (parsed?.currentSession?.access_token) {
          token = parsed.currentSession.access_token;
        } else if (
          Array.isArray(parsed) &&
          parsed[0]?.access_token
        ) {
          token = parsed[0].access_token;
        }
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
  console.log(`[api] Getting auth header for ${path}...`);
  const auth = await authHeader();
  console.log(`[api] Auth header retrieved for ${path}`);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...auth,
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    console.log(`[api] Fetching ${path}...`);
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });
    console.log(`[api] Response status for ${path}: ${res.status}`);
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
      console.error(`[api] Error on ${path}:`, message);
      throw new Error(message as string);
    }
    console.log(`[api] Successfully fetched ${path}`, body);
    return body as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

// downlaod that datafile from the api
export async function apiDownload(path: string, filename: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) {
    if (res.status === 401 && headers.Authorization) {
      await supabase.auth.signOut().catch(() => {});
    }
    throw new Error(`Téléchargement échoué (${res.status})`);
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
