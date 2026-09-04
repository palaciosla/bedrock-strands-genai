Conversational assistant demo for a fictional dog-themed restaurant: menu, reservations, and FAQs. The project walks through production-style patterns on AWS — Bedrock, Strands Agents, RAG, database-backed tools, evaluations, observability, guardrails.

## Stack

| Layer         | Technology                               |
| ------------- | ---------------------------------------- |
| Model         | Amazon Nova Lite (chat and evaluations)  |
| Region        | `us-east-2`                              |
| Orchestration | Strands Agents + Bedrock Converse API    |
| RAG           | Bedrock Knowledge Base                   |
| Data          | Supabase PostgreSQL (menu, reservations) |
| Frontend      | Next.js — chat + Backstage panel         |
| Backend       | FastAPI                                  |

```bash
# Backend — http://localhost:8000
python -m uvicorn agent.api.server:app --reload --port 8000

# Frontend — http://localhost:3000
cd frontend && yarn dev
```

---

## Agent orchestration

How the model chooses and chains tools to answer user requests.

| Pattern                     |   | What it means                                                                                                              |
| --------------------------- | - | -------------------------------------------------------------------------------------------------------------------------- |
| Tool-using agent            | ✅ | The LLM invokes tools (`get_menu`, `search_knowledge`, reservations, etc.) based on user intent — not text alone.        |
| Tool routing via docstrings | ✅ | Each tool describes when to use it; that guides the model without hardcoded rules per question.                            |
| Session-scoped instances    | ✅ | One agent instance per chat session, with conversation context and invocation state passed into tools.                     |
| Multi-step tool loops       | ✅ | Within a single turn the agent can call several tools in sequence (e.g. check availability, then create a reservation). |
| Bedrock Guardrails          | ✅ | Content filters configured in Bedrock, applied on the model and evaluated in shadow for observability.                     |

**Agent tools:** `get_menu`, `check_availability`, `create_reservation`, `get_reservations`, `search_knowledge`.

---

## Validation & reliability

Validation layers so the agent does not invent data or break business rules.

| Pattern                      |   | What it means                                                                                       |
| ---------------------------- | - | --------------------------------------------------------------------------------------------------- |
| Rules in system prompt       | ✅ | Tool-use policy, restaurant scope, and a ban on fabricating user data.                              |
| Pydantic validation in tools | ✅ | Reservations go through a strict schema: email, party size, date, time, placeholder names rejected. |
| Structured errors            | ✅ | Tools return `{ success, message }` so the model can recover and explain failures to the user.      |
| Relative date parsing        | ✅ | Phrases like “tomorrow” or “8pm” are resolved on the server before checking availability.            |
| Output sanitization          | ✅ | Model `<thinking>` blocks are stripped before showing the response to the user.                     |
| Rate limiting                | ✅ | Per-IP request limits on the API to reduce abuse on public deployments.                             |
| Server-to-server auth        | ✅ | The frontend proxy authenticates backend calls; AWS credentials never reach the browser.              |

---

## RAG (Bedrock Knowledge Base)

Retrieval-augmented generation for policies, history, and FAQs — separate from menu and reservations.

| Pattern               |   | What it means                                                                                       |
| --------------------- | - | --------------------------------------------------------------------------------------------------- |
| Vector retrieval      | ✅ | Semantic query against the Knowledge Base; the top 3 relevant chunks are returned.                  |
| Scores in the payload | ✅ | Each chunk includes a relevance score the model can use to gauge confidence.                        |
| Scope separation      | ✅ | RAG is for documented knowledge only; menu and reservations come from PostgreSQL via dedicated tools. |

---

## Prompt engineering

System prompt design, runtime injection, and soft policy layers that complement Bedrock Guardrails (GR).

| Pattern                                        |   | What it means                                                                                                                                      |
| ---------------------------------------------- | - | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Centralized system prompt                      | ✅ | Single source of truth for persona, tool-routing policy, and domain constraints — loaded into Strands `Agent(system_prompt=...)`.                  |
| Runtime template injection                     | ✅ | `{{today_date}}` and weekday calendar interpolated at agent init so relative date resolution delegates correctly to reservation tools.           |
| Grounding policy (persona vs facts)            | ✅ | Stylistic tone is free; factual claims must originate from tool outputs or KB retrieval — no parametric knowledge.                                |
| Bedrock Prompt Management                      | ✅ | Host prompt artifacts in AWS; resolve via `GetPrompt` (`PROMPT_ID`, `PROMPT_VERSION`) instead of shipping prompt text in the app bundle.         |
| Prompt version registry                        | ⬜ | Semantic versioning, diff, and rollback surfaced in Backstage — decouple prompt iteration from code deploys.                                       |
| Domain scope & denied topics (soft GR)         | ✅ | System-level topic boundary: restaurant domain only; complements Bedrock GR denied-topic and content-filter policies.                              |
| Prompt-injection hardening (instruction layer) | ✅ | Rules against override attempts, system disclosure, or tool/schema exfiltration — layered before managed GR evaluation.                            |
| Session invalidation on prompt bump            | ✅ | `PROMPT_VERSION` gate drops in-memory agent state when the prompt revision changes to prevent mixed policy across turns.                           |

---

## Metrics (LLM ops)

Model usage metrics surfaced in the Backstage UI.

| Metric                  |   | What it means                                                      |
| ----------------------- | - | ------------------------------------------------------------------ |
| Tokens in/out           | ✅ | Context and generation usage per turn — basis for cost and tuning. |
| Latency per request     | ✅ | Time for the current turn; useful to spot slowdowns or slow tools. |
| Session average latency | ✅ | Running average across the conversation.                           |
| Request count           | ✅ | How many model invocations occurred in the session.                |
| Tools used              | ✅ | Which tools were invoked on each assistant reply.                  |

---

## Observability

Operational surfaces in the frontend Backstage panel.

| Surface |   | What it shows                                                    |
| ------- | - | ---------------------------------------------------------------- |
| Metrics | ✅ | Tokens, latency, and request count for the active session.       |
| SQL     | ✅ | Live menu and session-scoped reservations.                         |
| Prompt  | ✅ | Active system prompt version and registered tools.               |
| Guards  | ✅ | Bedrock Guardrails config and last-turn assessments.             |
| Eval    | ✅ | Model comparison by test scenario (quality, tools, helpfulness). |

---

## Guardrails & safety

Managed and soft content-safety controls — Bedrock Guardrails (GR) for policy enforcement, prompt rules as a first instruction layer.

| Pattern                         |   | What it means                                                                                                      |
| ------------------------------- | - | ------------------------------------------------------------------------------------------------------------------ |
| Topic boundaries in prompt      | ✅ | Soft scope constraint: agent stays within the restaurant domain before GR evaluation.                              |
| Content filters (managed GR)    | ✅ | Bedrock GR content-filter policy on input/output — hate, violence, sexual content, etc.                            |
| Denied topics (managed GR)      | ✅ | Blocked topic categories configured in the guardrail; enforced at inference via `BedrockModel` guardrail config.   |
| PII masking (managed GR)        | ✅ | Sensitive-information policy detects and masks/blocks PII (e.g. email, phone) through `ApplyGuardrail` + model GR. |
| Cross-tenant data isolation     | ✅ | Prompt forbids inventing or disclosing other guests’ data; GR PII policy catches leakage in generated output.      |
| Shadow assessments              | ✅ | Pre-model `ApplyGuardrail` on user input via Strands hook — observability without replacing model-side blocking.   |
| Log redaction                   | ✅ | `redact_for_logs()` strips emails and sensitive fields before guardrail debug output hits server logs.             |
| Regression prompts              | ✅ | Manual adversarial cases from chat UI — injection, sexual content, out-of-context, PII-in-output.                 |

---

## Evaluation

Evaluation harness with **5 golden scenarios** (FAQ, menu, incomplete reservation, out-of-scope, availability). Supports comparing models (e.g. Nova Lite vs Nova 2 Lite).

| Evaluation      |   | What it measures                                                           |
| --------------- | - | -------------------------------------------------------------------------- |
| Output quality  | ✅ | Whether the answer meets expected behavior, scored by an LLM judge (0–1). |
| Tool trajectory | ✅ | Whether the agent picked the right tool for each question type.            |
| Helpfulness     | ✅ | How useful and complete the answer is for the end user.                    |

Results appear in the Backstage **Eval** tab with average score, pass rate, and a per-scenario comparison table.

---

## Architecture

Architecture patterns used in the demo.

| Pattern               |   | What it means                                                                       |
| --------------------- | - | ----------------------------------------------------------------------------------- |
| BFF / API proxy       | ✅ | Next.js exposes `/api/*`; the Bedrock backend runs server-side only.                |
| DB as source of truth | ✅ | Menu and reservations live in PostgreSQL; the model does not invent dishes or tables. |
| Capacity model        | ✅ | Maximum covers per time slot before marking a slot unavailable.                       |
| Time normalization    | ✅ | Consistent time format before reservation database queries.                         |

---
