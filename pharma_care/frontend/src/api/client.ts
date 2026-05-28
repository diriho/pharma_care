import { supabase } from "../lib/supabase";

const BASE = ((import.meta as any).env.VITE_API_BASE as string) || "/api";

// get the athorization header with the current access token
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;

  // If no token from Supabase, try to get it directly from localStorage
  if (!token) {
    try {
      const sessionStr = localStorage.getItem("sb-kqzdqanvlsxlpakmuzpt-auth-token");
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        token = session?.access_token;
      }
    } catch {
      // ignore
    }
  }

  return token ? { Authorization: `Bearer ${token}` } : {};
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
      throw new Error(message as string);
    }
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
