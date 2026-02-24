import { useCallback, useMemo, useSyncExternalStore } from "react";
import { getToken, AUTH_CHANGE_EVENT } from "../utils/auth";

interface JwtPayload {
  sub: string;
  role?: "admin" | "user";
  exp?: number;
  iat?: number;
  name?: string;
  given_name?: string;
  family_name?: string;
  firstName?: string;
  lastName?: string;
}

export type User = {
  id: string;
  role?: "admin" | "user";
  exp?: number;
  iat?: number;
  name?: string;
  firstName?: string;
  lastName?: string;
};

/**
 * Decode the JWT stored in localStorage into a User object.
 * Returns null if no token exists or the token is malformed.
 */
function decodeToken(token: string | null): User | null {
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as JwtPayload;

    return {
      id: payload.sub,
      role: payload.role,
      exp: payload.exp,
      iat: payload.iat,
      // Normalize possible name fields from different issuers
      name: payload.name,
      firstName: payload.firstName || payload.given_name,
      lastName: payload.lastName || payload.family_name,
    };
  } catch {
    return null;
  }
}

/**
 * Subscribe to auth token changes.
 * Listens to both the custom AUTH_CHANGE_EVENT (same-tab mutations via
 * saveToken/logout) and the native "storage" event (cross-tab changes).
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Snapshot function for useSyncExternalStore. */
function getSnapshot(): string | null {
  return getToken();
}

/**
 * Reactive auth hook that re-renders when the token changes
 * (login, logout, expiry, or cross-tab storage events).
 *
 * Return shape is identical to the previous implementation so all
 * existing consumers continue to work without changes.
 */
export const useAuth = () => {
  const token = useSyncExternalStore(subscribe, getSnapshot);
  const user = useMemo(() => decodeToken(token), [token]);

  const isAuthenticated = useCallback(() => {
    if (!user) return false;
    return (user.exp ?? 0) * 1000 > Date.now();
  }, [user]);

  const isAdmin = useCallback(() => {
    return isAuthenticated() && user?.role === "admin";
  }, [isAuthenticated, user]);

  const isUser = useCallback(() => {
    return isAuthenticated() && user?.role === "user";
  }, [isAuthenticated, user]);

  return {
    user,
    isAuthenticated,
    isAdmin,
    isUser,
  };
};
