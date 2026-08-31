from typing import Any, Literal

import boto3

Source = Literal["INPUT", "OUTPUT"]


class GuardrailsService:
    """Fetch Bedrock Guardrail configuration and run shadow evaluations."""

    def __init__(self, guardrail_id: str, guardrail_version: str, region_name: str):
        self.guardrail_id = guardrail_id
        self.guardrail_version = guardrail_version
        self._bedrock = boto3.client("bedrock", region_name=region_name)
        self._runtime = boto3.client("bedrock-runtime", region_name=region_name)
        self._config_cache: dict[str, Any] | None = None

    def get_configuration(self, *, use_cache: bool = True) -> dict[str, Any]:
        if use_cache and self._config_cache is not None:
            return self._config_cache

        response = self._bedrock.get_guardrail(
            guardrailIdentifier=self.guardrail_id,
            guardrailVersion=self.guardrail_version,
        )
        config = self._normalize_configuration(response)
        self._config_cache = config
        return config

    def evaluate_content(self, content: str, source: Source) -> dict[str, Any]:
        if not content.strip():
            return {"source": source, "action": "NONE", "assessments": []}

        response = self._runtime.apply_guardrail(
            guardrailIdentifier=self.guardrail_id,
            guardrailVersion=self.guardrail_version,
            source=source,
            content=[{"text": {"text": content}}],
        )
        return self._normalize_assessment(response, source)

    @staticmethod
    def _normalize_configuration(raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "name": raw.get("name"),
            "version": raw.get("version"),
            "status": raw.get("status"),
            "description": raw.get("description"),
            "blockedInputMessaging": raw.get("blockedInputMessaging"),
            "blockedOutputsMessaging": raw.get("blockedOutputsMessaging"),
            "contentPolicy": raw.get("contentPolicy"),
            "topicPolicy": raw.get("topicPolicy"),
            "sensitiveInformationPolicy": raw.get("sensitiveInformationPolicy"),
            "wordPolicy": raw.get("wordPolicy"),
            "contextualGroundingPolicy": raw.get("contextualGroundingPolicy"),
        }

    @staticmethod
    def _normalize_assessment(raw: dict[str, Any], source: str) -> dict[str, Any]:
        return {
            "source": source,
            "action": raw.get("action"),
            "actionReason": raw.get("actionReason"),
            "assessments": raw.get("assessments", []),
            "usage": raw.get("usage"),
        }
