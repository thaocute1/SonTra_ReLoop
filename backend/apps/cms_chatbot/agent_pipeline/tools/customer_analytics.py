"""Deterministic, privacy-preserving projections over normalized booking rows."""
from collections import Counter, defaultdict

from ..core import AgentPipelineError

MIN_COHORT_SIZE = 5


def customer_segments(rows, min_cohort_size=MIN_COHORT_SIZE):
    if not isinstance(rows, list):
        raise AgentPipelineError("INVALID_TOOL_ARGUMENTS", "Booking rows must be a list.", 400)
    cohorts = defaultdict(list)
    for row in rows:
        key = row.get("segment") or ("flash_sale" if row.get("is_flash_sale") else "regular")
        cohorts[key].append(row)
    result = []
    suppressed = 0
    for name, cohort in sorted(cohorts.items()):
        if len(cohort) < min_cohort_size:
            suppressed += 1
            continue
        values = [float(item.get("total_price") or 0) for item in cohort]
        result.append({"segment": name, "cohort_size": len(cohort), "booking_count": len(cohort), "value_total": sum(values), "value_average": sum(values) / len(values), "status_mix": dict(Counter(item.get("status", "unknown") for item in cohort))})
    return {"segments": result, "suppressed_cohorts": suppressed, "min_cohort_size": min_cohort_size, "limitations": ["Small cohorts are suppressed; no customer identifiers or sensitive attributes are included."]}
