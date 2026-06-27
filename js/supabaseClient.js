import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "https://rzjdvrbqsqxhdpelkudh.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_rREAoCEgPGTyxig229PeRg_qQLuGv-R";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export async function getSupabaseSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getSupabaseUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

// Futuro Supabase:
// export const fetchProductos = () => supabase.from("productos_reutiliza").select("*");
