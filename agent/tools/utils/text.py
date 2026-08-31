import re


def strip_thinking(text: str) -> str:
    """Remove <thinking> blocks from model output before showing to users."""
    cleaned = re.sub(
        r"<thinking>.*?</thinking>", "", text, flags=re.DOTALL | re.IGNORECASE
    )
    return cleaned.strip()


EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w.-]+\.\w+")


def redact_pii(text: str) -> str:
    """Redact common PII patterns before writing to logs."""
    return EMAIL_PATTERN.sub("[REDACTED_EMAIL]", text)


def redact_for_logs(value):
    """Recursively redact PII from strings inside log payloads."""
    if isinstance(value, str):
        return redact_pii(value)
    if isinstance(value, dict):
        return {key: redact_for_logs(item) for key, item in value.items()}
    if isinstance(value, list):
        return [redact_for_logs(item) for item in value]
    return value
