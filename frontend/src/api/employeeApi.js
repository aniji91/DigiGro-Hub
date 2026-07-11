import { getAuthHeaders, handleResponse } from "./authApi";
import { apiUrl } from "./config";

const API_BASE = apiUrl("employees");

export async function fetchEmployees() {
  const response = await fetch(API_BASE, { headers: getAuthHeaders() });
  return handleResponse(response);
}

export async function fetchAssignableRoles() {
  const response = await fetch(`${API_BASE}/meta/assignable-roles`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createEmployee(employee) {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(employee),
  });
  return handleResponse(response);
}

export async function updateEmployee(id, employee) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(employee),
  });
  return handleResponse(response);
}

export async function deleteEmployee(id) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}
