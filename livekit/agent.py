from dotenv import load_dotenv

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

# Mock Order Database
ORDERS = {
    "ORD-101": {
        "order_id": "ORD-101",
        "customer": "Priya Sharma",
        "product": "Vitamin C Serum (30ml)",
        "value": "₹699",
        "status": "Out for Delivery",
        "notes": "BlueDart — BD-982103. Expected by 6 PM today",
    },
    "ORD-102": {
        "order_id": "ORD-102",
        "customer": "Rahul Verma",
        "product": "Hydrating Sunscreen SPF 50",
        "value": "₹499",
        "status": "Delivered",
        "notes": "Delhivery — DL-441029. Delivered 14 days ago",
    },
    "ORD-103": {
        "order_id": "ORD-103",
        "customer": "Ananya Patel",
        "product": "Green Tea Face Wash + Toner",
        "value": "₹850",
        "status": "Processing",
        "notes": "Ordered 3 hours ago. Eligible for cancellation",
    },
}


class Aria(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)

    @function_tool
    async def get_order_details(self, order_id: str) -> dict:
        """Look up order details by order ID. Use this whenever the customer mentions an order number."""
        order_id = order_id.strip().upper()
        order = ORDERS.get(order_id)
        if not order:
            return {
                "found": False,
                "message": f"No order found with ID {order_id}. Please double-check the order ID.",
            }
        return {
            "found": True,
            **order,
        }


server = AgentServer()


@server.rtc_session(agent_name="Voice Agent")
async def entrypoint(ctx: JobContext):
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-3.1-flash-live-preview",
            voice="Puck",          # closest available; can change later if Indian voice is available
            # temperature=0.7,     # optional
        ),
    )

    await session.start(
        agent=Aria(),
        room=ctx.room,
    )


if __name__ == "__main__":
    cli.run_app(server)