from __future__ import annotations

import smtplib
from email.message import EmailMessage

import httpx

from .settings import settings


# OpenAI function-calling format tool definitions
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "搜索互联网获取最新信息，如餐厅推荐、约会攻略、聊天话题等",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "搜索关键词"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_scrape",
            "description": "抓取指定网页的内容，用于获取文章、攻略等详细信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "要抓取的网页 URL"},
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "image_search",
            "description": "搜索图片，如约会地点照片、礼物参考图等",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "图片搜索关键词"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_email",
            "description": "发送邮件，如约会邀请、感谢信等",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {"type": "string", "description": "收件人邮箱"},
                    "subject": {"type": "string", "description": "邮件主题"},
                    "body": {"type": "string", "description": "邮件正文"},
                },
                "required": ["to", "subject", "body"],
            },
        },
    },
]

# Friendly Chinese names for SSE events
TOOL_DISPLAY_NAMES = {
    "web_search": "搜索互联网",
    "web_scrape": "抓取网页内容",
    "image_search": "搜索图片",
    "send_email": "发送邮件",
}


class ToolRegistry:
    def __init__(self) -> None:
        self._tools = {
            "web_search": web_search,
            "web_scrape": web_scrape,
            "image_search": image_search,
            "send_email": send_email,
        }

    def names(self) -> list[str]:
        return sorted(self._tools)

    def run(self, name: str, **kwargs):
        if name not in self._tools:
            raise ValueError(f"Unsupported tool: {name}")
        return self._tools[name](**kwargs)

    def definitions(self) -> list[dict]:
        """Return OpenAI-format tool definitions."""
        return TOOL_DEFINITIONS

    def display_name(self, name: str) -> str:
        return TOOL_DISPLAY_NAMES.get(name, name)


def web_search(query: str) -> dict:
    if not settings.search_api_key:
        return {"results": [], "message": "SEARCH_API_KEY 未配置"}
    response = httpx.get(
        "https://www.searchapi.io/api/v1/search",
        params={"engine": "google", "q": query, "api_key": settings.search_api_key},
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json()
    organic = payload.get("organic_results") or []
    return {
        "results": [
            {"title": item.get("title"), "link": item.get("link"), "snippet": item.get("snippet")}
            for item in organic[:5]
        ]
    }


def web_scrape(url: str) -> dict:
    response = httpx.get(url, timeout=15, follow_redirects=True)
    response.raise_for_status()
    text = response.text
    return {"url": str(response.url), "content": text[:6000]}


def image_search(query: str) -> dict:
    if not settings.pexels_api_key:
        return {"results": [], "message": "PEXELS_API_KEY 未配置"}
    response = httpx.get(
        "https://api.pexels.com/v1/search",
        params={"query": query, "per_page": 8},
        headers={"Authorization": settings.pexels_api_key},
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json()
    return {
        "results": [
            {
                "url": photo.get("src", {}).get("large"),
                "thumb": photo.get("src", {}).get("medium"),
                "photographer": photo.get("photographer"),
            }
            for photo in payload.get("photos", [])
        ]
    }


def send_email(to: str, subject: str, body: str) -> dict:
    if not settings.spring_mail_username or not settings.spring_mail_password:
        return {"sent": False, "message": "邮件服务未配置"}
    message = EmailMessage()
    message["From"] = settings.spring_mail_username
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    host = settings.spring_mail_host
    port = settings.spring_mail_port
    with smtplib.SMTP_SSL(host, port, timeout=20) as smtp:
        smtp.login(settings.spring_mail_username, settings.spring_mail_password)
        smtp.send_message(message)
    return {"sent": True}


tool_registry = ToolRegistry()
