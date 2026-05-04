import json
import os

os.environ["AI_PROVIDER"] = "fake"

from fastapi.testclient import TestClient

from lovemaster_api.main import app


client = TestClient(app)


def test_health_endpoint_reports_ok():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "lovemaster-api"}


def test_register_returns_frontend_compatible_auth_payload():
    response = client.post(
        "/api/auth/register",
        json={"email": "demo@example.com", "password": "secret123", "name": "Demo"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["accessToken"]
    assert data["refreshToken"]
    assert data["user"]["email"] == "demo@example.com"


def test_sessions_endpoint_returns_list_for_current_user():
    response = client.get("/api/ai/sessions?chatType=loveapp")

    assert response.status_code == 200
    assert response.json() == []


def test_love_sse_emits_frontend_event_contract():
    with client.stream(
        "GET",
        "/api/ai/love_app/chat/sse?message=hello&chatId=chat_test&token=test-token",
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
    with client.stream(
        "GET",
        "/api/ai/love_app/chat/sse?message=%E6%9C%89%E6%B2%A1%E6%9C%89%E6%88%8F&chatId=chat_probability&token=test-token",
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
