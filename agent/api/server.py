from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from strands import Agent
from strands.models import BedrockModel
from datetime import date, timedelta
import json
import os

from agent.tools.menu import get_menu
from agent.tools.rag.search_knowledge import search_knowledge
from agent.tools.reservations.reservations import (
    create_reservation,
    check_availability,
    get_reservations,
)
from agent.prompts.system_prompt import SYSTEM_PROMPT
from agent.tools.utils.main import WEEKDAY_NAMES_ES, format_calendar_context
from agent.tools.utils.text import redact_for_logs, strip_thinking
from agent.db.main import supabase
from agent.guardrails.service import GuardrailsService
from agent.hooks.guardrails_info import GUARDRAIL_ASSESSMENTS_KEY, GuardrailsInfoHook
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

origins = ["http://localhost:9000", "http://localhost:3000"]

model_id = "amazon.nova-lite-v1:0"
region_name = os.environ.get("AWS_REGION")
guardrail_id = os.environ.get("GUARDRAIL_ID", "").strip('"')
guardrail_version = os.environ.get("GUARDRAIL_VERSION", "").strip('"')
available_tools = [
    get_menu,
    create_reservation,
    check_availability,
    get_reservations,
    search_knowledge,
]

guardrails_service: GuardrailsService | None = None
guardrails_hook: GuardrailsInfoHook | None = None



if guardrail_id and guardrail_version and region_name:
    guardrails_service = GuardrailsService(
        guardrail_id=guardrail_id,
        guardrail_version=guardrail_version,
        region_name=region_name,
    )
    guardrails_hook = GuardrailsInfoHook(guardrails_service)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: dict[str, Agent] = {}
session_prompt_versions: dict[str, str] = {}
PROMPT_VERSION = "reservations-v4"


def _system_prompt() -> str:
    today = date.today()
    return SYSTEM_PROMPT.format(
        today_date=today.isoformat(),
        tomorrow_date=(today + timedelta(days=1)).isoformat(),
        weekday_calendar=format_calendar_context(today),
    )


def _reservation_context() -> str:
    today = date.today()
    calendar = format_calendar_context(today)
    return (
        f"[Contexto: hoy={today.isoformat()} ({WEEKDAY_NAMES_ES[today.weekday()]}). "
        f"Calendario próximos días: {calendar}. "
        "Las tools de reserva aceptan hoy, mañana, el viernes, in 3 days, YYYY-MM-DD y horas como 8pm. "
        "Pasá la frase de fecha del usuario tal cual a la tool.]"
    )


def _has_orphaned_tool_use(agent: Agent) -> bool:
    if not agent.messages:
        return False
    last = agent.messages[-1]
    return last.get("role") == "assistant" and any(
        "toolUse" in block for block in last.get("content", [])
    )


def _repair_agent_history(agent: Agent) -> None:
    """Remove assistant turns that requested tools but never got a toolResult."""
    while _has_orphaned_tool_use(agent):
        agent.messages.pop()


def get_or_create_agent(session_id: str) -> Agent:
    if session_prompt_versions.get(session_id) != PROMPT_VERSION:
        sessions.pop(session_id, None)

    if session_id not in sessions:
        hooks = [guardrails_hook] if guardrails_hook else None
        model = BedrockModel(
            model_id=model_id,
            region_name=region_name,
            guardrail_id=guardrail_id,
            guardrail_version=guardrail_version,
            guardrail_trace="enabled",
        )

        sessions[session_id] = Agent(
            model=model,
            tools=available_tools,
            system_prompt=_system_prompt(),
            hooks=hooks,
        )
        session_prompt_versions[session_id] = PROMPT_VERSION
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
    guardrail_intervened: bool = False
    guardrail_assessments: list[dict] | None = None

@app.get("/guardrails/config")
async def get_guardrails_config():
    if not guardrails_service:
        raise HTTPException(status_code=503, detail="Guardrails not configured")
    return {"config": guardrails_service.get_configuration()}

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
    _repair_agent_history(agent)
    latency_before = agent.event_loop_metrics.accumulated_metrics["latencyMs"]
    invocation_state: dict = {
        "session_id": request.session_id,
        "today_date": date.today().isoformat(),
        "tomorrow_date": (date.today() + timedelta(days=1)).isoformat(),
    }

    result = agent(
        f"{request.message}\n\n{_reservation_context()}",
        invocation_state=invocation_state,
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

    if result.stop_reason == "guardrail_intervened":
        raw_text = "Content was blocked by guardrails, conversation context overwritten!"
        sessions.pop(request.session_id, None)
        session_prompt_versions.pop(request.session_id, None)

    assessments = invocation_state.get(GUARDRAIL_ASSESSMENTS_KEY)

    model_blocked = result.stop_reason == "guardrail_intervened"
    shadow_intervened = any(
        assessment.get("action") == "GUARDRAIL_INTERVENED"
        for assessment in (assessments or [])
    )
    guardrail_intervened = model_blocked or shadow_intervened

    print(f"[GUARDRAIL] model_blocked={model_blocked} stop_reason={result.stop_reason}")
    if assessments:
        safe_assessments = redact_for_logs(assessments)
        print(f"[GUARDRAIL] assessments={json.dumps(safe_assessments, default=str)}")

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
        guardrail_intervened=guardrail_intervened,
        guardrail_assessments=assessments,
    )
