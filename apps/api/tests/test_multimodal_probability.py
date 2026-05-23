import os
import asyncio

os.environ["AI_PROVIDER"] = "fake"

from lovemaster_api.multimodal import ProbabilityAnalysisService, RewriteService


def test_rewrite_service_returns_clean_question():
    service = RewriteService()

    result = asyncio.run(service.optimize("他说最近很忙，我想问怎么回"))

    assert result["optimizedText"]
    assert "他说最近很忙" in result["optimizedText"]


def test_probability_service_returns_frontend_card_shape():
    service = ProbabilityAnalysisService()

    result = asyncio.run(service.analyze("她主动约我下次见面，成功率高吗？", rag_context="主动邀约是正向信号"))

    assert 0 <= result["probability"] <= 100
    assert result["tier"]
    assert result["greenFlags"]
    assert result["redFlags"]
    assert len(result["nextActions"]) == 3
