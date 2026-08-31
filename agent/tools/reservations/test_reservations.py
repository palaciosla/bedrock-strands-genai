from dotenv import load_dotenv

from agent.tools.reservations.reservations import (
    create_reservation,
    get_reservations,
    check_availability,
)

load_dotenv()


print(check_availability("2026-09-15", "20:00", party_size=8))
print(get_reservations("leandro@test.com"))
print(get_reservations("leandro@test.com", reservation_date="2026-09-15"))

print(
    create_reservation(
        guest_name="Leandro",
        guest_email="leandro@test.com",
        party_size=5,
        reservation_date="2026-09-15",
        reservation_time="20:00",
        notes="Somos 4. Uno es vegetariano",
    )
)

# Invalid - party_size exceeded
print(
    create_reservation(
        guest_name="Test",
        guest_email="test@test.com",
        party_size=25,
        reservation_date="2026-09-15",
        reservation_time="20:00",
    )
)
