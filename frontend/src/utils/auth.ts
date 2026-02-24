import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "access_token";

/**
 * Custom event name dispatched whenever the token changes.
 * useAuth subscribes to this so components re-render reactively.
 */
export const AUTH_CHANGE_EVENT = "auth-change";

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getUserRole(): "admin" | "user" | null {
  const token = getToken();
  if (!token) return null;

  try {
    const decoded: any = jwtDecode(token);
    return decoded.role || null;
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return getUserRole() === "admin";
}
