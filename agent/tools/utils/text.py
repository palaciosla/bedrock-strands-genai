import re


def strip_thinking(text: str) -> str:
    """Remove <thinking> blocks from model output before showing to users."""
    cleaned = re.sub(
        r"<thinking>.*?</thinking>", "", text, flags=re.DOTALL | re.IGNORECASE
    )
    return cleaned.strip()
