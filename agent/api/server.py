from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from strands import Agent
from strands.models import BedrockModel
from datetime import date, timedelta
import boto3
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
from agent.eval.load_results import load_eval_results

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from dotenv import load_dotenv

load_dotenv()

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


origins = os.environ.get("CORS_ORIGINS").split(",")

model_id = os.environ.get("MODEL_ID")
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
prompt_id = os.environ.get("PROMPT_ID", "").strip().strip('"')
prompt_version = os.environ.get("PROMPT_VERSION", "").strip().strip('"')
prompt_config: dict = {
    "source": "local",
    "name": "system_prompt.py",
    "version": "local",
    "templateType": "TEXT",
    "variables": ["today_date", "tomorrow_date", "weekday_calendar"],
    "updatedAt": None,
}
if prompt_id:
    raw = boto3.client("bedrock-agent", region_name=region_name).get_prompt(
        promptIdentifier=prompt_id,
        promptVersion=prompt_version,
    )
    variant = raw["variants"][0]
    text_cfg = variant["templateConfiguration"]["text"]
    SYSTEM_PROMPT = text_cfg["text"]
    updated = raw.get("updatedAt")
    prompt_config = {
        "source": "bedrock",
        "name": raw.get("name"),
        "version": str(raw.get("version")),
        "templateType": variant.get("templateType"),
        "variables": [
            item["name"]
            for item in (text_cfg.get("inputVariables") or [])
            if item.get("name")
        ],
        "updatedAt": updated.isoformat() if hasattr(updated, "isoformat") else updated,
    }


def _system_prompt() -> str:
    today = date.today()
    return (
        SYSTEM_PROMPT
        .replace("{{today_date}}", today.isoformat())
        .replace("{{tomorrow_date}}", (today + timedelta(days=1)).isoformat())
        .replace("{{weekday_calendar}}", format_calendar_context(today))
    )


def _reservation_context() -> str:
    today = date.today()
    calendar = format_calendar_context(today)
    return (
        f"[Contexto: hoy={today.isoformat()} ({WEEKDAY_NAMES_ES[today.weekday()]}). "
        f"Calendario próximos días: {calendar}. "
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
    if session_prompt_versions.get(session_id) != prompt_version:
        sessions.pop(session_id, None)

    if session_id not in sessions:
        hooks = [guardrails_hook] if guardrails_hook else None
        model = BedrockModel(
            model_id=model_id,
            region_name=region_name,
            guardrail_id=guardrail_id,
            guardrail_version=guardrail_version,
            guardrail_trace="enabled",
            guardrail_redact_input=False,
            temperature=1,
            topP=0.8,
            maxTokens=4096,
        )

        sessions[session_id] = Agent(
            model=model,
            tools=available_tools,
            system_prompt=_system_prompt(),
            hooks=hooks,
        )
        session_prompt_versions[session_id] = prompt_version
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


@app.middleware("http")
async def check_api_key(request: Request, call_next):
    api_key = request.headers.get("x-api-key")
    if api_key != os.environ.get("CHAT_API_KEY"):
        raise HTTPException(status_code=401, detail="Invalid API key")
    return await call_next(request)


@app.get("/prompt/config")
@limiter.limit("10/minute")
async def get_prompt_config(request: Request):
    return {"config": prompt_config}


@app.get("/guardrails/config")
@limiter.limit("10/minute")
async def get_guardrails_config(request: Request):
    if not guardrails_service:
        raise HTTPException(status_code=503, detail="Guardrails not configured")
    return {"config": guardrails_service.get_configuration()}


@app.get("/reservations")
@limiter.limit("10/minute")
async def list_reservations(request: Request, session_id: str):
    response = (
        supabase.table("reservations")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"reservations": response.data}


@app.get("/menu")
@limiter.limit("10/minute")
async def list_menu(request: Request):
    response = supabase.table("menu_items").select("*").order("category").execute()
    return {"items": response.data}


@app.get("/eval/results")
async def get_eval_results():
    return load_eval_results()


@app.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat(request: Request, body: ChatRequest):
    agent = get_or_create_agent(body.session_id)
    _repair_agent_history(agent)
    latency_before = agent.event_loop_metrics.accumulated_metrics["latencyMs"]
    invocation_state: dict = {
        "session_id": body.session_id,
        "today_date": date.today().isoformat(),
        "tomorrow_date": (date.today() + timedelta(days=1)).isoformat(),
    }

    result = agent(
        f"{body.message}\n\n{_reservation_context()}",
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

    # if result.stop_reason == "guardrail_intervened":
    #     raw_text = (
    #         "Content was blocked by guardrails, conversation context overwritten!"
    #     )
    #     sessions.pop(body.session_id, None)
    #     session_prompt_versions.pop(body.session_id, None)

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
        session_id=body.session_id,
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
