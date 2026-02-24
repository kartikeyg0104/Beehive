"""
Tests for core API route access control and basic responses.

Validates that:
- Protected endpoints reject unauthenticated requests (401).
- Admin endpoints reject non-admin tokens (403).
- Health endpoint is publicly accessible.
"""
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------


def test_health_check_returns_200(client):
    """The /health endpoint should be publicly accessible."""
    with patch("app.get_beehive_user_collection") as mock:
        mock_col = MagicMock()
        mock_col.database.command.return_value = {"ok": 1}
        mock.return_value = mock_col

        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "healthy"


# ---------------------------------------------------------------------------
# Auth-protected user endpoints (require Bearer token)
# ---------------------------------------------------------------------------


def test_upload_requires_auth(client):
    """POST /api/user/upload without token must return 401."""
    resp = client.post("/api/user/upload")
    assert resp.status_code == 401


def test_user_uploads_requires_auth(client):
    """GET /api/user/user_uploads without token must return 401."""
    resp = client.get("/api/user/user_uploads")
    assert resp.status_code == 401


def test_edit_requires_auth(client):
    """PATCH /edit/<id> without token must return 401."""
    resp = client.patch("/edit/000000000000000000000000")
    assert resp.status_code == 401


def test_delete_requires_auth(client):
    """DELETE /delete/<id> without token must return 401."""
    resp = client.delete("/delete/000000000000000000000000")
    assert resp.status_code == 401


def test_chat_send_requires_auth(client):
    """POST /api/chat/send without token must return 401."""
    resp = client.post("/api/chat/send")
    assert resp.status_code == 401


def test_chat_messages_requires_auth(client):
    """GET /api/chat/messages without token must return 401."""
    resp = client.get("/api/chat/messages")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Admin-only endpoints (require admin role)
# ---------------------------------------------------------------------------


def test_admin_dashboard_requires_auth(client):
    """GET /api/admin/dashboard without token must return 401."""
    resp = client.get("/api/admin/dashboard")
    assert resp.status_code == 401


def test_admin_dashboard_rejects_user_role(client, auth_headers):
    """GET /api/admin/dashboard with user-role token must return 403."""
    resp = client.get("/api/admin/dashboard", headers=auth_headers)
    assert resp.status_code == 403


def test_admin_analytics_requires_auth(client):
    """GET /api/admin/analytics without token must return 401."""
    resp = client.get("/api/admin/analytics")
    assert resp.status_code == 401


def test_admin_analytics_rejects_user_role(client, auth_headers):
    """GET /api/admin/analytics with user-role token must return 403."""
    resp = client.get("/api/admin/analytics", headers=auth_headers)
    assert resp.status_code == 403


def test_admin_users_requires_auth(client):
    """GET /api/admin/users without token must return 401."""
    resp = client.get("/api/admin/users")
    assert resp.status_code == 401


def test_admin_notifications_requires_auth(client):
    """GET /api/admin/notifications without token must return 401."""
    resp = client.get("/api/admin/notifications")
    assert resp.status_code == 401
