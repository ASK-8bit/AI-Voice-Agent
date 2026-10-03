import { NextRequest, NextResponse } from "next/server";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "APIHGKt7oH82aLy";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "Zl5ddH0bnNOGRwUzJKmW5XKzlZueGQG1Vkr7ivj14Ef";
const LIVEKIT_URL = process.env.LIVEKIT_URL || "wss://internship-m06ow6gq.livekit.cloud";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const requestedRoom = searchParams.get("room");
    const requestedIdentity = searchParams.get("identity");

    const identity = requestedIdentity || `customer-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const roomName = requestedRoom || `aura-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // Create participant AccessToken
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name: "Customer",
      ttl: "1h",
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    // Trigger explicit agent dispatch for "Voice Agent" to this room
    // This guarantees the LiveKit Cloud hosted agent joins the room immediately (< 1s)
    const httpUrl = LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://");
    try {
      if (typeof AgentDispatchClient !== "undefined") {
        const dispatchClient = new AgentDispatchClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
        await dispatchClient.createDispatch(roomName, "Voice Agent");
        console.log(`[Token API] Dispatched Voice Agent to room ${roomName} via AgentDispatchClient`);
      } else {
        // Direct Twirp fallback
        const adminAt = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { ttl: "10m" });
        adminAt.addGrant({ roomAdmin: true, room: roomName });
        const adminJwt = await adminAt.toJwt();

        await fetch(`${httpUrl}/twirp/livekit.AgentDispatchService/CreateDispatch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminJwt}`,
          },
          body: JSON.stringify({
            agent_name: "Voice Agent",
            room: roomName,
          }),
        });
        console.log(`[Token API] Dispatched Voice Agent to room ${roomName} via Twirp`);
      }
    } catch (dispatchErr: any) {
      console.warn("[Token API] Note on Agent Dispatch (agent may auto-join):", dispatchErr?.message || dispatchErr);
    }

    return NextResponse.json({
      token,
      url: LIVEKIT_URL,
      roomName,
      identity,
      expiresIn: 3600,
    });
  } catch (err: any) {
    console.error("[Token API] Error creating token:", err);
    return NextResponse.json(
      { error: "Failed to generate token", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
