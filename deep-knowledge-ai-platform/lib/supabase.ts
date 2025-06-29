import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Thiếu biến môi trường Supabase URL hoặc ANON KEY");
}

// Client-side Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Server-side client với service role key
export const createServerClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY cho server client");
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey);
};
