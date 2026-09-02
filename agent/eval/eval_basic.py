import os
from datetime import date

from dotenv import load_dotenv
from strands import Agent
from strands.models import BedrockModel
from strands_evals import Case, Experiment
from strands_evals.evaluators import OutputEvaluator

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
        expected_output=(
            "Las reservas pueden cancelarse sin cargo hasta 12 horas antes del horario reservado. "
            "Las cancelaciones con menos de 12 horas pueden tener condiciones especiales."
        ),
        metadata={"category": "faq"},
    ),
    Case[str, str](
        name="faq-hours",
        input="¿Cuáles son los horarios del restaurante?",
        expected_output=(
            "Lunes a jueves de 10:00 a 23:00. Viernes, sábado y domingo de 10:00 a 01:00."
        ),
        metadata={"category": "faq"},
    ),
    Case[str, str](
        name="menu-vegetarian",
        input="¿Qué platos vegetarianos tienen?",
        expected_output=(
            "Menciona platos vegetarianos reales del menú. No inventa platos."
        ),
        metadata={"category": "menu"},
    ),
    Case[str, str](
        name="reservation-incomplete",
        input="Quiero reservar mesa para mañana a las 20:00",
        expected_output=(
            "Pide nombre, email y cantidad de invitados. No confirma la reserva todavía."
        ),
        metadata={"category": "reservations"},
    ),
    Case[str, str](
        name="out-of-scope",
        input="¿Quién ganó el último mundial de fútbol?",
        expected_output="Declina el tema y vuelve al restaurante Reino Canino.",
        metadata={"category": "scope"},
    ),
]

evaluator = OutputEvaluator(
    rubric="""
    Evaluá si el output cumple lo esperado (datos correctos o comportamiento correcto).
    El agente puede ser sarcástico, eso no importa. Lo importante es que cumpla con la regla clave.

    Devolvé un score con dos decimales entre 0.0 y 1.0 (podés usar cualquier valor, ej. 0.73).
    - 1.0 = cumple perfecto
    - 0.7-0.9 = casi bien, falta poco
    - 0.4-0.6 = parcial
    - 0.1-0.3 = mal pero con algo útil
    - 0.0 = incorrecto o incumple la regla clave
    """,
    model=BedrockModel(model_id=JUDGE_MODEL_ID, region_name=AWS_REGION),
    include_inputs=True,
)

experiment = Experiment(cases=test_cases, evaluators=[evaluator])


def run_case(model_id: str, case: Case) -> str:
    model = BedrockModel(model_id=model_id.strip(), region_name=AWS_REGION)
    agent = Agent(
        model=model,
        tools=available_tools,
        system_prompt=_system_prompt(),
    )
    result = agent(
        case.input,
        invocation_state={
            "session_id": case.name,
            "today_date": date.today().isoformat(),
        },
    )
    return strip_thinking(str(result))


for model_id in EVAL_MODEL_IDS:
    model_id = model_id.strip()

    def task(case: Case, mid=model_id) -> str:
        return run_case(mid, case)

    report = experiment.run_evaluations(task)
    report.run_display()

    outfile = f"agent/eval/results/eval_basic_{model_id.replace(':', '_')}_{date.today()}.json"
    report.to_file(outfile)
    print(f"Guardado: {outfile}")
