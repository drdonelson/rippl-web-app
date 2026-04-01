import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.warn("[supabase] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY");
}

export const supabaseAdmin = createClient(url ?? "", serviceKey ?? "", {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabaseAnon = createClient(url ?? "", anonKey ?? "", {
  auth: { autoRefreshToken: false, persistSession: false },
});
