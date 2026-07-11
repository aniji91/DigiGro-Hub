import { API_ROOT } from "./config";

let onUnauthorized = null;

/** Register a callback (e.g. AuthContext logout) for 401 responses. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      onUnauthorized?.();
    }
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export async function login(username, password) {
  const response = await fetch(`${API_ROOT}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Login failed");
  return data;
}

export async function fetchMe() {
  const response = await fetch(`${API_ROOT}/auth/me`, { headers: getAuthHeaders() });
  return handleResponse(response);
}

export async function updateProfile(body) {
  const response = await fetch(`${API_ROOT}/auth/me`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function changePassword(body) {
  const response = await fetch(`${API_ROOT}/auth/change-password`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
