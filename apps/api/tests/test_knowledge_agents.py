from pathlib import Path
import os

os.environ["AI_PROVIDER"] = "fake"

from lovemaster_api.agents import AgentOrchestrator
from lovemaster_api.ai_client import FakeAIClient
from lovemaster_api.knowledge import DifyKnowledgeClient, RagKnowledgeService, WikiKnowledgeService


def test_wiki_retrieval_scores_title_and_content(tmp_path: Path):
    wiki_root = tmp_path / "wiki"
    wiki_root.mkdir()
    (wiki_root / "boundaries.md").write_text(
        "---\ntitle: 边界感沟通\n---\n暧昧期需要表达边界，也要给对方台阶。",
        encoding="utf-8",
    )
    (wiki_root / "gift.md").write_text("# 送礼建议\n纪念日礼物要具体。", encoding="utf-8")

    service = WikiKnowledgeService(root=wiki_root, top_n=1)
    result = service.retrieve("暧昧期 怎么 表达 边界")

    assert result.hit_count == 1
    assert result.top_score > 0
    assert "边界感沟通" in result.content
    assert "给对方台阶" in result.content


def test_dify_response_formatter_extracts_distinct_segments():
    payload = {
        "records": [
            {"segment": {"content": "  第一条建议  "}},
            {"segment": {"content": "第一条建议"}},
            {"segment": {"content": "第二条建议"}},
        ]
    }

    assert DifyKnowledgeClient.format_response(payload) == "第一条建议\n---\n第二条建议"


def test_rag_merges_wiki_first_then_dify(tmp_path: Path):
    wiki_root = tmp_path / "wiki"
    wiki_root.mkdir()
    (wiki_root / "reply.md").write_text("# 回复节奏\n先接住情绪，再给轻量邀约。", encoding="utf-8")

    class StubDify:
        def retrieve(self, query: str) -> str:
            return "Dify 外部知识"

    rag = RagKnowledgeService(WikiKnowledgeService(wiki_root), StubDify())

    result = rag.retrieve("怎么回复邀约")

    assert "回复节奏" in result
    assert "Dify 外部知识" in result


def test_agent_orchestrator_uses_rag_context_in_love_answer(tmp_path: Path):
    wiki_root = tmp_path / "wiki"
    wiki_root.mkdir()
    (wiki_root / "tone.md").write_text("# 温和回应\n先回应感受，再给具体话术。", encoding="utf-8")
    rag = RagKnowledgeService(WikiKnowledgeService(wiki_root), None)
    agent = AgentOrchestrator(ai_client=FakeAIClient(), rag_service=rag)

    answer = agent.love_answer("我该怎么温和回应他")

    assert "温和回应" in answer
    assert "我该怎么温和回应他" in answer


def test_agent_orchestrator_detects_tool_like_coach_requests(tmp_path: Path):
    rag = RagKnowledgeService(WikiKnowledgeService(tmp_path), None)
    agent = AgentOrchestrator(ai_client=FakeAIClient(), rag_service=rag)

    decision = agent.coach_answer("帮我搜索约会地点并整理一份计划")

    assert "我会先把需要外部资料的部分拆出来" in decision
