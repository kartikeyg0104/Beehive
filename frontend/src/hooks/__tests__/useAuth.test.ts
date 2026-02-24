import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../../hooks/useAuth";
import { saveToken, logout, AUTH_CHANGE_EVENT } from "../../utils/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal JWT (header.payload.signature) with the given claims. */
function makeJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify(claims));
  return `${header}.${payload}.fake-signature`;
}

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
const PAST_EXP = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAuth", () => {
  it("returns null user when no token is stored", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
    expect(result.current.isAdmin()).toBe(false);
    expect(result.current.isUser()).toBe(false);
  });

  it("decodes a valid user token", () => {
    const token = makeJwt({ sub: "user-1", role: "user", exp: FUTURE_EXP });
    localStorage.setItem("access_token", token);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).not.toBeNull();
    expect(result.current.user!.id).toBe("user-1");
    expect(result.current.user!.role).toBe("user");
    expect(result.current.isAuthenticated()).toBe(true);
    expect(result.current.isUser()).toBe(true);
    expect(result.current.isAdmin()).toBe(false);
  });

  it("decodes a valid admin token", () => {
    const token = makeJwt({ sub: "admin-1", role: "admin", exp: FUTURE_EXP });
    localStorage.setItem("access_token", token);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated()).toBe(true);
    expect(result.current.isAdmin()).toBe(true);
    expect(result.current.isUser()).toBe(false);
  });

  it("treats an expired token as unauthenticated", () => {
    const token = makeJwt({ sub: "user-1", role: "user", exp: PAST_EXP });
    localStorage.setItem("access_token", token);

    const { result } = renderHook(() => useAuth());

    // User is decoded, but isAuthenticated checks expiry
    expect(result.current.user).not.toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
  });

  it("reacts to saveToken — updates user after login", () => {
    const { result } = renderHook(() => useAuth());

    // Initially no user
    expect(result.current.user).toBeNull();

    // Simulate login
    act(() => {
      saveToken(makeJwt({ sub: "user-2", role: "user", exp: FUTURE_EXP }));
    });

    // Hook should now reflect the new token
    expect(result.current.user).not.toBeNull();
    expect(result.current.user!.id).toBe("user-2");
    expect(result.current.isAuthenticated()).toBe(true);
  });

  it("reacts to logout — clears user", () => {
    // Start with a token
    localStorage.setItem(
      "access_token",
      makeJwt({ sub: "user-3", role: "user", exp: FUTURE_EXP })
    );

    const { result } = renderHook(() => useAuth());
    expect(result.current.user).not.toBeNull();

    // Simulate logout
    act(() => {
      logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
  });

  it("reacts to cross-tab storage events", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();

    // Simulate another tab saving a token (storage event)
    const token = makeJwt({ sub: "cross-tab", role: "admin", exp: FUTURE_EXP });
    act(() => {
      localStorage.setItem("access_token", token);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "access_token",
          newValue: token,
        })
      );
    });

    expect(result.current.user).not.toBeNull();
    expect(result.current.user!.id).toBe("cross-tab");
  });

  it("handles malformed token gracefully", () => {
    localStorage.setItem("access_token", "not-a-jwt");

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
  });

  it("normalizes name fields from Google-style tokens", () => {
    const token = makeJwt({
      sub: "user-g",
      role: "user",
      exp: FUTURE_EXP,
      name: "Test User",
      given_name: "Test",
      family_name: "User",
    });
    localStorage.setItem("access_token", token);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user!.name).toBe("Test User");
    expect(result.current.user!.firstName).toBe("Test");
    expect(result.current.user!.lastName).toBe("User");
  });
});
