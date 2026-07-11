import { getAuthHeaders, handleResponse } from "./authApi";
import { API_ROOT } from "./config";

const API_BASE = API_ROOT;

export async function fetchChannels() {
  const response = await fetch(`${API_BASE}/channels`, { headers: getAuthHeaders() });
  return handleResponse(response);
}

export async function fetchNotificationSummary() {
  const response = await fetch(`${API_BASE}/channels/notifications/summary`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function sendPresenceHeartbeat() {
  const response = await fetch(`${API_BASE}/channels/presence`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function fetchChannelUsers() {
  const response = await fetch(`${API_BASE}/channels/meta/users`, { headers: getAuthHeaders() });
  return handleResponse(response);
}

export async function fetchChatMembers() {
  const response = await fetch(`${API_BASE}/channels/meta/members`, { headers: getAuthHeaders() });
  return handleResponse(response);
}

export async function fetchChannelMembers(channelId) {
  const response = await fetch(`${API_BASE}/channels/${channelId}/members`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createDirectChat({ userId, employeeId } = {}) {
  const response = await fetch(`${API_BASE}/channels/direct`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, employeeId }),
  });
  return handleResponse(response);
}

export async function createChannel(body) {
  const response = await fetch(`${API_BASE}/channels`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function fetchMessages(channelId) {
  const response = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function markChannelRead(channelId, messageId) {
  const response = await fetch(`${API_BASE}/channels/${channelId}/read`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ messageId }),
  });
  return handleResponse(response);
}

export async function sendMessage(channelId, payload = {}) {
  const {
    text = "",
    mentionUserIds = [],
    mentionAll = false,
    messageType,
    attachments,
    poll,
    gifUrl,
    driveLink,
    replyToMessageId,
  } = payload;

  const response = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      text,
      mentionUserIds,
      mentionAll,
      messageType,
      attachments,
      poll,
      gifUrl,
      driveLink,
      replyToMessageId,
    }),
  });
  return handleResponse(response);
}

export async function deleteChannel(channelId) {
  const response = await fetch(`${API_BASE}/channels/${channelId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}
