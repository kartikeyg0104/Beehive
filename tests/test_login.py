"""
Tests for the /api/auth/login endpoint.

Covers field validation edge cases that supplement
the main test_auth.py login tests.
"""
import json


def _post_json(client, payload):
    return client.post(
        "/api/auth/login",
        data=json.dumps(payload),
        content_type="application/json",
    )


def test_login_empty_body_returns_400(client):
    """An empty JSON body should be rejected."""
    resp = _post_json(client, {})
    assert resp.status_code == 400


def test_login_empty_username_returns_400(client):
    """Blank username should be rejected by sanitize_string."""
    resp = _post_json(client, {"username": "", "password": "test1234"})
    assert resp.status_code == 400


def test_login_empty_password_returns_400(client):
    """Blank password should be rejected by sanitize_string."""
    resp = _post_json(client, {"username": "someuser", "password": ""})
    assert resp.status_code == 400
