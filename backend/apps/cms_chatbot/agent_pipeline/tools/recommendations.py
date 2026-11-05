"""Deterministic recommendation rules; this module has no side effects."""
RULE_VERSION = "analytics-mvp-v1"


def business_recommendations(projection):
    recommendations = []
    for segment in projection.get("segments", []):
        if segment["booking_count"] >= 5 and segment.get("value_average", 0) > 0:
            recommendations.append({"id": f"retain-{segment['segment']}", "title": f"Retain {segment['segment']} customers", "priority": "normal", "reason": "A sufficiently large cohort has observed bookings.", "evidence": {"segment": segment["segment"], "booking_count": segment["booking_count"], "value_average": segment["value_average"]}, "confidence": 0.6, "limitations": projection.get("limitations", []), "rule_version": RULE_VERSION})
    return {"recommendations": recommendations, "rule_version": RULE_VERSION}
