import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or Key");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client for bypassing RLS when needed
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const supabaseAdmin = supabaseAdminKey
  ? createClient(supabaseUrl, supabaseAdminKey)
  : null;
