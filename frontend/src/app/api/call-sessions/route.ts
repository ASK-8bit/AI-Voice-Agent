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

    // Check if a row already exists for this room_name (agent may have inserted first)
    const roomName = payload.room_name as string;
    const { data: existing } = await supabase
      .from("call_sessions")
      .select("id")
      .eq("room_name", roomName)
      .maybeSingle();

    let data, error;
    if (existing) {
      // Row exists – update it with the frontend-computed transcript and outcome
      ({ data, error } = await supabase
        .from("call_sessions")
        .update(payload)
        .eq("room_name", roomName)
        .select());
    } else {
      ({ data, error } = await supabase
        .from("call_sessions")
        .insert([payload])
        .select());
    }

    if (error) {
      console.error("Supabase call_sessions upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, session: data?.[0] });
  } catch (err: any) {
    console.error("call_sessions API POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
