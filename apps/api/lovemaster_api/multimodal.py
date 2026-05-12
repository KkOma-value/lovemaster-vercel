from __future__ import annotations

import json
import logging
import re

from pydantic import BaseModel, Field, ValidationError

from .ai_client import AIClient

logger = logging.getLogger(__name__)


REWRITE_SYSTEM = """
你是 Lovemaster 的 RewriteAgent。只把用户口语化描述整理成更清晰的提问。
不改变用户意图，不加入用户没提到的事实，不输出分析或建议。
"""

OCR_SYSTEM = """
你是 Lovemaster 的 OcrAgent。根据用户提供的图片 URL 和描述，抽取聊天截图里的文字和场景。
无法读取图片时，要诚实说明无法识别。
"""

PROBABILITY_SYSTEM = """
你是 Lovemaster 的 ProbabilityAnalyst。严格输出以下 JSON 格式：
{
  "probability": 15-85 之间的整数,
  "tier": "极低|偏低|一般|较高|很高",
  "confidence": "low|medium|high",
  "summary": "1-2句概要",
  "greenFlags": [{"text": "信号描述", "evidence": "具体证据", "weight": "low|medium|high"}],
  "redFlags": [{"text": "风险描述", "evidence": "具体证据", "weight": "low|medium|high"}],
  "nextActions": [{"text": "可执行的具体行动", "tone": "温和|主动|稳健"}]
}
约束：greenFlags 至少 2 条，redFlags 至少 1 条，nextActions 恰好 3 条。
probability 不能低于 15 或高于 85。使用性别中立的"TA"。
"""


class Flag(BaseModel):
    text: str
    evidence: str = ""
    weight: str = "medium"


class NextAction(BaseModel):
    text: str
    tone: str = "稳健"


class ProbabilityOutput(BaseModel):
    probability: int = Field(ge=15, le=85)
    tier: str
    confidence: str = "medium"
    summary: str
    greenFlags: list[Flag] = Field(min_length=2)
    redFlags: list[Flag] = Field(min_length=1)
    nextActions: list[NextAction] = Field(min_length=3, max_length=3)


class RewriteService:
    def __init__(self, ai_client: AIClient | None = None) -> None:
        self.ai_client = ai_client or AIClient()

    async def optimize(self, user_message: str, image_url: str | None = None, mode: str = "love") -> dict:
        prompt = f"原始提问：{user_message}\n图片：{image_url or '无'}\n模式：{mode}\n请输出整理后的提问。"
        text = await self.ai_client.complete(system=REWRITE_SYSTEM, user=prompt, model=None)
        return {"optimizedText": clean_rewrite(text, user_message)}


class OcrService:
    def __init__(self, ai_client: AIClient | None = None) -> None:
        self.ai_client = ai_client or AIClient()

    async def extract(self, image_url: str | None, user_message: str) -> dict:
        """Extract OCR text from an image URL using a vision model.

        Returns dict with keys: ocrText, sceneSummary, uncertainties, visionFailed.
        If vision is not available, returns empty results with visionFailed=True.
        Does NOT fallback to sending URL as plain text.
        """
        if not image_url:
            return {"ocrText": "", "sceneSummary": "", "uncertainties": [], "visionFailed": False}

        ocr_prompt = (
            f"用户描述：{user_message}\n"
            "请仔细观察这张聊天截图，抽取以下信息：\n"
            "1. OCR_TEXT：截图中所有可见的文字内容（完整保留）\n"
            "2. SCENE_SUMMARY：简短描述截图的场景和对话氛围"
        )

        vision_text = await self.ai_client.complete_vision(
            system=OCR_SYSTEM,
            user=ocr_prompt,
            image_url=image_url,
        )

        if vision_text:
            return {
                "ocrText": extract_section(vision_text, "OCR_TEXT") or vision_text[:500],
                "sceneSummary": extract_section(vision_text, "SCENE_SUMMARY") or vision_text[:240],
                "uncertainties": [],
                "visionFailed": False,
            }

        logger.warning("Vision unavailable for image OCR: %s", image_url[:80])
        return {
            "ocrText": "",
            "sceneSummary": "",
            "uncertainties": ["图片识别暂不可用，无法读取截图内容"],
            "visionFailed": True,
        }


class ProbabilityAnalysisService:
    def __init__(self, ai_client: AIClient | None = None) -> None:
        self.ai_client = ai_client or AIClient()

    async def analyze(self, user_message: str, rag_context: str = "", ocr_text: str = "") -> dict:
        prompt = f"""
用户问题：{user_message}
OCR 摘录：{ocr_text or '无'}
知识参考：{rag_context or '无'}
请严格按照系统提示中的 JSON 格式输出概率分析。
"""
        raw = await self.ai_client.complete(system=PROBABILITY_SYSTEM, user=prompt, model=None)
        parsed = parse_json_object(raw)
        if parsed:
            try:
                validated = ProbabilityOutput.model_validate(parsed)
                return validated.model_dump()
            except ValidationError as exc:
                logger.warning("Probability validation failed, using normalized fallback: %s", exc)
                return normalize_probability(parsed)
        return heuristic_probability(user_message, rag_context, ocr_text)


def clean_rewrite(text: str, fallback: str) -> str:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^已结合上下文生成建议：", "", cleaned).strip()
    cleaned = re.sub(r"^整理后的提问[:：]", "", cleaned).strip()
    return cleaned or fallback.strip()


def extract_section(text: str, label: str) -> str:
    match = re.search(rf"{re.escape(label)}\s*[:：]\s*(.+?)(?:\n[A-Z_]+\s*[:：]|\Z)", text or "", re.S)
    return match.group(1).strip() if match else ""


def parse_json_object(text: str) -> dict | None:
    if not text:
        return None
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def normalize_probability(data: dict) -> dict:
    probability = int(data.get("probability") or 50)
    probability = max(15, min(85, probability))
    return {
        "probability": probability,
        "tier": data.get("tier") or tier_for(probability),
        "confidence": data.get("confidence") or "medium",
        "summary": data.get("summary") or "信息还不完整，建议结合更多聊天上下文判断。",
        "greenFlags": normalize_flags(data.get("greenFlags"), default_count=2, default_text="存在正向互动信号"),
        "redFlags": normalize_flags(data.get("redFlags"), default_count=1, default_text="上下文信息仍有限"),
        "nextActions": normalize_next_actions(data.get("nextActions")),
    }


def normalize_flags(flags: list | None, *, default_count: int, default_text: str) -> list[dict]:
    if flags:
        normalized = []
        for item in flags[:5]:
            if isinstance(item, str):
                normalized.append({"text": item, "evidence": "", "weight": "medium"})
            else:
                normalized.append({
                    "text": item.get("text") or "",
                    "evidence": item.get("evidence") or "",
                    "weight": item.get("weight") or "medium",
                })
        while len(normalized) < default_count:
            normalized.append({"text": default_text, "evidence": "", "weight": "medium"})
        return normalized
    return [{"text": default_text, "evidence": "", "weight": "medium"} for _ in range(default_count)]


def heuristic_probability(user_message: str, rag_context: str, ocr_text: str) -> dict:
    text = f"{user_message} {rag_context} {ocr_text}"
    score = 50
    positives = ["主动", "约", "关心", "秒回", "下次", "喜欢", "开心"]
    negatives = ["忙", "冷淡", "不回", "拒绝", "敷衍", "拉黑"]
    score += sum(6 for word in positives if word in text)
    score -= sum(8 for word in negatives if word in text)
    score = max(15, min(85, score))
    return {
        "probability": score,
        "tier": tier_for(score),
        "confidence": "medium" if ocr_text else "low",
        "summary": "根据目前信息，这是一个需要继续观察但可以轻量推进的局面。",
        "greenFlags": [
            {"text": "对话中存在可继续承接的信号", "evidence": "用户描述中包含可延续的话题", "weight": "medium"},
            {"text": "双方仍有互动意愿", "evidence": "用户主动寻求建议说明仍有期待", "weight": "medium"},
        ],
        "redFlags": [
            {"text": "仅凭当前描述无法确认 TA 的稳定意愿", "evidence": "缺少对方明确的正向反馈", "weight": "medium"},
        ],
        "nextActions": normalize_next_actions(None),
    }


_DEFAULT_ACTIONS = [
    {"text": "先用一句轻松的话接住当前话题，不急着逼问态度。", "tone": "温和"},
    {"text": "补一个低压力邀约，让 TA 可以容易地答应或改期。", "tone": "主动"},
    {"text": "如果回复仍然含糊，放慢节奏观察 TA 是否主动延续。", "tone": "稳健"},
]


def normalize_next_actions(actions) -> list[dict]:
    if not actions:
        return list(_DEFAULT_ACTIONS)
    normalized = []
    for item in actions[:3]:
        if isinstance(item, str):
            normalized.append({"text": item or "保持轻量推进。", "tone": "稳健"})
        else:
            text = item.get("text") or item.get("action") or "保持轻量推进。"
            normalized.append({"text": text, "tone": item.get("tone") or "稳健"})
    while len(normalized) < 3:
        idx = len(normalized)
        normalized.append(_DEFAULT_ACTIONS[idx])
    return normalized


def tier_for(score: int) -> str:
    if score < 30:
        return "极低"
    if score < 45:
        return "偏低"
    if score < 60:
        return "一般"
    if score < 75:
        return "较高"
    return "很高"


rewrite_service = RewriteService()
ocr_service = OcrService()
probability_service = ProbabilityAnalysisService()
