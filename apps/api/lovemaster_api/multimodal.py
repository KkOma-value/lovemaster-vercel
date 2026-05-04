from __future__ import annotations

import json
import re

from .ai_client import AIClient


REWRITE_SYSTEM = """
你是 Lovemaster 的 RewriteAgent。只把用户口语化描述整理成更清晰的提问。
不改变用户意图，不加入用户没提到的事实，不输出分析或建议。
"""

OCR_SYSTEM = """
你是 Lovemaster 的 OcrAgent。根据用户提供的图片 URL 和描述，抽取聊天截图里的文字和场景。
无法读取图片时，要诚实说明无法识别。
"""

PROBABILITY_SYSTEM = """
你是 Lovemaster 的 ProbabilityAnalyst。输出 JSON，字段包括 probability, tier, confidence,
summary, greenFlags, redFlags, nextActions。nextActions 恰好 3 条。
"""


class RewriteService:
    def __init__(self, ai_client: AIClient | None = None) -> None:
        self.ai_client = ai_client or AIClient()

    def optimize(self, user_message: str, image_url: str | None = None, mode: str = "love") -> dict:
        prompt = f"原始提问：{user_message}\n图片：{image_url or '无'}\n模式：{mode}\n请输出整理后的提问。"
        text = self.ai_client.complete(system=REWRITE_SYSTEM, user=prompt, model=None)
        return {"optimizedText": clean_rewrite(text, user_message)}


class OcrService:
    def __init__(self, ai_client: AIClient | None = None) -> None:
        self.ai_client = ai_client or AIClient()

    def extract(self, image_url: str | None, user_message: str) -> dict:
        if not image_url:
            return {"ocrText": "", "sceneSummary": "", "uncertainties": []}
        prompt = f"图片 URL：{image_url}\n用户描述：{user_message}\n请抽取 OCR_TEXT 与 SCENE_SUMMARY。"
        text = self.ai_client.complete(system=OCR_SYSTEM, user=prompt, model=None)
        return {
            "ocrText": extract_section(text, "OCR_TEXT") or "",
            "sceneSummary": extract_section(text, "SCENE_SUMMARY") or text[:240],
            "uncertainties": [],
        }


class ProbabilityAnalysisService:
    def __init__(self, ai_client: AIClient | None = None) -> None:
        self.ai_client = ai_client or AIClient()

    def analyze(self, user_message: str, rag_context: str = "", ocr_text: str = "") -> dict:
        prompt = f"""
用户问题：{user_message}
OCR 摘录：{ocr_text or '无'}
知识参考：{rag_context or '无'}
请输出概率分析 JSON。
"""
        raw = self.ai_client.complete(system=PROBABILITY_SYSTEM, user=prompt, model=None)
        parsed = parse_json_object(raw)
        if parsed:
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
    probability = max(0, min(100, probability))
    return {
        "probability": probability,
        "tier": data.get("tier") or tier_for(probability),
        "confidence": data.get("confidence") or "medium",
        "summary": data.get("summary") or "信息还不完整，建议结合更多聊天上下文判断。",
        "greenFlags": data.get("greenFlags") or [{"text": "存在正向互动信号", "weight": "medium"}],
        "redFlags": data.get("redFlags") or [{"text": "上下文信息仍有限", "weight": "medium"}],
        "nextActions": normalize_next_actions(data.get("nextActions")),
    }


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
        "greenFlags": [{"text": "对话中存在可继续承接的信号", "weight": "medium"}],
        "redFlags": [{"text": "仅凭当前描述无法确认 TA 的稳定意愿", "weight": "medium"}],
        "nextActions": normalize_next_actions(None),
    }


def normalize_next_actions(actions) -> list[dict]:
    if not actions:
        return [
            {"text": "先用一句轻松的话接住当前话题，不急着逼问态度。", "tone": "温和"},
            {"text": "补一个低压力邀约，让 TA 可以容易地答应或改期。", "tone": "主动"},
            {"text": "如果回复仍然含糊，放慢节奏观察 TA 是否主动延续。", "tone": "稳健"},
        ]
    normalized = []
    for item in actions[:3]:
        if isinstance(item, str):
            normalized.append({"text": item, "tone": "稳健"})
        else:
            normalized.append({"text": item.get("text") or item.get("action") or "", "tone": item.get("tone") or "稳健"})
    while len(normalized) < 3:
        normalized.append({"text": "保持轻量推进，观察对方是否主动延续。", "tone": "稳健"})
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
