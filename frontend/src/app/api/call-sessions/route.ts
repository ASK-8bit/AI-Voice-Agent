import { NextRequest, NextResponse } from "next/server";
import { supabase, CallSession } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("call_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Supabase call_sessions GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: data || [] });
  } catch (err: any) {
    console.error("call_sessions API GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      room_name,
      started_at,
      ended_at,
      customer_intent,
      order_id,
      resolution_status,
      call_summary,
      transcript,
    } = body;

    const payload: Partial<CallSession> = {
      room_name: room_name || `aura-${Date.now()}`,
      started_at: started_at || new Date().toISOString(),
      ended_at: ended_at || new Date().toISOString(),
      customer_intent: customer_intent || "GENERAL",
      order_id: order_id || null,
      resolution_status: resolution_status || "RESOLVED",
      call_summary: call_summary || "Call completed.",
      transcript: transcript || [],
    };

    const { data, error } = await supabase
      .from("call_sessions")
      .insert([payload])
      .select();

    if (error) {
      console.error("Supabase call_sessions insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, session: data?.[0] });
  } catch (err: any) {
    console.error("call_sessions API POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
