import { getAuthHeaders, handleResponse } from "./authApi";
import { apiUrl } from "./config";

const API_BASE = apiUrl("users");

export async function fetchUsers() {
  const response = await fetch(API_BASE, { headers: getAuthHeaders() });
  return handleResponse(response);
}

export async function fetchUserAssignableRoles() {
  const response = await fetch(`${API_BASE}/meta/assignable-roles`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createUser(user) {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(user),
  });
  return handleResponse(response);
}

export async function deleteUser(id) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}
