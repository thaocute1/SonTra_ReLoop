import unittest
from types import SimpleNamespace

from .core import AgentPipelineError, ToolContext
from .tools.customer_analytics import customer_segments
from .tools.recommendations import business_recommendations
from .tools.catalog import registry_for_context


class AnalyticsProjectionTests(unittest.TestCase):
    def test_small_cohorts_are_suppressed_without_pii(self):
        rows = [{"total_price": 100, "status": "completed", "customer_id": index} for index in range(4)]
        result = customer_segments(rows)
        self.assertEqual(result["segments"], [])
        self.assertEqual(result["suppressed_cohorts"], 1)
        self.assertNotIn("customer_id", str(result))

    def test_recommendations_are_deterministic_and_have_evidence(self):
        rows = [{"total_price": 100, "status": "completed", "segment": "returning"} for _ in range(5)]
        projection = customer_segments(rows)
        first = business_recommendations(projection)
        self.assertEqual(first, business_recommendations(projection))
        self.assertIn("evidence", first["recommendations"][0])
        self.assertIn("rule_version", first["recommendations"][0])

    def test_vendor_registry_does_not_accept_scope_arguments(self):
        user = SimpleNamespace(is_authenticated=True, role="vendor_admin", id=10)
        registry = registry_for_context(ToolContext(user, "test", vendor_id=7))
        self.assertIn("get_vendor_customer_segments", registry.names())
        with self.assertRaises(AgentPipelineError):
            registry.get("get_vendor_revenue_report").handler({"vendor_id": 99}, ToolContext(user, "test", vendor_id=7))
