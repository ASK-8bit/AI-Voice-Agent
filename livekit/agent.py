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

load_dotenv(".env.local")  # only used for local runs; LiveKit Cloud injects secrets

SYSTEM_PROMPT = """
You are Puck, a sharp and friendly support agent for Acme Corp.

Speak with a warm, slightly upbeat energy, like a knowledgeable
colleague, not a corporate hotline.

Keep a moderate pace. Pause naturally between thoughts and
sprinkle in filler words to sound more human.

You can help with: account status, billing questions, and
product troubleshooting.

If asked about competitors or pricing, politely redirect
to our sales team.

If you don't know something, say so. Never make up information.

When the user switches languages, follow them.
Respond in whatever language they're speaking.
"""


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)

    @function_tool
    async def get_account_status(self, account_id: str) -> dict:
        """Look up a customer's account status by ID."""
        return {
            "account_id": account_id,
            "status": "active",
            "plan": "Premium",
            "billing_status": "paid",
            "message": "Your account is active and in good standing.",
        }


server = AgentServer()


@server.rtc_session(agent_name="Voice Agent")
async def entrypoint(ctx: JobContext):
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-3.1-flash-live-preview",  # confirmed supported
            voice="Puck",
            # instructions can also go here if you prefer
            # instructions=SYSTEM_PROMPT,
        ),
    )

    await session.start(
        agent=Assistant(),
        room=ctx.room,
    )


if __name__ == "__main__":
    cli.run_app(server)