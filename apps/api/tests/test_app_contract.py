import json
import os
from uuid import uuid4

os.environ["AI_PROVIDER"] = "fake"

from fastapi.testclient import TestClient

from lovemaster_api.main import app


client = TestClient(app)


def register_user(email: str | None = None) -> dict:
    email = email or f"demo-{uuid4().hex}@example.com"
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "secret123", "name": "Demo"},
    )
    assert response.status_code == 201
    return response.json()


def test_health_endpoint_reports_ok():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "lovemaster-api"}


def test_register_returns_frontend_compatible_auth_payload():
    email = f"demo-{uuid4().hex}@example.com"
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "secret123", "name": "Demo"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["accessToken"]
    assert data["refreshToken"]
    assert data["user"]["email"] == email


def test_sessions_endpoint_returns_list_for_current_user():
    auth = register_user()

    response = client.get(
        "/api/ai/sessions?chatType=loveapp",
        headers={"Authorization": f"Bearer {auth['accessToken']}"},
    )

    assert response.status_code == 200
    assert response.json() == []


def test_protected_sessions_reject_missing_or_invalid_token():
    missing = client.get("/api/ai/sessions?chatType=loveapp")
    invalid = client.get(
        "/api/ai/sessions?chatType=loveapp",
        headers={"Authorization": "Bearer not-a-token"},
    )

    assert missing.status_code == 401
    assert invalid.status_code == 401


def test_love_sse_emits_frontend_event_contract():
    auth = register_user()
    with client.stream(
        "GET",
        f"/api/ai/love_app/chat/sse?message=hello&chatId=chat_test&token={auth['accessToken']}",
    ) as response:
        body = "".join(response.iter_text())

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    payloads = []
    for block in body.split("\n\n"):
        if block.startswith("data: "):
            payloads.append(json.loads(block.removeprefix("data: ")))

    assert payloads[0]["type"] == "run_started"
    assert payloads[0]["data"]["chatId"] == "chat_test"
    assert any(event["type"] == "content" for event in payloads)
    assert payloads[-1]["type"] == "done"


def test_love_sse_probability_request_does_not_crash():
    auth = register_user()
    with client.stream(
        "GET",
        f"/api/ai/love_app/chat/sse?message=%E6%9C%89%E6%B2%A1%E6%9C%89%E6%88%8F&chatId=chat_probability&token={auth['accessToken']}",
    ) as response:
        body = "".join(response.iter_text())

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    payloads = []
    for block in body.split("\n\n"):
        if block.startswith("data: "):
            payloads.append(json.loads(block.removeprefix("data: ")))

    assert any(event["type"] == "probability_result" for event in payloads)
    assert payloads[-1]["type"] == "done"


def test_coach_sse_emits_tool_progress_for_tool_like_request():
    auth = register_user()
    with client.stream(
        "GET",
        f"/api/ai/manus/chat?message=%E5%B8%AE%E6%88%91%E6%90%9C%E7%B4%A2%E7%BA%A6%E4%BC%9A%E5%9C%B0%E7%82%B9&chatId=chat_tools&token={auth['accessToken']}",
    ) as response:
        body = "".join(response.iter_text())

    assert response.status_code == 200
    payloads = [
        json.loads(block.removeprefix("data: "))
        for block in body.split("\n\n")
        if block.startswith("data: ")
    ]
    assert any(event["type"] == "tool_call" for event in payloads)
    assert payloads[-1]["type"] == "done"


def test_cross_user_cannot_read_or_delete_another_users_session():
    owner = register_user()
    intruder = register_user()
    with client.stream(
        "GET",
        f"/api/ai/love_app/chat/sse?message=hello&chatId=chat_private&token={owner['accessToken']}",
    ) as response:
        assert response.status_code == 200
        _ = "".join(response.iter_text())

    messages = client.get(
        "/api/ai/sessions/chat_private/messages",
        headers={"Authorization": f"Bearer {intruder['accessToken']}"},
    )
    deleted = client.delete(
        "/api/ai/sessions/chat_private",
        headers={"Authorization": f"Bearer {intruder['accessToken']}"},
    )

    assert messages.status_code == 404
    assert deleted.status_code == 404


def test_image_upload_rejects_unowned_conversation_before_storage_call():
    auth = register_user()

    response = client.post(
        "/api/images/upload",
        headers={"Authorization": f"Bearer {auth['accessToken']}"},
        data={"type": "chat", "conversationId": "missing_chat"},
        files={"file": ("chat.png", b"fake-image", "image/png")},
    )

    assert response.status_code == 404


def test_auth_me_has_no_refresh_side_effect_and_logout_revokes_refresh_token():
    auth = register_user()

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {auth['accessToken']}"})
    logout = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {auth['accessToken']}"})
    refreshed = client.post("/api/auth/refresh", json={"refreshToken": auth["refreshToken"]})

    assert me.status_code == 200
    assert set(me.json()) == {"id", "email", "name", "avatarUrl"}
    assert logout.status_code == 200
    assert refreshed.status_code == 401


def test_refresh_rotates_refresh_token_and_rejects_old_token():
    auth = register_user()

    refreshed = client.post("/api/auth/refresh", json={"refreshToken": auth["refreshToken"]})
    old_again = client.post("/api/auth/refresh", json={"refreshToken": auth["refreshToken"]})

    assert refreshed.status_code == 200
    assert refreshed.json()["refreshToken"] != auth["refreshToken"]
    assert old_again.status_code == 401
