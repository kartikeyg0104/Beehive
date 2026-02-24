"""Shared test fixtures for the Beehive backend test suite.

Environment variables are set BEFORE importing the app so that
Config.validate_config() does not call sys.exit(1).
"""
import os

# --- Set required env vars before any app import ---------------------
os.environ.setdefault("FLASK_SECRET_KEY", "a" * 64)
os.environ.setdefault("JWT_SECRET", "b" * 64)
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_EXPIRE_HOURS", "24")
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/")
os.environ.setdefault("DATABASE_NAME", "beehive_test")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
# -------------------------------------------------------------------

import pytest
from app import app as flask_app
from utils.jwt_auth import create_access_token


@pytest.fixture
def app():
    flask_app.config.update({"TESTING": True})
    yield flask_app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def runner(app):
    return app.test_cli_runner()


@pytest.fixture
def auth_headers(app):
    """Generate a valid JWT Bearer header for a regular user."""
    with app.app_context():
        token = create_access_token(user_id="test-user-id", role="user")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture
def admin_headers(app):
    """Generate a valid JWT Bearer header for an admin."""
    with app.app_context():
        token = create_access_token(user_id="test-admin-id", role="admin")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
