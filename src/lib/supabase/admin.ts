import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing — admin client unavailable");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
