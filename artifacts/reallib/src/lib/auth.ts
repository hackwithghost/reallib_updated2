import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "reallib_token";

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Set up the custom fetch auth token getter
setAuthTokenGetter(() => getToken());
