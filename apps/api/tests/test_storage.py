import os

os.environ["AI_PROVIDER"] = "fake"

from lovemaster_api.storage import build_storage_path, public_storage_url


def test_storage_path_is_scoped_and_sanitized():
    path = build_storage_path("user/1", "chat", "../hello world.png")

    assert path.startswith("images/user_1/chat/")
    assert path.endswith("hello_world.png")
    assert ".." not in path


def test_public_storage_url_uses_supabase_public_object_path():
    url = public_storage_url("https://demo.supabase.co", "bucket", "images/u/chat/a.png")

    assert url == "https://demo.supabase.co/storage/v1/object/public/bucket/images/u/chat/a.png"
