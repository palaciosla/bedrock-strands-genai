from strands import tool
from strands.types.tools import ToolContext
from agent.db.main import supabase
from typing import Optional
from datetime import date
import re
from agent.tools.utils.main import normalize_time
from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator,
    ValidationError,
)

MAX_COVERS_PER_SLOT = 15


def _validation_message(exc: ValidationError) -> str:
    msg = exc.errors()[0].get("msg", "Datos de reserva inválidos")
    if isinstance(msg, str) and msg.startswith("Value error, "):
        return msg.removeprefix("Value error, ")
    return str(msg)


class ReservationCreate(BaseModel):
    guest_name: str = Field(min_length=2, max_length=60)
    guest_email: EmailStr
    party_size: int = Field(ge=1, le=20)
    reservation_date: date
    reservation_time: str
    notes: str | None = None

    @field_validator("guest_name")
    @classmethod
    def name_not_placeholder(cls, v: str) -> str:
        v = v.strip()
        if v.lower() in {"test", "user", "testing", "nombre", "example"}:
            raise ValueError("Nombre invalido")
        return v

    @field_validator("reservation_time")
    @classmethod
    def valid_time(cls, v: str) -> str:
        if not re.fullmatch(r"(\d{1,2}):(\d{2})", v):
            raise ValueError("Hora inválida, usar HH:MM")
        return v

    @model_validator(mode="after")
    def date_not_in_past(self) -> "ReservationCreate":
        if self.reservation_date < date.today():
            raise ValueError("La fecha no puede ser pasada")
        return self


@tool(context=True)
def create_reservation(
    guest_name: str,
    guest_email: str,
    party_size: int,
    reservation_date: str,
    reservation_time: str,
    notes: Optional[str] = None,
    *,
    tool_context: ToolContext,
) -> dict:
    """
    Create and schedule reservations for the restaurant.
    Check availability first using check_availability before creating

    Args:
        guest_name: Full name of the guest
        guest_email: Contact email
        party_size: Number of people. Must be between 1 and 20
        reservation_date: Date of the reservation. Must be in YYYY-MM-DD format
        reservation_time: Time of the reservation. Must be in HH:MM format (24hs)
        notes: Optional special guest requests

    Returns:
        Dict with success status, message and if success, reservation_id

    """

    try:
        reservation = ReservationCreate(
            guest_name=guest_name,
            guest_email=guest_email,
            party_size=party_size,
            reservation_date=reservation_date,
            reservation_time=reservation_time,
            notes=notes,
        )
    except ValidationError as exc:
        return {"success": False, "message": _validation_message(exc)}

    try:
        normalized_time = normalize_time(reservation.reservation_time)
        session_id = tool_context.invocation_state.get("session_id")
        row = {
            "guest_name": reservation.guest_name,
            "guest_email": str(reservation.guest_email),
            "party_size": reservation.party_size,
            "reservation_date": reservation.reservation_date.isoformat(),
            "reservation_time": normalized_time,
            "notes": reservation.notes,
        }
        if session_id:
            row["session_id"] = session_id
        result = supabase.table("reservations").insert(row).execute()
        return {
            "success": True,
            "reservation_id": result.data[0]["id"],
            "message": f"Reserva confirmada para {reservation.party_size} personas",
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


@tool
def check_availability(
    reservation_date: str, reservation_time: str, party_size: int = 1
) -> dict:
    """
    Check if there's availability for a given date and time.

    Args:
        reservation_date: Date in YYYY-MM-DD format.
        reservation_time: Time in HH:MM format (24h).
        party_size: Number of people requesting (default 1).
    Returns:
        Dict with availability status and current occupancy.

    """

    if not reservation_date or not reservation_time:
        return {"success": False, "message": "La fecha y el horario son necesarios"}

    if party_size > 20 or party_size < 1:
        return {"success": False, "message": "La cantidad de invitados no es valida"}

    try:
        print("Checking availability")
        normalized_time = normalize_time(reservation_time)
        response = (
            supabase.table("reservations")
            .select("party_size")
            .eq("reservation_date", reservation_date)
            .eq("reservation_time", normalized_time)
            .eq("status", "confirmed")
            .execute()
        )

        current_covers = sum(r["party_size"] for r in response.data)

        available = (current_covers + party_size) <= MAX_COVERS_PER_SLOT

        return {
            "success": True,
            "available": available,
            "current_covers": current_covers,
            "max_covers": MAX_COVERS_PER_SLOT,
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


@tool
def get_reservations(
    guest_email: str,
    reservation_date: Optional[str] = None,
    reservation_time: Optional[str] = None,
) -> dict:
    """
    Get reservations for a guest by email

    Args:
        guest_email: Customer's email
        reservation_date: Optional filter by date (YYYY-MM-DD).
        reservation_time: Optional filter by time (HH:MM).

    Returns:
        Dict with list of matching reservations or error message.

    """

    if not guest_email:
        return {"success": False, "message": "Email es necesario"}
    if "@" not in guest_email:
        return {"success": False, "message": "Email invalido"}

    try:
        query = (
            supabase.table("reservations").select("*").eq("guest_email", guest_email)
        )

        if reservation_date:
            query = query.eq("reservation_date", reservation_date)

        if reservation_time:
            normalized_time = normalize_time(reservation_time)
            query = query.eq("reservation_time", normalized_time)

        response = query.execute()

        return {
            "success": True,
            "reservations": response.data,
            "count": len(response.data),
        }
    except Exception as e:
        return {"success": False, "message": str(e)}
