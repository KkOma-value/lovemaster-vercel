from __future__ import annotations

import ipaddress
import smtplib
from email.message import EmailMessage
from urllib.parse import urlparse

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
    {
        "type": "function",
        "function": {
            "name": "file_operation",
            "description": "操作 Supabase 存储中的文件（列出、读取、写入）",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": ["list", "read", "write"], "description": "操作类型"},
                    "path": {"type": "string", "description": "文件路径或目录路径"},
                    "content": {"type": "string", "description": "写入内容（仅 write 操作需要）"},
                },
                "required": ["action", "path"],
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
    "file_operation": "文件操作",
}


class ToolRegistry:
    def __init__(self) -> None:
        self._tools = {
            "web_search": web_search,
            "web_scrape": web_scrape,
            "image_search": image_search,
            "send_email": send_email,
            "file_operation": file_operation,
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


def _validate_url(url: str) -> str | None:
    """Validate URL for safety. Returns error message if invalid, None if OK."""
    try:
        parsed = urlparse(url)
    except Exception:
        return "无效的 URL"
    if parsed.scheme not in ("http", "https"):
        return "仅支持 http 和 https 协议"
    hostname = parsed.hostname or ""
    if not hostname:
        return "缺少主机名"
    # Block localhost and common internal hostnames
    if hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        return "不允许访问本地地址"
    # Block private/internal IP ranges
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            return "不允许访问内部网络地址"
    except ValueError:
        # hostname is a domain name, not an IP — check for internal patterns
        if hostname.endswith(".internal") or hostname.endswith(".local"):
            return "不允许访问内部域名"
    return None


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
    error = _validate_url(url)
    if error:
        return {"error": error, "url": url}
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


def file_operation(action: str, path: str, content: str | None = None) -> dict:
    """Operate on files in Supabase Storage (list, read, write)."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return {"success": False, "message": "Supabase 未配置"}

    # Path validation: block traversal and restrict to safe prefixes
    if ".." in path or path.startswith("/"):
        return {"success": False, "message": "路径不允许包含 '..' 或以 '/' 开头"}

    base_url = settings.supabase_url.rstrip("/")
    bucket = settings.supabase_storage_bucket
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }

    if action == "list":
        response = httpx.post(
            f"{base_url}/storage/v1/object/list/{bucket}",
            headers={**headers, "Content-Type": "application/json"},
            json={"prefix": path, "limit": 100, "sortBy": {"column": "name", "order": "asc"}},
            timeout=15,
        )
        response.raise_for_status()
        items = response.json()
        return {
            "files": [
                {"name": item.get("name"), "size": item.get("metadata", {}).get("size"), "type": "folder" if item.get("id") is None else "file"}
                for item in items
            ]
        }

    if action == "read":
        response = httpx.get(
            f"{base_url}/storage/v1/object/{bucket}/{path}",
            headers=headers,
            timeout=15,
        )
        response.raise_for_status()
        text = response.text[:10000]
        return {"content": text, "path": path}

    if action == "write":
        if content is None:
            return {"success": False, "message": "写入操作需要 content 参数"}
        response = httpx.post(
            f"{base_url}/storage/v1/object/{bucket}/{path}",
            headers={**headers, "Content-Type": "application/octet-stream"},
            content=content.encode("utf-8"),
            timeout=15,
        )
        response.raise_for_status()
        return {"success": True, "path": path, "message": "文件已写入"}

    return {"success": False, "message": f"不支持的操作: {action}"}


tool_registry = ToolRegistry()
