import os
from datetime import date

from dotenv import load_dotenv
from strands import Agent
from strands.models import BedrockModel
from strands_evals import Case, Experiment
from strands_evals.evaluators import HelpfulnessEvaluator
from strands_evals.mappers import StrandsInMemorySessionMapper
from strands_evals.telemetry import StrandsEvalsTelemetry

from agent.api.server import _system_prompt, available_tools
from agent.tools.utils.text import strip_thinking

load_dotenv()

AWS_REGION = os.environ["AWS_REGION"]
JUDGE_MODEL_ID = os.environ.get("EVAL_JUDGE_MODEL_ID", "amazon.nova-lite-v1:0")
EVAL_MODEL_IDS = os.environ.get(
    "EVAL_MODEL_IDS",
    "amazon.nova-lite-v1:0,us.amazon.nova-2-lite-v1:0",
).split(",")

telemetry = StrandsEvalsTelemetry().setup_in_memory_exporter()
memory_exporter = telemetry.in_memory_exporter
mapper = StrandsInMemorySessionMapper()

test_cases = [
    Case[str, str](
        name="faq-cancel-policy",
        input="¿Cuál es la política de cancelación?",
        metadata={"category": "faq"},
    ),
    Case[str, str](
        name="faq-hours",
        input="¿Cuáles son los horarios del restaurante?",
        metadata={"category": "faq"},
    ),
    Case[str, str](
        name="menu-vegetarian",
        input="¿Qué platos vegetarianos tienen?",
        metadata={"category": "menu"},
    ),
    Case[str, str](
        name="reservation-incomplete",
        input="Quiero reservar mesa para mañana a las 20:00",
        metadata={"category": "reservations"},
    ),
    Case[str, str](
        name="out-of-scope",
        input="¿Quién ganó el último mundial de fútbol?",
        metadata={"category": "scope"},
    ),
]

evaluator = HelpfulnessEvaluator(
    model=BedrockModel(model_id=JUDGE_MODEL_ID, region_name=AWS_REGION),
)

experiment = Experiment(cases=test_cases, evaluators=[evaluator])


def run_case(model_id: str, case: Case) -> dict:
    memory_exporter.clear()

    model = BedrockModel(model_id=model_id.strip(), region_name=AWS_REGION)
    agent = Agent(
        model=model,
        tools=available_tools,
        system_prompt=_system_prompt(),
        trace_attributes={
            "gen_ai.conversation.id": case.session_id,
            "session.id": case.session_id,
        },
    )
    result = agent(
        case.input,
        invocation_state={
            "session_id": case.name,
            "today_date": date.today().isoformat(),
        },
    )

    spans = list(memory_exporter.get_finished_spans())
    session = mapper.map_to_session(spans, session_id=case.session_id)

    return {"output": strip_thinking(str(result)), "trajectory": session}


for model_id in EVAL_MODEL_IDS:
    model_id = model_id.strip()

    def task(case: Case, mid=model_id) -> dict:
        return run_case(mid, case)

    report = experiment.run_evaluations(task)
    report.run_display()

    outfile = f"agent/eval/results/eval_helpfulness_{model_id.replace(':', '_')}_{date.today()}.json"
    report.to_file(outfile)
    print(f"Guardado: {outfile}")
