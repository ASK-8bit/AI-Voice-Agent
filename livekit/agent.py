import os
import json
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from supabase import create_client, Client

from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    cli,
    function_tool,
)
from livekit.plugins import google

load_dotenv(".env")  # or .env

# -------------------------------------------------
# Supabase client
# -------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing")


# -------------------------------------------------
# System prompt
# -------------------------------------------------
SYSTEM_PROMPT = """
You are Aria, a friendly, professional and concise Indian customer support specialist for Aura Skincare.

Speak in a warm, natural Indian English accent. Keep replies short and clear. Pause naturally. Do not over-explain.

Aura Skincare is a premium organic Indian skincare brand focused on simple, effective products made with thoughtfully selected ingredients.

=== POLICIES (STRICTLY FOLLOW THESE) ===

Shipping:
- Free delivery on orders above ₹499
- Orders below ₹499 have a ₹50 shipping fee
- Standard delivery takes 3–5 business days

Return & Refund:
- Returns accepted within 7 days of delivery
- Only for unopened, unused products in original packaging
- Damaged or defective products must be reported within 48 hours of delivery with photos for replacement
- Do NOT promise refunds or returns that fall outside this policy

Cancellation:
- Orders can be cancelled ONLY while status is "Processing"
- Once status is "Shipped" or "Out for Delivery", cancellation is not possible
- Customer may refuse delivery at the doorstep

Cash on Delivery (COD):
- Available for orders up to ₹2,500
- Customer can pay by cash or UPI at the doorstep

=== BEHAVIOUR RULES ===
- Only help with Aura Skincare related queries (products, orders, shipping, returns, cancellations, COD).
- If asked about anything else (flights, other brands, etc.), politely say you can only help with Aura Skincare.
- Never invent order details. Always use the get_order_details tool when the customer mentions an order ID.
- If an order ID is invalid or not found, say so clearly and ask them to verify.
- If audio is unclear or the customer mumbles, politely ask them to repeat.
- Never promise anything outside the policies above.
- Maintain conversation context.
- When the customer asks about an order, call the tool first, then speak the result naturally.
"""


# -------------------------------------------------
# Agent
# -------------------------------------------------
class Aria(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        self.transcript: list[dict] = []
        self.started_at: Optional[datetime] = None
        self.room_name: Optional[str] = None

    def add_turn(self, role: str, content: str):
        """Append a turn to the in-memory transcript."""
        if not content or not content.strip():
            return
        self.transcript.append({
            "role": role,          # "user" or "agent"
            "content": content.strip(),
            "ts": datetime.now(timezone.utc).isoformat(),
        })

    @function_tool
    async def get_order_details(self, order_id: str) -> dict:
        """Look up order details by order ID. Use this whenever the customer mentions an order number."""
        if not supabase:
            return {"found": False, "message": "Order database is temporarily unavailable."}

        order_id = order_id.strip().upper()
        try:
            result = (
                supabase.table("orders")
                .select("*")
                .eq("order_id", order_id)
                .maybe_single()
                .execute()
            )
            if not result.data:
                return {
                    "found": False,
                    "message": f"No order found with ID {order_id}. Please double-check the order ID.",
                }
            row = result.data
            return {
                "found": True,
                "order_id": row["order_id"],
                "customer": row["customer"],
                "product": row["product"],
                "value": row["value"],
                "status": row["status"],
                "notes": row.get("notes") or "",
            }
        except Exception as e:
            print(f"Supabase order lookup error: {e}")
            return {"found": False, "message": "Could not fetch order details right now. Please try again."}

    async def save_call_session(
        self,
        customer_intent: str = "GENERAL",
        order_id: Optional[str] = None,
        resolution_status: str = "RESOLVED",
        call_summary: str = "",
    ):
        """Save transcript + structured outcome to Supabase."""
        if not supabase:
            print("Skipping save – Supabase not configured")
            return

        payload = {
            "room_name": self.room_name,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "customer_intent": customer_intent,
            "order_id": order_id,
            "resolution_status": resolution_status,
            "call_summary": call_summary,
            "transcript": self.transcript,
        }

        try:
            supabase.table("call_sessions").insert(payload).execute()
            print(f"Saved call_session for room {self.room_name}")
        except Exception as e:
            print(f"Failed to save call_session: {e}")


# -------------------------------------------------
# Server + entrypoint
# -------------------------------------------------
server = AgentServer()


@server.rtc_session(agent_name="Voice Agent")
async def entrypoint(ctx: JobContext):
    agent = Aria()
    agent.room_name = ctx.room.name
    agent.started_at = datetime.now(timezone.utc)

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-3.1-flash-live-preview",
            voice="Puck",
        ),
    )

    # ---- Collect transcript from conversation items ----
    @session.on("conversation_item_added")
    def on_conversation_item(item):
        try:
            # item role is usually "user" or "assistant"
            role = "user" if getattr(item, "role", "") == "user" else "agent"
            text = ""
            if hasattr(item, "text_content") and item.text_content:
                text = item.text_content
            elif hasattr(item, "content"):
                # content can be list of parts
                parts = item.content if isinstance(item.content, list) else [item.content]
                text = " ".join(str(p) for p in parts if p)
            if text:
                agent.add_turn(role, text)
        except Exception as e:
            print(f"transcript capture error: {e}")

    # ---- On session close → generate summary + save ----
    async def on_shutdown():
        # Simple heuristic summary if we don't call LLM again
        # (You can later upgrade this to an LLM structured output call)
        order_id = None
        intent = "GENERAL"
        for turn in agent.transcript:
            content = turn["content"].upper()
            if "ORD-" in content:
                # crude extract
                for word in content.replace(",", " ").split():
                    if word.startswith("ORD-"):
                        order_id = word.strip(".,?")
                        break
            if any(k in content for k in ["TRACK", "WHERE IS", "STATUS", "DELIVERY"]):
                intent = "ORDER_TRACKING"
            elif any(k in content for k in ["RETURN", "REFUND"]):
                intent = "RETURN"
            elif any(k in content for k in ["CANCEL"]):
                intent = "CANCEL"

        summary = "Call completed."
        if agent.transcript:
            # very short summary from last few turns
            last_user = next((t["content"] for t in reversed(agent.transcript) if t["role"] == "user"), "")
            summary = f"Customer discussed: {last_user[:120]}" if last_user else summary

        await agent.save_call_session(
            customer_intent=intent,
            order_id=order_id,
            resolution_status="RESOLVED",
            call_summary=summary,
        )

    ctx.add_shutdown_callback(on_shutdown)

    await session.start(
        agent=agent,
        room=ctx.room,
    )


if __name__ == "__main__":
    cli.run_app(server)