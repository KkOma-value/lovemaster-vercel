from __future__ import annotations

import smtplib
from email.message import EmailMessage

import httpx

from .settings import settings


class ToolRegistry:
    def __init__(self) -> None:
        self._tools = {
            "web_search": web_search,
            "web_scrape": web_scrape,
            "image_search": image_search,
            "send_email": send_email,
            "generate_pdf_text": generate_pdf_text,
        }

    def names(self) -> list[str]:
        return sorted(self._tools)

    def run(self, name: str, **kwargs):
        if name not in self._tools:
            raise ValueError(f"Unsupported tool: {name}")
        return self._tools[name](**kwargs)


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


def generate_pdf_text(title: str, content: str) -> dict:
    # Vercel-safe placeholder: returns markdown/text content instead of writing local files.
    return {"title": title, "content": f"# {title}\n\n{content}"}


tool_registry = ToolRegistry()
