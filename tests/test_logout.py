"""
Tests that verify session/token invalidation contracts.

In the current JWT architecture, logout is handled client-side by
discarding the token. These tests verify that endpoints properly
reject requests once a token is absent or tampered with.
"""


def test_endpoints_reject_missing_token_after_logout(client):
    """
    Simulates a logout: if the client discards its token and makes
    a request, the server must return 401.
    """
    # No Authorization header → 401
    resp = client.get("/api/user/user_uploads")
    assert resp.status_code == 401


def test_endpoints_reject_garbage_token(client):
    """A garbage token must not pass authentication."""
    resp = client.get(
        "/api/user/user_uploads",
        headers={"Authorization": "Bearer not-a-real-jwt"},
    )
    assert resp.status_code == 401


def test_endpoints_reject_empty_bearer(client):
    """An empty Bearer value must not pass authentication."""
    resp = client.get(
        "/api/user/user_uploads",
        headers={"Authorization": "Bearer "},
    )
    assert resp.status_code == 401
