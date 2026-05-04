from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass
from pathlib import Path

import httpx

from .settings import settings


SEGMENT_SEPARATOR = "\n---\n"
TOKEN_PATTERN = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)
FRONT_MATTER_PATTERN = re.compile(r"(?s)^---\n(.*?)\n---\n(.*)$")
TITLE_PATTERN = re.compile(r"(?m)^title\s*:\s*(.+)$", re.IGNORECASE)
HEADING_PATTERN = re.compile(r"(?m)^#\s+(.+)$")
WIKI_LINK_PATTERN = re.compile(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]")


@dataclass(frozen=True)
class WikiKnowledgeResult:
    content: str
    top_score: float
    hit_count: int

    @classmethod
    def empty(cls) -> "WikiKnowledgeResult":
        return cls("", 0.0, 0)


class WikiKnowledgeService:
    def __init__(
        self,
        root: str | Path | None = None,
        *,
        top_n: int = 3,
        title_boost: float = 2.0,
        max_chars_per_page: int = 400,
        total_budget_chars: int = 2000,
    ) -> None:
        self.root = Path(root or settings.app_knowledge_wiki_root)
        if not self.root.is_absolute():
            self.root = Path.cwd() / self.root
        self.top_n = top_n
        self.title_boost = title_boost
        self.max_chars_per_page = max_chars_per_page
        self.total_budget_chars = total_budget_chars

    def retrieve(self, query: str) -> WikiKnowledgeResult:
        if not query or not query.strip() or not self.root.exists():
            return WikiKnowledgeResult.empty()

        pages = self._load_pages()
        if not pages:
            return WikiKnowledgeResult.empty()

        query_tokens = tokenize(query)
        if not query_tokens:
            return WikiKnowledgeResult.empty()

        scores: dict[str, float] = {}
        for page_id, page in pages.items():
            token_weights = page["token_weights"]
            score = 0.0
            for token in query_tokens:
                score += token_weights.get(token, 0.0)
            if score > 0:
                scores[page_id] = score

        if not scores:
            return WikiKnowledgeResult.empty()

        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        segments = []
        used = 0
        for page_id, score in ranked[: self.top_n]:
            page = pages[page_id]
            snippet = normalize_whitespace(page["content"])[: self.max_chars_per_page]
            segment = f"{page['title']}\n{snippet}"
            remaining = self.total_budget_chars - used
            if remaining <= 0:
                break
            segment = segment[:remaining]
            segments.append(segment)
            used += len(segment)

        top_score = min(1.0, ranked[0][1] / max(1.0, len(query_tokens) * self.title_boost))
        return WikiKnowledgeResult(SEGMENT_SEPARATOR.join(segments), top_score, len(ranked))

    def _load_pages(self) -> dict[str, dict]:
        pages = {}
        for path in sorted(self.root.rglob("*.md")):
            raw = path.read_text(encoding="utf-8")
            title, body = split_title_and_body(path, raw)
            page_id = path.relative_to(self.root).with_suffix("").as_posix().lower()
            title_tokens = tokenize(title)
            body_tokens = tokenize(body)
            weights: dict[str, float] = {}
            for token in body_tokens:
                weights[token] = weights.get(token, 0.0) + 1.0
            for token in title_tokens:
                weights[token] = weights.get(token, 0.0) + self.title_boost
            pages[page_id] = {"title": title, "content": body, "token_weights": weights}
        return pages


class DifyKnowledgeClient:
    def retrieve(self, query: str) -> str:
        if not query.strip() or not settings.dify_dataset_key or not settings.dify_dataset_id:
            return ""
        response = httpx.post(
            f"{settings.dify_api_base_url.rstrip('/')}/datasets/{settings.dify_dataset_id}/retrieve",
            headers={"Authorization": f"Bearer {settings.dify_dataset_key}", "Content-Type": "application/json"},
            json={
                "query": query,
                "retrieval_model": {
                    "search_method": "hybrid_search",
                    "reranking_enable": False,
                    "top_k": 4,
                    "score_threshold_enabled": False,
                },
            },
            timeout=10,
        )
        response.raise_for_status()
        return self.format_response(response.json())

    @staticmethod
    def format_response(payload: dict | None) -> str:
        if not payload:
            return ""
        records = payload.get("records") or []
        segments = []
        seen = set()
        for record in records:
            content = ((record.get("segment") or {}).get("content") or "").strip()
            if content and content not in seen:
                segments.append(content)
                seen.add(content)
        return SEGMENT_SEPARATOR.join(segments)


class RagKnowledgeService:
    def __init__(self, wiki: WikiKnowledgeService | None = None, dify: DifyKnowledgeClient | None = None) -> None:
        self.wiki = wiki or WikiKnowledgeService()
        self.dify = dify if dify is not None else DifyKnowledgeClient()
        self.cache: dict[str, str] = {}

    def retrieve(self, query: str) -> str:
        if not query.strip():
            return ""
        key = hashlib.sha256(query.strip().lower().encode("utf-8")).hexdigest()[:16]
        if key in self.cache:
            return self.cache[key]

        wiki_result = self.wiki.retrieve(query)
        dify_result = ""
        if self.dify is not None:
            try:
                dify_result = self.dify.retrieve(query)
            except Exception:
                dify_result = ""

        parts = []
        if wiki_result.content:
            parts.append(wiki_result.content)
        if dify_result:
            parts.append(dify_result)
        result = SEGMENT_SEPARATOR.join(parts)
        self.cache[key] = sanitize_knowledge(result)
        return self.cache[key]


def split_title_and_body(path: Path, raw: str) -> tuple[str, str]:
    body = raw
    title = path.stem
    front = FRONT_MATTER_PATTERN.match(raw)
    if front:
        title_match = TITLE_PATTERN.search(front.group(1))
        if title_match:
            title = title_match.group(1).strip().strip('"')
        body = front.group(2)
    else:
        heading = HEADING_PATTERN.search(raw)
        if heading:
            title = heading.group(1).strip()
    return title, body.strip()


def tokenize(text: str) -> list[str]:
    normalized = text.lower()
    tokens = TOKEN_PATTERN.findall(normalized)
    expanded = []
    for token in tokens:
        expanded.append(token)
        if contains_han(token) and len(token) > 1:
            expanded.extend(token[i : i + 2] for i in range(len(token) - 1))
    return expanded


def contains_han(text: str) -> bool:
    return any("\u4e00" <= char <= "\u9fff" for char in text)


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def sanitize_knowledge(text: str) -> str:
    blocked_patterns = [
        r"(?i)ignore previous instructions",
        r"(?i)system prompt",
        r"(?i)developer message",
        r"(?i)泄露.*提示词",
    ]
    sanitized = text
    for pattern in blocked_patterns:
        sanitized = re.sub(pattern, "[filtered]", sanitized)
    return sanitized
