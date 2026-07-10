import { createClient } from "@supabase/supabase-js";

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const url = import.meta.env.VITE_SUPABASE_URL as string;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy frontend/.env.example to frontend/.env and fill in your Supabase project values."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
  
});

