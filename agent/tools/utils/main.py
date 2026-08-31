import re
import unicodedata
from datetime import date, datetime, timedelta

WEEKDAY_INDEX = {
    "lunes": 0,
    "monday": 0,
    "mon": 0,
    "martes": 1,
    "tuesday": 1,
    "tue": 1,
    "miercoles": 2,
    "miércoles": 2,
    "wednesday": 2,
    "wed": 2,
    "jueves": 3,
    "thursday": 3,
    "thu": 3,
    "viernes": 4,
    "friday": 4,
    "fri": 4,
    "sabado": 5,
    "sábado": 5,
    "saturday": 5,
    "sat": 5,
    "domingo": 6,
    "sunday": 6,
    "sun": 6,
}

WEEKDAY_NAMES_ES = [
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
]


def normalize_time(time_str: str) -> str:
    """Convert '20:00' to '20:00:00' to match with PostgreSQL TIME."""
    if len(time_str) == 5:
        return f"{time_str}:00"
    return time_str


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def _normalize_date_phrase(value: str) -> str:
    cleaned = _strip_accents(value.strip().lower())
    cleaned = cleaned.replace("_", " ")
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def _resolve_weekday(
    reference: date,
    weekday: int,
    *,
    next_week: bool = False,
) -> date:
    days_ahead = weekday - reference.weekday()
    if days_ahead < 0:
        days_ahead += 7
    if next_week:
        days_ahead += 7
    elif days_ahead == 0:
        return reference
    return reference + timedelta(days=days_ahead)


def format_calendar_context(reference: date | None = None, *, days: int = 14) -> str:
    """Human-readable calendar for prompts and request context."""
    today = reference or date.today()
    parts = []
    for offset in range(days):
        current = today + timedelta(days=offset)
        label = WEEKDAY_NAMES_ES[current.weekday()]
        parts.append(f"{label}={current.isoformat()}")
    return ", ".join(parts)


def parse_reservation_date(value: str, *, today: date | None = None) -> date:
    """Resolve ISO dates and relative phrases like mañana, el viernes, in 3 days."""
    reference = today or date.today()
    normalized = _normalize_date_phrase(value)

    if normalized in {"hoy", "today"}:
        return reference
    if normalized in {"mañana", "manana", "tomorrow"}:
        return reference + timedelta(days=1)
    if normalized in {"pasado mañana", "pasado manana", "day after tomorrow"}:
        return reference + timedelta(days=2)
    if normalized in {"en una semana", "in a week", "la semana que viene"}:
        return reference + timedelta(days=7)

    offset_match = re.fullmatch(r"(?:en|in)\s+(\d+)\s+(?:dias?|days?)", normalized)
    if offset_match:
        return reference + timedelta(days=int(offset_match.group(1)))

    next_week = False
    for prefix in ("proximo ", "próximo ", "next "):
        if normalized.startswith(prefix):
            next_week = True
            normalized = normalized[len(prefix) :].strip()
            break

    for removable in ("el ", "este ", "this ", "la "):
        if normalized.startswith(removable):
            normalized = normalized[len(removable) :].strip()
            break

    if normalized in WEEKDAY_INDEX:
        return _resolve_weekday(reference, WEEKDAY_INDEX[normalized], next_week=next_week)

    return date.fromisoformat(value.strip())


def parse_reservation_time(value: str) -> str:
    """Normalize reservation times to HH:MM (24h)."""
    raw = value.strip().lower().replace(".", "")

    match = re.fullmatch(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)", raw)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        if match.group(3) == "pm" and hour < 12:
            hour += 12
        if match.group(3) == "am" and hour == 12:
            hour = 0
        return f"{hour:02d}:{minute:02d}"

    match = re.fullmatch(r"(\d{1,2}):(\d{2})", raw)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2))
        if hour > 23 or minute > 59:
            raise ValueError("Hora inválida, usar HH:MM")
        return f"{hour:02d}:{minute:02d}"

    raise ValueError("Hora inválida, usar HH:MM o formatos como 8pm")


def validate_email(email: str) -> bool:
    """Validate that the email is valid."""
    return "@" in email and "." in email


def validate_date(value: str) -> bool:
    """Validate that the date is valid."""
    parsed_date = datetime.strptime(value, "%Y-%m-%d").date()
    if parsed_date < date.today():
        return False

    if (
        parsed_date.year != date.today().year
        and parsed_date.year != date.today().year + 1
    ):
        return False

    return True
