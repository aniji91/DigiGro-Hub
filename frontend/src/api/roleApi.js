import { getAuthHeaders, handleResponse } from "./authApi";
import { apiUrl } from "./config";

const API_BASE = apiUrl("roles");

export async function fetchRoles() {
  const response = await fetch(API_BASE, { headers: getAuthHeaders() });
  return handleResponse(response);
}

export async function fetchRoleMeta() {
  const response = await fetch(`${API_BASE}/meta/modules`, { headers: getAuthHeaders() });
  return handleResponse(response);
}

export async function fetchRoleLabels() {
  const response = await fetch(`${API_BASE}/labels`, { headers: getAuthHeaders() });
  return handleResponse(response);
}

export async function fetchMyRolePermissions() {
  const response = await fetch(`${API_BASE}/my-permissions`, { headers: getAuthHeaders() });
  return handleResponse(response);
}

export async function createRole(body) {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function updateRole(id, body) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function deleteRole(id) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}
