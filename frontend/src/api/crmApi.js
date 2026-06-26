import { getAuthHeaders } from "./authApi";
import { API_ROOT } from "./config";

const API_BASE = API_ROOT;

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function createApi(resource) {
  const base = `${API_BASE}/${resource}`;

  return {
    fetchAll: () => fetch(base, { headers: getAuthHeaders() }).then(handleResponse),
    create: (body) =>
      fetch(base, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      }).then(handleResponse),
    update: (id, body) =>
      fetch(`${base}/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      }).then(handleResponse),
    remove: (id) =>
      fetch(`${base}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      }).then(handleResponse),
  };
}

export const clientsApi = createApi("clients");
export const projectsApi = createApi("projects");
export const leavesApi = createApi("leaves");
export const leaveAllocationsApi = createApi("leave-allocations");

export async function fetchLeaveAllocations(year = new Date().getFullYear()) {
  const response = await fetch(`${API_BASE}/leave-allocations?year=${year}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}
export const workLogsApi = createApi("work-logs");
export const holidaysApi = createApi("holidays");
export const announcementsApi = createApi("announcements");
export const projectUpdatesApi = createApi("project-updates");

export async function fetchProjectUpdates(projectId) {
  const query = projectId ? `?projectId=${projectId}` : "";
  const response = await fetch(`${API_BASE}/project-updates${query}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchAnnouncements() {
  const response = await fetch(`${API_BASE}/announcements`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchHolidays(year = new Date().getFullYear()) {
  const response = await fetch(`${API_BASE}/holidays?year=${year}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchMyProjects() {
  const response = await fetch(`${API_BASE}/my-projects`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function updateProjectEnvironment(projectId, body) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/environment`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function fetchMyOnboarding() {
  const response = await fetch(`${API_BASE}/project-onboarding`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchProjectOnboarding(projectId) {
  const response = await fetch(`${API_BASE}/project-onboarding/project/${projectId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchProjectTeamOnboarding(projectId) {
  const response = await fetch(`${API_BASE}/project-onboarding/project/${projectId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function completeOnboardingStep(onboardingId, stepId) {
  const response = await fetch(`${API_BASE}/project-onboarding/${onboardingId}/steps/${stepId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchDashboardStats() {
  const response = await fetch(`${API_BASE}/dashboard/stats`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}
