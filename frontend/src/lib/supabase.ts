import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase credentials missing in environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export interface Order {
  order_id: string;
  customer: string;
  product: string;
  value: string;
  status: string;
  notes: string | null;
  created_at?: string;
}

export interface CallSession {
  id?: string;
  room_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  customer_intent: string | null;
  order_id: string | null;
  resolution_status: string | null;
  call_summary: string | null;
  transcript: any;
  created_at?: string;
}
