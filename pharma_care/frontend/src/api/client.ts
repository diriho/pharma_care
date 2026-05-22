import { supabase } from "../lib/supabase";

const BASE = (import.meta.env.VITE_API_BASE as string) || "/api";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...((options.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body && (body as { error?: string }).error) ||
      `Request failed (${res.status})`;
    throw new Error(message as string);
  }
  return body as T;
}

export async function apiDownload(path: string, filename: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`Téléchargement échoué (${res.status})`);
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
