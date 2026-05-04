import os

os.environ["AI_PROVIDER"] = "fake"

from lovemaster_api.auth import hash_password, verify_google_credential, verify_password


def test_password_hash_is_not_plaintext_and_verifies():
    hashed = hash_password("secret123")

    assert hashed != "secret123"
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong-pass", hashed)


def test_google_credential_can_use_unsigned_dev_payload():
    credential = (
        "dev."
        "eyJzdWIiOiAiZ29vZ2xlLTEyMyIsICJlbWFpbCI6ICJkZW1vQGV4YW1wbGUuY29tIiwg"
        "Im5hbWUiOiAiRGVtbyIsICJwaWN0dXJlIjogImh0dHBzOi8vZXhhbXBsZS5jb20vYS5wbmciLCAiZW1haWxfdmVyaWZpZWQiOiB0cnVlfQ"
        ".sig"
    )

    info = verify_google_credential(credential)

    assert info["googleId"] == "google-123"
    assert info["email"] == "demo@example.com"
    assert info["name"] == "Demo"
