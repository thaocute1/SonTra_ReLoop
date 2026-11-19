"""Evaluate the health-based tour recommendation for one user across scenarios.

Dry-run (default): prints the backend health profile and the rule expectation.
--apply: temporarily writes the scenario body metrics to the user, runs the
agent loop with the real provider, then always restores the original values.

The command is read-only for tours: it never writes anything except the
temporary user metrics, which are restored in a finally block.
"""
import json
import os

from types import SimpleNamespace

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models.user_models import Users
from apps.cms_chatbot.agent_pipeline.core import ToolContext
from apps.cms_chatbot.agent_pipeline.health import HealthProfile, recommend_difficulty
from apps.cms_chatbot.agent_pipeline.runtime.agent import run_agent_loop
from apps.cms_chatbot.agent_pipeline.runtime.providers import get_provider

MESSAGE = "Tôi muốn tìm tour phù hợp với thể trạng sức khỏe của tôi"
FIELDS = ("date_of_birth", "height_cm", "weight_kg", "fitness_level")

# fitness_level values are constrained by ck_users_fitness_level_values
# to fit | normal | low_fitness (NULL allowed).
SCENARIOS = {
    "S1_low_fitness_65y_bmi33": ("1961-05-01", 160, 85, "low_fitness"),
    "S2_normal_30y_bmi22": ("1996-05-01", 170, 64, "normal"),
    "S3_fit_30y_bmi24": ("1996-05-01", 170, 70, "fit"),
    "S4_fit_bmi36_override": ("1996-05-01", 160, 92, "fit"),
    "S5_no_fitness_65y_bmi28": ("1961-05-01", 165, 76, None),
    "S6_no_profile": (None, None, None, None),
    "S7_real_profile": None,  # filled from the user's current values
}


def _parse_date(value):
    if not value:
        return None
    import datetime

    return datetime.date.fromisoformat(value)


class Command(BaseCommand):
    help = "Evaluate health-based tour recommendation (rule vs ai_filter) for a user."

    def add_arguments(self, parser):
        parser.add_argument("--user-id", type=int, required=True)
        parser.add_argument("--method", choices=("rule", "ai_filter", "both"), default="both")
        parser.add_argument("--scenario", default="", help="Run a single scenario key.")
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write scenario metrics to the user and call the provider (restored afterwards).",
        )
        parser.add_argument("--json-out", default="", help="Optional path for raw results.")

    def handle(self, *args, **options):
        try:
            user = Users.objects.get(id=options["user_id"])
        except Users.DoesNotExist as error:
            raise CommandError(f"User {options['user_id']} was not found.") from error

        original = {field: getattr(user, field) for field in FIELDS}
        scenarios = self._scenarios(original, options["scenario"])
        methods = ("rule", "ai_filter") if options["method"] == "both" else (options["method"],)

        results = []
        try:
            for method in methods:
                os.environ["AI_HEALTH_METHOD"] = method
                os.environ.setdefault("AI_HEALTH_RECOMMENDATION_ENABLED", "true")
                for name, values in scenarios:
                    if options["apply"]:
                        Users.objects.filter(id=user.id).update(**values)
                        current = Users.objects.get(id=user.id)
                    else:
                        # Dry-run: simulate the scenario without touching the DB.
                        current = SimpleNamespace(**{**vars(user), **values})
                    profile = HealthProfile.from_user(current)
                    expected = recommend_difficulty(profile)
                    row = {
                        "method": method,
                        "scenario": name,
                        "profile": {
                            "age": profile.age,
                            "bmi": profile.bmi,
                            "fitness_level": profile.fitness_level,
                        },
                        "expected_difficulties": expected,
                    }
                    if options["apply"]:
                        row.update(self._run(method, current))
                    results.append(row)
                    self._print_row(row)
        finally:
            Users.objects.filter(id=user.id).update(**original)
            self.stdout.write(self.style.WARNING(f"Restored user {user.id} health metrics."))

        if options["json_out"]:
            with open(options["json_out"], "w", encoding="utf-8") as handle:
                json.dump(results, handle, ensure_ascii=False, indent=2, default=str)
            self.stdout.write(f"Raw results written to {options['json_out']}")

    def _scenarios(self, original, selected):
        scenarios = []
        for name, values in SCENARIOS.items():
            if selected and name != selected:
                continue
            if values is None:
                values = tuple(original[field] for field in FIELDS)
            else:
                values = (_parse_date(values[0]), values[1], values[2], values[3])
            scenarios.append((name, dict(zip(FIELDS, values))))
        if selected and not scenarios:
            raise CommandError(f"Unknown scenario {selected}. Options: {', '.join(SCENARIOS)}")
        return scenarios

    def _run(self, method, user):
        context = ToolContext(
            user=user,
            request_id=f"health-eval-{method}",
            health_profile=HealthProfile.from_user(user),
        )
        result = run_agent_loop(MESSAGE, get_provider(), context=context)
        blocks = result.get("blocks") or []
        tours = blocks[0]["items"] if blocks else []
        return {
            "tool_calls": [step.get("tool_name") for step in result.get("trace", []) if step.get("stage") == "tool"],
            "tour_ids": [tour.get("id") for tour in tours],
            "difficulties_returned": [tour.get("difficulty_level") for tour in tours],
            "answer": result.get("answer", ""),
        }

    def _print_row(self, row):
        profile = row["profile"]
        self.stdout.write(
            f"{row['method']:9} {row['scenario']:30} "
            f"age={profile['age']} bmi={profile['bmi']} fitness={profile['fitness_level']} "
            f"expected={row['expected_difficulties']} "
            f"returned={row.get('difficulties_returned', '-')} "
            f"tools={row.get('tool_calls', '-')}"
        )
