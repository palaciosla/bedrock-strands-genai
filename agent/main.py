from strands import Agent
from strands.models import BedrockModel
from agent.tools.utils.text import strip_thinking
from agent.tools.menu import get_menu
from agent.tools.reservations.reservations import (
    get_reservations,
    check_availability,
    create_reservation,
)
from agent.tools.rag.search_knowledge import search_knowledge

from agent.prompts.system_prompt import SYSTEM_PROMPT
from datetime import date

import logging
import os
from dotenv import load_dotenv

load_dotenv()

logging.getLogger("strands").setLevel(logging.DEBUG)
logging.basicConfig(format="%(levelname)s | %(message)s")


guardrail_id = os.environ.get("GUARDRAIL_ID")
guardrail_version = os.environ.get("GUARDRAIL_VERSION")

model = BedrockModel(model_id="amazon.nova-lite-v1:0", region_name=os.environ.get("AWS_REGION"), guardrail_id=guardrail_id, guardrail_version=guardrail_version, guardrail_trace="enabled")
agent = Agent(
    model=model,
    tools=[
        get_menu,
        get_reservations,
        check_availability,
        create_reservation,
        search_knowledge,
    ],
    system_prompt=SYSTEM_PROMPT.format(today_date=date.today().isoformat()),
)


while True:
    message = input("Vos: ")
    if message.lower() in ["salir", "exit"]:
        break
    if not message.strip():  # ignora mensajes vacíos
        continue
    result = agent(message)
    raw = (
        result.message["content"][0]["text"]
        if isinstance(result.message, dict)
        else str(result.message)
    )
    print(f"Agente: {strip_thinking(raw)}\n")
