A chat (menu, reservations, FAQs) exercising production AI patterns on AWS — Bedrock Nova Lite, Strands Agents, Knowledge Base RAG, Supabase-backed tools, and a live ops UI.

## Quick reference


|              |                                                                          |
| ------------ | ------------------------------------------------------------------------ |
| **Model**    | `amazon.nova-lite-v1:0`                                                  |
| **Region**   | `us-east-2`                                                              |
| **Agent**    | Strands Agents                                                           |
| **RAG**      | Bedrock Knowledge Base                             |
| **Tools DB** | Supabase PostgreSQL                                                      |
| **Env**      | `.env` — Supabase + AWS credentials + API |


```bash
# Backend — http://localhost:8000
python -m uvicorn agent.api.server:app --reload --port 8000

# Frontend — http://localhost:3000
cd frontend && yarn dev
```

---



## Agent orchestration


| Technique                            | Status | Notes                                                                                          |
| ------------------------------------ | ------ | ---------------------------------------------------------------------------------------------- |
| Tool-using agent (Strands + Bedrock) | ✅      | `get_menu`, `check_availability`, `create_reservation`, `get_reservations`, `search_knowledge` |
| Tool routing via docstrings          | ✅      | Descriptions define scope and steer tool selection                                             |
| Session-scoped agent instances       | ✅      | In-memory `Agent` per `session_id`; `invocation_state` propagates context into tools           |
| Multi-step tool loops                | ✅      | Strands event loop — chained tool calls within a single user turn                              |
| `callback_handler=None`              | ⬜      | Suppress default stream/event output to terminal                                               |
| Assistant text extraction            | ⬜      | `extract_assistant_text()` for multi-block model responses                                     |
| `tools_used` per turn                | ⬜      | Per-invocation tool list in `ChatResponse` (vs session cumulative)                             |
| Human-in-the-loop                    | ⬜      | Confirmation step before mutating tools (e.g. `create_reservation`)                            |
| Tool trajectory eval                 | ⬜      | Harness asserting expected tool sequences per query type                                       |


---



## Validation & reliability


| Technique                                   | Status | Notes                                                                         |
| ------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| Soft validation (system prompt)             | ✅      | Business rules, explicit tool-use policy, no fabricated user data             |
| Hard validation (Pydantic at tool boundary) | ✅      | `ReservationCreate` — email, party size, date, time format, placeholder names |
| Structured tool errors                      | ✅      | `{ success, message }` responses for model-consumable failures                |
| Service-layer business rules                | ⬜      | Availability check enforced in `create_reservation` before insert             |
| Placeholder email blocking                  | ⬜      | Reject common test/placeholder domains in Pydantic                            |
| Relative date resolution                    | ⬜      | Server-side parsing of "today", "tomorrow" against `today_date`               |
| Language consistency                        | ⬜      | Explicit locale rule in system prompt                                         |
| Output sanitization                         | ✅      | `strip_thinking()` removes `<thinking>` blocks from user-facing text          |
| Input length / cost limits                  | ⬜      | Per-request token caps, rate limits, session spend budgets                    |


---



## RAG (Bedrock Knowledge Base)


| Technique                        | Status | Notes                                                                |
| -------------------------------- | ------ | -------------------------------------------------------------------- |
| Vector retrieval                 | ✅      | `bedrock-agent-runtime.retrieve`, top-3, `vectorSearchConfiguration` |
| Retrieval scores in tool payload | ✅      | Per-chunk `score` returned to the model                              |
| Grounded answers policy          | ✅      | Policies/FAQs from KB; admit ignorance when retrieval is empty       |
| RAG scope separation             | ✅      | KB tool scoped to policies/FAQs — menu and reservations use DB tools |
| RAG citations in chat UI         | ⬜      | Source metadata (`location`, URI, chunk id) in message UI            |
| Citations in API response        | ⬜      | Retrieval metadata attached to `ChatResponse` per turn               |
| Retrieval score threshold        | ⬜      | Filter low-confidence chunks before model context                    |
| Reranking / hybrid search        | ⬜      | Reranker or keyword + vector hybrid retrieval                        |
| Chunk deduplication              | ⬜      | Overlap handling across retrieved chunks                             |
| KB sync monitoring               | ⬜      | Data source ingestion status and freshness signals                   |


---



## Prompt engineering & versioning


| Technique                   | Status | Notes                                                         |
| --------------------------- | ------ | ------------------------------------------------------------- |
| Centralized system prompt   | ✅      | `agent/prompts/system_prompt.py`                              |
| Dynamic prompt variables    | ✅      | `{{today_date}}` injected at agent creation                   |
| Persona vs facts separation | ✅      | Personality in tone; factual content from tools only          |
| Bedrock Prompt Management   | ⬜      | Versioned prompts deployed from Bedrock console/API           |
| Prompt versioning / A/B     | ⬜      | Version registry, diff, rollback across prompt iterations     |
| Prompt regression tests     | ⬜      | Behavioral snapshots on prompt changes                        |
| Few-shot examples           | ⬜      | Worked examples for tool routing and reservation flow         |
| FAQ tool routing            | ⬜      | Stronger `search_knowledge` invocation for policy/FAQ queries |


---



## Metrics & usage (LLM ops)


| Technique                        | Status | Notes                                                                 |
| -------------------------------- | ------ | --------------------------------------------------------------------- |
| Input / output / total tokens    | ✅      | Strands `result.metrics` → `ChatResponse` → backstage UI              |
| Per-request latency              | ✅      | `latency_ms` — delta on `accumulated_metrics["latencyMs"]` per turn   |
| Session avg latency              | ✅      | `avg_latency_ms` across agent invocations                             |
| Request count per session        | ✅      | `len(metrics.agent_invocations)`                                      |
| Tools used in UI                 | ✅      | Per-message details and backstage observability panel                 |
| Cache token metrics              | ⬜      | `cacheReadInputTokens` / `cacheWriteInputTokens` in API and UI        |
| Context size tracking            | ⬜      | `latest_context_size` / `projected_context_size` from Strands metrics |
| Cost estimation                  | ⬜      | Per-session and per-request cost from token usage + model pricing     |
| Per-tool duration / success rate | ⬜      | `ToolMetrics` — call count, latency, error rate per tool              |
| Metrics export                   | ⬜      | Prometheus / CloudWatch custom metrics or dashboard export            |


---



## Observability


| Technique                  | Status | Notes                                                         |
| -------------------------- | ------ | ------------------------------------------------------------- |
| Live tool trajectory in UI | ✅      | Last tool call and recent tool badge list per session         |
| Live DB state in UI        | ✅      | SQL panel — Supabase menu and session-scoped reservations     |
| Backstage ops surfaces     | ✅      | Dedicated tabs for metrics, prompt, observability, guardrails |
| Structured trace IDs       | ⬜      | Correlated `trace_id` across frontend → API → agent → tools   |
| OpenTelemetry export       | ⬜      | Wire Strands OTel metrics to an exporter                      |
| CloudWatch / X-Ray         | ⬜      | AWS-native distributed tracing                                |
| Tool call spans            | ⬜      | Per-tool latency and outcome in trace backend                 |
| Model invocation spans     | ⬜      | Per-LLM-call spans with token usage attributes                |
| Error tracking             | ⬜      | Centralized exception capture (e.g. Sentry)                   |
| Tool failure alerting      | ⬜      | Alerts on elevated tool error rates                           |


---



## Guardrails & safety


| Technique                      | Status | Notes                                                          |
| ------------------------------ | ------ | -------------------------------------------------------------- |
| Prompt-level topic boundaries  | ✅      | Restaurant scope; no internal system disclosure                |
| Health / allergy respect       | ✅      | Dietary restrictions treated seriously in prompt rules         |
| Bedrock Guardrails             | ⬜      | Content filters, denied topics, PII masking via Bedrock API    |
| Input guardrails (pre-model)   | ⬜      | User message screening before agent invocation                 |
| Output guardrails (post-model) | ⬜      | Policy filter on assistant response beyond `strip_thinking`    |
| PII handling in logs           | ⬜      | Redaction or exclusion of guest email/name in application logs |
| Prompt injection hardening     | ⬜      | Delimiter strategy and injection regression tests              |


---



## Evaluation


| Technique                               | Status | Notes                                                                    |
| --------------------------------------- | ------ | ------------------------------------------------------------------------ |
| ROUGE on FAQ answers (vs reference)     | ⬜      | ROUGE-L / ROUGE-1 against golden FAQ dataset                             |
| ROUGE faithfulness (vs retrieved chunk) | ⬜      | Answer overlap with KB chunks for RAG-grounded responses                 |
| Tool trajectory scoring                 | ⬜      | Expected tool sequence per query type (e.g. policy → `search_knowledge`) |
| Reservation logic unit tests            | ⬜      | Pydantic validation and availability capacity model                      |
| End-to-end regression fixtures          | ⬜      | JSON fixture set with CI job                                             |
| Eval harness (headless agent runs)      | ⬜      | Golden dataset → agent run → trajectory + ROUGE thresholds → report      |
| LLM-as-judge groundedness               | ⬜      | Secondary model scores answer grounding against retrieval                |
| Retrieval recall@k                      | ⬜      | FAQ query set against expected KB chunks                                 |
| Tool argument validation tests          | ⬜      | Pytest on tool inputs and edge cases                                     |
| Latency / token budget regression       | ⬜      | Perf budgets enforced in CI                                              |


ROUGE targets the FAQ/RAG path; open-ended chat and transactional flows (reservations) rely on tool trajectory and unit tests.

---



## Architecture patterns


| Pattern                             | Status | Notes                                            |
| ----------------------------------- | ------ | ------------------------------------------------ |
| BFF / API proxy (Next.js → FastAPI) | ✅      | Bedrock credentials server-side only             |
| Env-based backend URL               | ✅      | `APP_API_URL` in frontend API routes             |
| CORS on FastAPI                     | ✅      | Configured origins for local frontend            |
| DB as source of truth               | ✅      | Menu and reservations from Supabase via tools    |
| Capacity model                      | ✅      | `MAX_COVERS_PER_SLOT = 15`                       |
| Time normalization                  | ✅      | `normalize_time()` before reservation queries    |
| Pytest suite                        | ⬜      | Replace manual tool scripts with automated tests |


---

