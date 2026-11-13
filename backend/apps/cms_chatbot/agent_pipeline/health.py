"""Pure health-profile rules used by the tour recommendation tools.

This module is deliberately dependency-free: it never queries the database,
never writes anything and never serializes a profile into a provider message.
Only computed indicators (age, height, weight, BMI, fitness level) may leave
it, and only through :func:`build_profile_prompt`.
"""
import datetime
from dataclasses import dataclass

VALID_FITNESS_LEVELS = frozenset({"beginner", "intermediate", "advanced", "athlete"})

# The profile UI (web/src/features/dashboard/components/ProfileEditModal.jsx)
# stores a different vocabulary than the difficulty rules use. Map it here so
# real user data can drive the rule engine.
FITNESS_LEVEL_ALIASES = {
    "low_fitness": "beginner",
    "normal": "intermediate",
    "fit": "advanced",
}

# Safety bounds: values outside these ranges are treated as missing instead of
# producing a misleading BMI (e.g. a height typed in millimetres).
PLAUSIBLE_HEIGHT_CM = (80.0, 250.0)
PLAUSIBLE_WEIGHT_KG = (20.0, 400.0)
MAX_PLAUSIBLE_AGE = 120

BMI_SAFETY_THRESHOLD = 35.0


@dataclass(frozen=True)
class HealthProfile:
    """Backend-computed health indicators for the authenticated user.

    ``height_cm`` / ``weight_kg`` are kept next to ``bmi`` so the AI-driven
    method can build an indicator-only prompt. They are never accepted from
    tool arguments or the client request body.
    """

    age: int | None = None
    bmi: float | None = None
    fitness_level: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None

    @classmethod
    def from_user(cls, user) -> "HealthProfile":
        age = cls._age_from(getattr(user, "date_of_birth", None))
        height_cm = cls._plausible(getattr(user, "height_cm", None), PLAUSIBLE_HEIGHT_CM)
        weight_kg = cls._plausible(getattr(user, "weight_kg", None), PLAUSIBLE_WEIGHT_KG)

        bmi = None
        if height_cm is not None and weight_kg is not None:
            try:
                bmi = round(weight_kg / ((height_cm / 100) ** 2), 1)
            except (TypeError, ValueError, ZeroDivisionError):
                bmi = None

        raw_fitness = getattr(user, "fitness_level", None)
        fitness = None
        if isinstance(raw_fitness, str):
            normalized = raw_fitness.strip().lower()
            fitness = normalized if normalized in VALID_FITNESS_LEVELS else FITNESS_LEVEL_ALIASES.get(normalized)
        return cls(
            age=age,
            bmi=bmi,
            fitness_level=fitness,
            height_cm=height_cm,
            weight_kg=weight_kg,
        )

    @staticmethod
    def _age_from(dob) -> int | None:
        if not dob:
            return None
        try:
            today = datetime.date.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        except (AttributeError, TypeError, ValueError):
            return None
        if age < 0 or age > MAX_PLAUSIBLE_AGE:
            return None
        return age

    @staticmethod
    def _plausible(value, bounds: tuple[float, float]) -> float | None:
        try:
            number = float(value) if value is not None else 0.0
        except (TypeError, ValueError):
            return None
        if not bounds[0] <= number <= bounds[1]:
            return None
        return number

    @property
    def is_complete(self) -> bool:
        """True when at least one indicator can drive a recommendation."""
        return self.fitness_level is not None or self.age is not None


def recommend_difficulty(profile: HealthProfile | None) -> list[str]:
    """Map a profile to an ordered difficulty list (pure, deterministic).

    Rules are intentionally conservative: when in doubt, prefer easier tours.
    """
    if profile is None or not profile.is_complete:
        return []

    # Safety override — applies regardless of the declared fitness level.
    if profile.bmi is not None and profile.bmi >= BMI_SAFETY_THRESHOLD:
        return ["easy"]

    if profile.fitness_level == "beginner":
        return ["easy"]
    if profile.fitness_level == "intermediate":
        return ["easy", "moderate"]
    if profile.fitness_level == "advanced":
        return ["moderate", "challenging"]
    if profile.fitness_level == "athlete":
        return ["challenging", "expert"]

    # Fallback on age when fitness_level is missing.
    if profile.age is not None:
        if profile.age >= 60:
            return ["easy"]
        # Underweight is a safety risk on the trail, whatever the age.
        if profile.bmi is not None and profile.bmi < 18.5:
            return ["easy"]
        if 45 <= profile.age < 60:
            if profile.bmi is None or profile.bmi < 30:
                return ["easy", "moderate"]
            return ["easy"]
        if profile.age < 45:
            # Covers adults under 25 too: without any fitness level the age band
            # above 25 is the only usable signal.
            if profile.bmi is None or profile.bmi < 25:
                return ["moderate", "challenging"]
            return ["easy", "moderate"]

    return []


def build_profile_prompt(profile: HealthProfile | None) -> str | None:
    """Build the indicator-only prompt fragment for the AI-driven method.

    The returned string never contains identifying data (name, email, phone,
    raw date of birth, user id). Returns ``None`` when nothing is usable.
    """
    if profile is None or not profile.is_complete:
        return None
    parts = []
    if profile.age is not None:
        parts.append(f"age={profile.age}")
    if profile.height_cm is not None:
        parts.append(f"height_cm={profile.height_cm:g}")
    if profile.weight_kg is not None:
        parts.append(f"weight_kg={profile.weight_kg:g}")
    if profile.bmi is not None:
        parts.append(f"bmi={profile.bmi}")
    if profile.fitness_level is not None:
        parts.append(f"fitness_level={profile.fitness_level}")
    if not parts:
        return None
    return "User profile: " + ", ".join(parts)
