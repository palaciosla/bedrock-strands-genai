from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from strands import Agent
from strands.models import BedrockModel
from datetime import date

from agent.tools.menu import get_menu
from agent.tools.rag.search_knowledge import search_knowledge
from agent.tools.reservations.reservations import (
    create_reservation,
    check_availability,
    get_reservations,
)
from agent.prompts.system_prompt import SYSTEM_PROMPT
from agent.tools.utils.text import strip_thinking
from agent.db.main import supabase
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

origins = ["http://localhost:9000", "http://localhost:3000"]

model_id = "amazon.nova-lite-v1:0"
region_name = os.environ.get("AWS_REGION")
available_tools = [
    get_menu,
    create_reservation,
    check_availability,
    get_reservations,
    search_knowledge,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: dict[str, Agent] = {}


def get_or_create_agent(session_id: str) -> Agent:
    if session_id not in sessions:
        model = BedrockModel(model_id=model_id, region_name=region_name)
        sessions[session_id] = Agent(
            model=model,
            tools=available_tools,
            system_prompt=SYSTEM_PROMPT.format(today_date=date.today().isoformat()),
        )
    return sessions[session_id]


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    response: str
    session_id: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    latency_ms: int
    avg_latency_ms: int
    request_count: int
    tools_used: list[str]


@app.get("/reservations")
async def list_reservations(session_id: str):
    response = (
        supabase.table("reservations")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"reservations": response.data}


@app.get("/menu")
async def list_menu():
    response = supabase.table("menu_items").select("*").order("category").execute()
    return {"items": response.data}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    agent = get_or_create_agent(request.session_id)
    latency_before = agent.event_loop_metrics.accumulated_metrics["latencyMs"]

    result = agent(
        request.message,
        invocation_state={"session_id": request.session_id},
    )

    metrics = result.metrics
    invocation = metrics.latest_agent_invocation
    usage = invocation.usage if invocation else metrics.accumulated_usage

    total_latency_ms = metrics.accumulated_metrics["latencyMs"]
    request_count = len(metrics.agent_invocations)
    request_latency_ms = total_latency_ms - latency_before
    avg_latency_ms = total_latency_ms // request_count if request_count else 0

    message = result.message
    raw_text = message["content"][0]["text"]

    return ChatResponse(
        response=strip_thinking(raw_text),
        session_id=request.session_id,
        input_tokens=usage["inputTokens"],
        output_tokens=usage["outputTokens"],
        total_tokens=usage["totalTokens"],
        latency_ms=request_latency_ms,
        avg_latency_ms=avg_latency_ms,
        request_count=request_count,
        tools_used=list(metrics.tool_metrics.keys()),
    )
