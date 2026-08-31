from typing import Any

from strands.hooks import (
    AfterInvocationEvent,
    BeforeInvocationEvent,
    HookProvider,
    HookRegistry,
)

from agent.guardrails.service import GuardrailsService

GUARDRAIL_ASSESSMENTS_KEY = "guardrail_assessments"


def _extract_text(message: dict[str, Any] | None) -> str:
    if not message:
        return ""
    return "".join(
        block.get("text", "")
        for block in message.get("content", [])
        if isinstance(block, dict) and "text" in block
    )


def _last_user_message(messages: list[dict[str, Any]] | None) -> str:
    if not messages:
        return ""
    for message in reversed(messages):
        if message.get("role") == "user":
            return _extract_text(message)
    return ""


class GuardrailsInfoHook(HookProvider):
    """Collect guardrail assessments via ApplyGuardrail without blocking the agent."""

    def __init__(self, service: GuardrailsService):
        self.service = service

    def register_hooks(self, registry: HookRegistry) -> None:
        registry.add_callback(BeforeInvocationEvent, self.capture_input_assessment)
        registry.add_callback(AfterInvocationEvent, self.capture_output_assessment)

    def _append_assessment(self, invocation_state: dict[str, Any], assessment: dict[str, Any]) -> None:
        invocation_state.setdefault(GUARDRAIL_ASSESSMENTS_KEY, []).append(assessment)

    def capture_input_assessment(self, event: BeforeInvocationEvent) -> None:
        content = _last_user_message(event.messages)
        if not content:
            return
        try:
            assessment = self.service.evaluate_content(content, "INPUT")
        except Exception as exc:
            assessment = {"source": "INPUT", "error": str(exc)}
        self._append_assessment(event.invocation_state, assessment)

    def capture_output_assessment(self, event: AfterInvocationEvent) -> None:
        if not event.result:
            return
        content = _extract_text(event.result.message)
        if not content:
            return
        try:
            assessment = self.service.evaluate_content(content, "OUTPUT")
        except Exception as exc:
            assessment = {"source": "OUTPUT", "error": str(exc)}
        self._append_assessment(event.invocation_state, assessment)
