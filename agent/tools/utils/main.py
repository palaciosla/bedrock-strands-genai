from datetime import datetime


def normalize_time(time_str: str) -> str:
    """Convierte '20:00' → '20:00:00' para match con PostgreSQL TIME."""
    if len(time_str) == 5:  # "HH:MM"
        return f"{time_str}:00"
    return time_str


def validate_email(email: str) -> bool:
    """Valida que el email sea valido."""
    return "@" in email and "." in email


def validate_date(date: str) -> bool:
    """Valida que la fecha sea valida."""
    parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
    if parsed_date < date.today():
        return False

    if (
        parsed_date.year != date.today().year
        and parsed_date.year != date.today().year + 1
    ):
        return False

    return True
