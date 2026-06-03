import { createClient } from "@supabase/supabase-js";

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const url = import.meta.env.VITE_SUPABASE_URL as string;

console.log("Supabase URL:", url);
console.log("Supabase Anon Key:", anonKey ? "****" : "MISSING"); // hide the actul key for security

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});