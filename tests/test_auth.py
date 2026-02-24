"""
Tests for /api/auth/* endpoints (login, complete-signup, set-password, etc.).

These tests validate the JWT-based auth system that replaced the old
session-based template authentication.
"""
import json
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _post_json(client, path, payload):
    """Helper — POST JSON to an auth endpoint."""
    return client.post(
        path,
        data=json.dumps(payload),
        content_type="application/json",
    )


# ---------------------------------------------------------------------------
# /api/auth/login
# ---------------------------------------------------------------------------


@patch("routes.auth.beehive")
def test_login_user_not_found(mock_beehive, client):
    mock_beehive.users.find_one.return_value = None

    resp = _post_json(client, "/api/auth/login", {
        "username": "ghostuser",
        "password": "password123",
    })
    assert resp.status_code == 401
    assert "not found" in resp.get_json()["error"].lower()


@patch("routes.auth.beehive")
@patch("routes.auth.bcrypt")
@patch("routes.auth.create_access_token", return_value="jwt-token-abc")
def test_login_success(mock_token, mock_bcrypt, mock_beehive, client):
    mock_beehive.users.find_one.return_value = {
        "_id": "uid-1",
        "email": "user@example.com",
        "password": b"hashed",
        "role": "user",
    }
    mock_bcrypt.checkpw.return_value = True

    resp = _post_json(client, "/api/auth/login", {
        "username": "user@example.com",
        "password": "password123",
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["access_token"] == "jwt-token-abc"


@patch("routes.auth.beehive")
@patch("routes.auth.bcrypt")
def test_login_invalid_password(mock_bcrypt, mock_beehive, client):
    mock_beehive.users.find_one.return_value = {
        "_id": "uid-1",
        "email": "user@example.com",
        "password": b"hashed",
        "role": "user",
    }
    mock_bcrypt.checkpw.return_value = False

    resp = _post_json(client, "/api/auth/login", {
        "username": "user@example.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401
    assert "invalid" in resp.get_json()["error"].lower()


def test_login_missing_fields(client):
    resp = _post_json(client, "/api/auth/login", {})
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# /api/auth/complete-signup
# ---------------------------------------------------------------------------


@patch("routes.auth.db")
@patch("routes.auth.is_admin_email", return_value=False)
@patch("routes.auth.create_access_token", return_value="new-jwt")
def test_complete_signup_success(mock_token, mock_admin, mock_db, client):
    mock_db.users.find_one.return_value = None  # no duplicates
    mock_db.users.insert_one.return_value = MagicMock(inserted_id="new-user-id")
    mock_db.email_otps.delete_many.return_value = None

    resp = _post_json(client, "/api/auth/complete-signup", {
        "email": "new@example.com",
        "username": "newuser",
        "password": "securepassword123",
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["access_token"] == "new-jwt"
    assert data["role"] == "user"


@patch("routes.auth.db")
def test_complete_signup_duplicate_email(mock_db, client):
    mock_db.users.find_one.return_value = {"_id": "exists"}

    resp = _post_json(client, "/api/auth/complete-signup", {
        "email": "dup@example.com",
        "username": "newuser",
        "password": "securepassword123",
    })
    assert resp.status_code == 400
    assert "already" in resp.get_json()["error"].lower()


def test_complete_signup_short_password(client):
    resp = _post_json(client, "/api/auth/complete-signup", {
        "email": "user@example.com",
        "username": "shorty",
        "password": "abc",
    })
    assert resp.status_code == 400


def test_complete_signup_at_in_username(client):
    resp = _post_json(client, "/api/auth/complete-signup", {
        "email": "user@example.com",
        "username": "user@name",
        "password": "securepassword123",
    })
    assert resp.status_code == 400
    assert "@" in resp.get_json()["error"]

