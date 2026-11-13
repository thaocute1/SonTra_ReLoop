"""Tests for health-based tour recommendation (plan §9).

Covers the rule engine, both tool adapters, the registry switch, prompt hygiene
and the agent loop. No database access: the domain service is mocked.
"""
import datetime
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from django.db import DatabaseError

from .core import AgentPipelineError, ModelTurn, ToolCall, ToolContext
from .health import HealthProfile, build_profile_prompt, recommend_difficulty
from .runtime.agent import run_agent_loop
from .tools.catalog import registry_for_context
from .tools.tour_adapter import (
    MAX_DISTANCE_KM,
    search_tours_by_ai_filter,
    search_tours_by_health,
)

HEALTH_KEYS = {"age", "bmi", "weight_kg", "height_cm", "fitness_level"}
TOOL_KEYS = {
    "id",
    "title",
    "description",
    "cover_image_url",
    "price",
    "difficulty_level",
    "duration_hours",
    "avg_rating",
}


def make_user(**overrides):
    values = {
        "id": 42,
        "is_authenticated": True,
        "role": "customer",
        "name": "Nguyễn Văn A",
        "email": "a@example.com",
        "phone": "0901234567",
        "date_of_birth": None,
        "height_cm": None,
        "weight_kg": None,
        "fitness_level": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def write_context(user=None, **overrides):
    values = {
        "age": 65,
        "bmi": 33.2,
        "fitness_level": "beginner",
        "height_cm": 160.0,
        "weight_kg": 85.0,
    }
    values.update(overrides)
    return ToolContext(user=user, request_id="request-health", health_profile=HealthProfile(**values))


def age_from(dob):
    today = datetime.date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class QueueProvider:
    name = "deepseek"

    def __init__(self, turns):
        self.turns = list(turns)
        self.messages = []
        self.tool_definitions = []

    def complete(self, messages, tools, iteration):
        self.messages.append([dict(message) for message in messages])
        self.tool_definitions.append(tools)
        return self.turns.pop(0)


class HealthProfileTests(unittest.TestCase):
    def test_full_profile_computes_age_and_bmi(self):
        dob = datetime.date(1990, 5, 15)
        user = make_user(
            date_of_birth=dob,
            height_cm=170,
            weight_kg=70,
            fitness_level="intermediate",
        )
        profile = HealthProfile.from_user(user)
        self.assertEqual(profile.age, age_from(dob))
        self.assertEqual(profile.bmi, 24.2)
        self.assertEqual(profile.fitness_level, "intermediate")
        self.assertTrue(profile.is_complete)

    def test_missing_date_of_birth_leaves_age_none(self):
        profile = HealthProfile.from_user(make_user(fitness_level="advanced"))
        self.assertIsNone(profile.age)
        self.assertEqual(profile.fitness_level, "advanced")

    def test_future_date_of_birth_is_ignored(self):
        future = datetime.date.today() + datetime.timedelta(days=365)
        profile = HealthProfile.from_user(make_user(date_of_birth=future))
        self.assertIsNone(profile.age)
        self.assertFalse(profile.is_complete)

    def test_invalid_date_of_birth_type_is_ignored(self):
        profile = HealthProfile.from_user(make_user(date_of_birth="not-a-date"))
        self.assertIsNone(profile.age)

    def test_zero_height_or_weight_disables_bmi(self):
        self.assertIsNone(HealthProfile.from_user(make_user(height_cm=0, weight_kg=70)).bmi)
        self.assertIsNone(HealthProfile.from_user(make_user(height_cm=170, weight_kg=0)).bmi)

    def test_implausible_height_is_ignored(self):
        profile = HealthProfile.from_user(make_user(height_cm=1700, weight_kg=70))
        self.assertIsNone(profile.height_cm)
        self.assertIsNone(profile.bmi)

    def test_profile_ui_vocabulary_is_mapped_to_rule_levels(self):
        cases = {
            "low_fitness": "beginner",
            "normal": "intermediate",
            "fit": "advanced",
            " FiT ": "advanced",
            "athlete": "athlete",
        }
        for stored, mapped in cases.items():
            with self.subTest(stored=stored):
                self.assertEqual(
                    HealthProfile.from_user(make_user(fitness_level=stored)).fitness_level,
                    mapped,
                )

    def test_invalid_fitness_level_becomes_none(self):
        profile = HealthProfile.from_user(make_user(fitness_level="superman"))
        self.assertIsNone(profile.fitness_level)

    def test_none_user_produces_empty_profile(self):
        self.assertFalse(HealthProfile.from_user(None).is_complete)

    def test_context_from_request_reads_authenticated_user_only(self):
        dob = datetime.date(1960, 5, 15)
        request = SimpleNamespace(
            user=make_user(
                date_of_birth=dob,
                height_cm=160,
                weight_kg=85,
                fitness_level="beginner",
            )
        )
        context = ToolContext.from_request(request, "request-1")
        self.assertEqual(context.health_profile.fitness_level, "beginner")
        self.assertEqual(context.health_profile.bmi, 33.2)
        self.assertEqual(context.health_profile.age, age_from(dob))

    def test_context_without_user_has_no_profile(self):
        self.assertIsNone(
            ToolContext.from_request(SimpleNamespace(user=None), "request-1").health_profile
        )

    def test_profile_prompt_contains_indicators_only(self):
        profile = HealthProfile(
            age=65, bmi=33.2, fitness_level="beginner", height_cm=160.0, weight_kg=85.0
        )
        prompt = build_profile_prompt(profile)
        self.assertEqual(
            prompt,
            "User profile: age=65, height_cm=160, weight_kg=85, "
            "bmi=33.2, fitness_level=beginner",
        )
        for forbidden in ("Nguyễn", "a@example.com", "0901234567", "1960-05-15", "user_id"):
            self.assertNotIn(forbidden, prompt)

    def test_profile_prompt_is_none_when_incomplete(self):
        self.assertIsNone(build_profile_prompt(HealthProfile()))
        self.assertIsNone(build_profile_prompt(None))


class DifficultyRuleTests(unittest.TestCase):
    def test_each_fitness_level_mapping(self):
        cases = {
            "beginner": ["easy"],
            "intermediate": ["easy", "moderate"],
            "advanced": ["moderate", "challenging"],
            "athlete": ["challenging", "expert"],
        }
        for fitness, expected in cases.items():
            with self.subTest(fitness=fitness):
                self.assertEqual(
                    recommend_difficulty(HealthProfile(fitness_level=fitness)), expected
                )

    def test_bmi_override_wins_over_fitness_level(self):
        self.assertEqual(
            recommend_difficulty(HealthProfile(fitness_level="athlete", bmi=36.0)), ["easy"]
        )

    def test_age_60_plus_without_fitness_is_easy(self):
        self.assertEqual(recommend_difficulty(HealthProfile(age=65)), ["easy"])

    def test_age_45_to_59_without_fitness(self):
        self.assertEqual(
            recommend_difficulty(HealthProfile(age=50, bmi=28)), ["easy", "moderate"]
        )
        self.assertEqual(recommend_difficulty(HealthProfile(age=50, bmi=31)), ["easy"])

    def test_age_25_to_44_without_fitness(self):
        self.assertEqual(
            recommend_difficulty(HealthProfile(age=30, bmi=24)), ["moderate", "challenging"]
        )
        self.assertEqual(
            recommend_difficulty(HealthProfile(age=30, bmi=27)), ["easy", "moderate"]
        )

    def test_underweight_is_conservative(self):
        self.assertEqual(recommend_difficulty(HealthProfile(age=20, bmi=13.7)), ["easy"])
        self.assertEqual(recommend_difficulty(HealthProfile(age=30, bmi=17.5)), ["easy"])

    def test_young_adult_without_fitness_uses_bmi(self):
        self.assertEqual(
            recommend_difficulty(HealthProfile(age=20, bmi=22)), ["moderate", "challenging"]
        )
        self.assertEqual(
            recommend_difficulty(HealthProfile(age=20, bmi=27)), ["easy", "moderate"]
        )

    def test_incomplete_profile_returns_no_filter(self):
        self.assertEqual(recommend_difficulty(HealthProfile()), [])
        self.assertEqual(recommend_difficulty(None), [])
        # BMI alone is not enough to recommend.
        self.assertEqual(recommend_difficulty(HealthProfile(bmi=22.0)), [])


class HealthToolTests(unittest.TestCase):
    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_difficulties"
    )
    def test_uses_rule_difficulties_from_backend_context(self, service):
        service.return_value = [{"id": 1, "title": "Bãi Bắc"}]
        result = search_tours_by_health({}, write_context())
        service.assert_called_once_with(["easy"], search=None, limit=5)
        self.assertEqual(result, [{"id": 1, "title": "Bãi Bắc"}])

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_difficulties"
    )
    def test_passes_only_the_free_text_query(self, service):
        service.return_value = [{"id": 1}]
        search_tours_by_health({"query": "  bãi bắc "}, write_context())
        service.assert_called_once_with(["easy"], search="bãi bắc", limit=5)

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_difficulties"
    )
    def test_keyword_without_match_retries_without_query(self, service):
        service.side_effect = [[], [{"id": 7, "title": "Rừng cây đa"}]]
        result = search_tours_by_health({"query": "trekking"}, write_context())
        self.assertEqual(service.call_count, 2)
        self.assertEqual(service.call_args_list[1].kwargs, {"search": None, "limit": 5})
        self.assertEqual(result, [{"id": 7, "title": "Rừng cây đa"}])

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_health_filter"
    )
    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_difficulties"
    )
    def test_falls_back_when_profile_is_missing(self, difficulties, health_filter):
        health_filter.return_value = []
        search_tours_by_health({}, ToolContext(user=None, request_id="request-1"))
        difficulties.assert_not_called()
        health_filter.assert_called_once_with(query=None, limit=5)

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_health_filter"
    )
    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_difficulties"
    )
    def test_falls_back_when_profile_is_incomplete(self, difficulties, health_filter):
        health_filter.return_value = []
        search_tours_by_health(
            {}, ToolContext(user=None, request_id="request-1", health_profile=HealthProfile())
        )
        difficulties.assert_not_called()
        health_filter.assert_called_once_with(query=None, limit=5)

    def test_rejects_health_arguments_from_model(self):
        for arguments in (
            {"age": 30},
            {"bmi": 22},
            {"fitness_level": "athlete"},
            {"weight": 70},
        ):
            with self.subTest(arguments=arguments):
                with self.assertRaises(AgentPipelineError) as error:
                    search_tours_by_health(arguments, write_context())
                self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_difficulties"
    )
    def test_results_follow_the_difficulty_priority(self, service):
        service.return_value = [
            {"id": 2, "difficulty_level": "moderate"},
            {"id": 1, "difficulty_level": "easy"},
            {"id": 3, "difficulty_level": "moderate"},
        ]
        context = ToolContext(
            user=None,
            request_id="request-health",
            health_profile=HealthProfile(fitness_level="intermediate"),
        )
        result = search_tours_by_health({}, context)
        self.assertEqual([tour["id"] for tour in result], [1, 2, 3])

    def test_rejects_over_long_query(self):
        with self.assertRaises(AgentPipelineError) as error:
            search_tours_by_health({"query": "x" * 201}, write_context())
        self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    def test_rejects_non_string_query(self):
        with self.assertRaises(AgentPipelineError) as error:
            search_tours_by_health({"query": 12}, write_context())
        self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_difficulties",
        side_effect=DatabaseError(),
    )
    def test_database_failure_is_normalized(self, _service):
        with self.assertRaises(AgentPipelineError) as error:
            search_tours_by_health({}, write_context())
        self.assertEqual(error.exception.code, "BACKEND_UNAVAILABLE")


class AiFilterToolTests(unittest.TestCase):
    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_health_filter"
    )
    def test_valid_filters_are_forwarded(self, service):
        service.return_value = [{"id": 1}]
        search_tours_by_ai_filter(
            {"query": "leo núi", "difficulties": ["easy", "moderate"], "max_distance_km": 8},
            write_context(),
        )
        service.assert_called_once_with(
            query="leo núi",
            difficulties=["easy", "moderate"],
            max_distance_km=8.0,
            limit=5,
        )

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_health_filter"
    )
    def test_max_distance_is_hard_capped(self, service):
        service.return_value = []
        search_tours_by_ai_filter({"max_distance_km": 999}, write_context())
        self.assertEqual(service.call_args.kwargs["max_distance_km"], MAX_DISTANCE_KM)

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_health_filter"
    )
    def test_difficulties_are_limited_to_two(self, service):
        service.return_value = []
        search_tours_by_ai_filter(
            {"difficulties": ["easy", "moderate", "challenging"]}, write_context()
        )
        self.assertEqual(service.call_args.kwargs["difficulties"], ["easy", "moderate"])

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_health_filter"
    )
    def test_ai_filter_keyword_without_match_retries_without_query(self, service):
        service.side_effect = [[], [{"id": 7}]]
        result = search_tours_by_ai_filter(
            {"query": "trekking", "difficulties": ["easy"]}, write_context()
        )
        self.assertEqual(service.call_count, 2)
        self.assertIsNone(service.call_args_list[1].kwargs["query"])
        self.assertEqual(result, [{"id": 7}])

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_health_filter"
    )
    def test_no_filters_queries_the_published_catalog(self, service):
        service.return_value = []
        search_tours_by_ai_filter({}, write_context())
        service.assert_called_once_with(
            query=None, difficulties=None, max_distance_km=None, limit=5
        )

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_health_filter"
    )
    def test_bmi_safety_override_clamps_ai_filters(self, service):
        service.return_value = []
        search_tours_by_ai_filter(
            {"difficulties": ["moderate", "challenging"]},
            write_context(bmi=36.0, fitness_level="athlete"),
        )
        self.assertEqual(service.call_args.kwargs["difficulties"], ["easy"])

    def test_invalid_difficulty_value_is_rejected(self):
        with self.assertRaises(AgentPipelineError) as error:
            search_tours_by_ai_filter({"difficulties": ["easy", "extreme"]}, write_context())
        self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    def test_difficulties_must_be_a_list(self):
        with self.assertRaises(AgentPipelineError) as error:
            search_tours_by_ai_filter({"difficulties": "easy"}, write_context())
        self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    def test_invalid_max_distance_values_are_rejected(self):
        for value in (0, -5, "10", True, []):
            with self.subTest(value=value):
                with self.assertRaises(AgentPipelineError) as error:
                    search_tours_by_ai_filter({"max_distance_km": value}, write_context())
                self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    def test_rejects_health_arguments_from_model(self):
        with self.assertRaises(AgentPipelineError) as error:
            search_tours_by_ai_filter({"age": 30}, write_context())
        self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    def test_rejects_over_long_query(self):
        with self.assertRaises(AgentPipelineError) as error:
            search_tours_by_ai_filter({"query": "x" * 201}, write_context())
        self.assertEqual(error.exception.code, "INVALID_TOOL_ARGUMENTS")

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_health_filter",
        side_effect=DatabaseError(),
    )
    def test_database_failure_is_normalized(self, _service):
        with self.assertRaises(AgentPipelineError) as error:
            search_tours_by_ai_filter({"difficulties": ["easy"]}, write_context())
        self.assertEqual(error.exception.code, "BACKEND_UNAVAILABLE")

    @patch(
        "apps.cms_chatbot.agent_pipeline.tools.tour_adapter.TourService.get_tours_by_health_filter"
    )
    def test_tool_output_carries_no_health_data(self, service):
        service.return_value = [
            {
                "id": 1,
                "title": "Bãi Bắc",
                "description": "Dễ",
                "cover_image_url": None,
                "price": "500000.00",
                "difficulty_level": "easy",
                "duration_hours": "3.00",
                "avg_rating": "4.50",
            }
        ]
        result = search_tours_by_ai_filter(
            {"difficulties": ["easy"], "max_distance_km": 8}, write_context()
        )
        self.assertEqual(set(result[0]), TOOL_KEYS)
        self.assertFalse(HEALTH_KEYS & set(result[0]))


class RegistrySwitchTests(unittest.TestCase):
    def _names(self, env, user=None):
        with patch.dict(os.environ, env):
            return registry_for_context(
                ToolContext(user=user or make_user(), request_id="request-1")
            ).names()

    def test_default_method_exposes_only_the_rule_tool(self):
        self.assertEqual(
            self._names(
                {"AI_HEALTH_METHOD": "rule", "AI_HEALTH_RECOMMENDATION_ENABLED": "true"}
            ),
            ["search_tours", "search_tours_by_health"],
        )

    def test_ai_filter_method_exposes_only_the_ai_tool(self):
        self.assertEqual(
            self._names(
                {"AI_HEALTH_METHOD": "ai_filter", "AI_HEALTH_RECOMMENDATION_ENABLED": "true"}
            ),
            ["search_tours", "search_tours_by_ai_filter"],
        )

    def test_unknown_method_falls_back_to_rule(self):
        self.assertEqual(
            self._names({"AI_HEALTH_METHOD": "something-else"}),
            ["search_tours", "search_tours_by_health"],
        )

    def test_feature_can_be_disabled(self):
        self.assertEqual(
            self._names({"AI_HEALTH_RECOMMENDATION_ENABLED": "false"}),
            ["search_tours"],
        )

    def test_vendor_registry_does_not_duplicate_public_tools(self):
        with patch.dict(os.environ, {"AI_HEALTH_METHOD": "rule"}):
            vendor = registry_for_context(
                ToolContext(user=make_user(role="vendor_admin"), request_id="request-1")
            ).names()
        self.assertEqual(vendor.count("search_tours_by_health"), 1)


class AgentPromptTests(unittest.TestCase):
    @patch("apps.cms_chatbot.agent_pipeline.runtime.agent.execute_tool")
    def test_customer_prompt_has_health_policy_without_profile(self, execute_tool_mock):
        execute_tool_mock.return_value = []
        provider = QueueProvider(
            [ModelTurn(provider="deepseek", content="Chào bạn.", tool_calls=[])]
        )
        with patch.dict(
            os.environ,
            {"AI_HEALTH_METHOD": "rule", "AI_HEALTH_RECOMMENDATION_ENABLED": "true"},
        ):
            run_agent_loop("Xin chào", provider, context=write_context())
        system_message = provider.messages[0][0]["content"]
        self.assertIn("GỢI Ý TOUR THEO SỨC KHỎE", system_message)
        self.assertIn("search_tours_by_health", system_message)
        self.assertNotIn("User profile:", system_message)
        self.assertNotIn("bmi=33.2", system_message)

    @patch("apps.cms_chatbot.agent_pipeline.runtime.agent.execute_tool")
    def test_ai_filter_prompt_carries_indicators_only(self, execute_tool_mock):
        execute_tool_mock.return_value = []
        provider = QueueProvider(
            [ModelTurn(provider="deepseek", content="Chào bạn.", tool_calls=[])]
        )
        context = write_context(
            user=make_user(
                name="Nguyễn Văn A",
                email="a@example.com",
                phone="0901234567",
                date_of_birth=datetime.date(1960, 5, 15),
            )
        )
        with patch.dict(
            os.environ,
            {"AI_HEALTH_METHOD": "ai_filter", "AI_HEALTH_RECOMMENDATION_ENABLED": "true"},
        ):
            run_agent_loop("Tôi muốn tour nhẹ nhàng", provider, context=context)
        system_message = provider.messages[0][0]["content"]
        self.assertIn("User profile: age=65", system_message)
        self.assertIn("fitness_level=beginner", system_message)
        self.assertIn("search_tours_by_ai_filter", system_message)
        for forbidden in (
            "Nguyễn Văn A",
            "a@example.com",
            "0901234567",
            "1960-05-15",
            "user_id",
        ):
            self.assertNotIn(forbidden, system_message)
        self.assertNotIn("HealthProfile", json.dumps(provider.messages[0], default=str))

    @patch("apps.cms_chatbot.agent_pipeline.runtime.agent.execute_tool")
    def test_rule_method_never_puts_health_values_in_messages(self, execute_tool_mock):
        execute_tool_mock.return_value = [{"id": 3, "title": "Bãi Bắc"}]
        provider = QueueProvider(
            [
                ModelTurn(
                    provider="deepseek",
                    content=None,
                    tool_calls=[
                        ToolCall(id="call-1", name="search_tours_by_health", arguments={})
                    ],
                ),
                ModelTurn(provider="deepseek", content="Có tour phù hợp.", tool_calls=[]),
            ]
        )
        with patch.dict(os.environ, {"AI_HEALTH_METHOD": "rule"}):
            result = run_agent_loop(
                "Tour phù hợp sức khỏe", provider, context=write_context()
            )
        transcript = json.dumps(provider.messages, ensure_ascii=False, default=str)
        for value in ("33.2", "160", "85", "beginner", "age="):
            self.assertNotIn(value, transcript)
        self.assertEqual(result["answer"], "Có tour phù hợp.")
        self.assertEqual(result["blocks"][0]["type"], "tour_list")
        self.assertEqual(result["blocks"][0]["items"][0]["id"], 3)

    @patch("apps.cms_chatbot.agent_pipeline.runtime.agent.execute_tool")
    def test_prompt_has_tour_card_policy(self, execute_tool_mock):
        execute_tool_mock.return_value = []
        provider = QueueProvider(
            [ModelTurn(provider="deepseek", content="Chào bạn.", tool_calls=[])]
        )
        with patch.dict(os.environ, {"AI_HEALTH_METHOD": "rule"}):
            run_agent_loop("Xin chào", provider, context=write_context())
        system_message = provider.messages[0][0]["content"]
        self.assertIn("NGUYÊN TẮC TRẢ LỜI KHI CÓ TOUR CARD", system_message)
        self.assertIn("KHÔNG lặp lại thông tin đã có trên card", system_message)

    @patch("apps.cms_chatbot.agent_pipeline.runtime.agent.execute_tool")
    def test_blocks_keep_full_tour_data_when_text_is_short(self, execute_tool_mock):
        card = {
            "id": 7,
            "title": "Khám Phá Rừng Cây Đa Ngàn Năm Sơn Trà",
            "description": "Trekking nhẹ dưới tán rừng nguyên sinh.",
            "cover_image_url": "https://example.test/cover.jpg",
            "price": "380000",
            "difficulty_level": "easy",
            "duration_hours": "3.5",
            "avg_rating": "4.8",
        }
        execute_tool_mock.return_value = [card]
        short_answer = "Mình gợi ý tour Khám Phá Rừng Cây Đa Ngàn Năm Sơn Trà."
        provider = QueueProvider(
            [
                ModelTurn(
                    provider="deepseek",
                    content=None,
                    tool_calls=[ToolCall(id="call-1", name="search_tours", arguments={"query": "cây đa"})],
                ),
                ModelTurn(provider="deepseek", content=short_answer, tool_calls=[]),
            ]
        )
        result = run_agent_loop("Tìm tour nhẹ nhàng", provider, context=write_context())
        self.assertEqual(result["answer"], short_answer)
        items = result["blocks"][0]["items"]
        self.assertEqual(items, [card])
        for field in ("title", "price", "duration_hours", "avg_rating", "difficulty_level", "cover_image_url"):
            self.assertIn(field, items[0])

    @patch("apps.cms_chatbot.agent_pipeline.runtime.agent.execute_tool")
    def test_vendor_prompt_has_no_health_policy(self, execute_tool_mock):
        execute_tool_mock.return_value = []
        provider = QueueProvider(
            [ModelTurn(provider="deepseek", content="Báo cáo.", tool_calls=[])]
        )
        with patch.dict(os.environ, {"AI_HEALTH_METHOD": "ai_filter"}):
            run_agent_loop(
                "Doanh thu tháng này",
                provider,
                context=write_context(user=make_user(role="vendor_admin")),
            )
        system_message = provider.messages[0][0]["content"]
        self.assertNotIn("GỢI Ý TOUR THEO SỨC KHỎE", system_message)
        self.assertNotIn("User profile:", system_message)

    @patch("apps.cms_chatbot.agent_pipeline.runtime.agent.execute_tool")
    def test_disabled_feature_removes_policy_and_tool(self, execute_tool_mock):
        execute_tool_mock.return_value = []
        provider = QueueProvider(
            [ModelTurn(provider="deepseek", content="Chào bạn.", tool_calls=[])]
        )
        with patch.dict(os.environ, {"AI_HEALTH_RECOMMENDATION_ENABLED": "false"}):
            run_agent_loop("Xin chào", provider, context=write_context())
        system_message = provider.messages[0][0]["content"]
        self.assertNotIn("GỢI Ý TOUR THEO SỨC KHỎE", system_message)
        tool_names = [tool["name"] for tool in provider.tool_definitions[0]]
        self.assertEqual(tool_names, ["search_tours"])

    @patch("apps.cms_chatbot.agent_pipeline.runtime.agent.execute_tool")
    def test_agent_loop_dispatches_ai_filter_tool(self, dispatch):
        dispatch.return_value = [{"id": 9, "title": "Tour nhẹ"}]
        provider = QueueProvider(
            [
                ModelTurn(
                    provider="deepseek",
                    content=None,
                    tool_calls=[
                        ToolCall(
                            id="call-2",
                            name="search_tours_by_ai_filter",
                            arguments={"difficulties": ["easy"], "max_distance_km": 8},
                        )
                    ],
                ),
                ModelTurn(provider="deepseek", content="Đã gợi ý.", tool_calls=[]),
            ]
        )
        with patch.dict(os.environ, {"AI_HEALTH_METHOD": "ai_filter"}):
            result = run_agent_loop(
                "Gợi ý tour phù hợp", provider, context=write_context()
            )
        dispatch.assert_called_once()
        self.assertEqual(dispatch.call_args.args[0], "search_tours_by_ai_filter")
        self.assertEqual(result["blocks"][0]["items"][0]["id"], 9)


if __name__ == "__main__":
    unittest.main()
