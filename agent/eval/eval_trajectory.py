import os
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv
from strands import Agent
from strands.models import BedrockModel
from strands_evals import Case, Experiment
from strands_evals.evaluators import TrajectoryEvaluator
from strands_evals.extractors import tools_use_extractor

from agent.api.server import _system_prompt, available_tools
from agent.tools.utils.text import strip_thinking

load_dotenv()

AWS_REGION = os.environ["AWS_REGION"]
JUDGE_MODEL_ID = os.environ.get("EVAL_JUDGE_MODEL_ID", "amazon.nova-lite-v1:0")
EVAL_MODEL_IDS = os.environ.get(
    "EVAL_MODEL_IDS",
    "amazon.nova-lite-v1:0,us.amazon.nova-2-lite-v1:0",
).split(",")

test_cases = [
    Case[str, str](
        name="faq-cancel-policy",
        input="¿Cuál es la política de cancelación?",
        expected_trajectory=["search_knowledge"],
        metadata={"category": "faq"},
    ),
    Case[str, str](
        name="faq-hours",
        input="¿Cuáles son los horarios del restaurante?",
        expected_trajectory=["search_knowledge"],
        metadata={"category": "faq"},
    ),
    Case[str, str](
        name="menu-vegetarian",
        input="¿Qué platos vegetarianos tienen?",
        expected_trajectory=["get_menu"],
        metadata={"category": "menu"},
    ),
    Case[str, str](
        name="reservation-incomplete",
        input="Quiero reservar mesa para mañana a las 20:00",
        expected_trajectory=[],
        metadata={"category": "reservations", "forbidden_tools": ["create_reservation"]},
    ),
    Case[str, str](
        name="availability-check",
        input="¿Tienen mesa disponible mañana a las 20:00?",
        expected_trajectory=["check_availability"],
        metadata={"category": "reservations"},
    ),
]

evaluator = TrajectoryEvaluator(
    rubric="""
    Evaluá la trayectoria de tools (qué herramientas usó el agente).
    - FAQ / políticas / horarios → search_knowledge
    - Menú / platos → get_menu
    - Disponibilidad → check_availability
    - Reserva incompleta: NO debe llamar create_reservation (faltan datos)

    Score decimal 0.0-1.0. Podés usar in_order_match_scorer si hay expected_trajectory.
    Penalizá fuerte si usa create_reservation cuando está forbidden en metadata.
    """,
    model=BedrockModel(model_id=JUDGE_MODEL_ID, region_name=AWS_REGION),
    include_inputs=True,
)

agent_sample = Agent(tools=available_tools, system_prompt=_system_prompt())
tool_descriptions = tools_use_extractor.extract_tools_description(agent_sample, is_short=True)
evaluator.update_trajectory_description(tool_descriptions)

experiment = Experiment(cases=test_cases, evaluators=[evaluator])


def run_case(model_id: str, case: Case) -> dict:
    model = BedrockModel(model_id=model_id.strip(), region_name=AWS_REGION)
    agent = Agent(
        model=model,
        tools=available_tools,
        system_prompt=_system_prompt(),
    )
    today = date.today()
    result = agent(
        case.input,
        invocation_state={
            "session_id": case.name,
            "today_date": today.isoformat(),
            "tomorrow_date": (today + timedelta(days=1)).isoformat(),
        },
    )
    trajectory = tools_use_extractor.extract_agent_tools_used_from_messages(agent.messages)
    trajectory_names = [t["name"] for t in trajectory if t.get("name")]
    return {"output": strip_thinking(str(result)), "trajectory": trajectory_names}


for model_id in EVAL_MODEL_IDS:
    model_id = model_id.strip()

    def task(case: Case, mid=model_id) -> dict:
        return run_case(mid, case)

    report = experiment.run_evaluations(task)

    outfile = f"agent/eval/results/eval_trajectory_{model_id.replace(':', '_')}_{date.today()}.json"
    Path(outfile).parent.mkdir(parents=True, exist_ok=True)
    report.to_file(outfile)
    print(f"Guardado: {outfile}")

    try:
        report.run_display(include_actual_trajectory=True, include_expected_trajectory=True)
    except (KeyboardInterrupt, UnicodeEncodeError):
        pass
