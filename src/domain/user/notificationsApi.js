import { apiRequest } from "../../global/api/apiClient";

export function getNotifications() {
  return apiRequest("/api/v1/notifications");
}

export function getReminders() {
  return apiRequest("/api/v1/reminders");
}

export function markRead(x) {
  return apiRequest(`/api/v1/notifications/${x.id}/read`, { method: "POST" });
}

export function markAllRead() {
  return apiRequest("/api/v1/notifications/read-all", { method: "POST" });
}

export function deleteNotification(x) {
  return apiRequest(`/api/v1/notifications/${x.id}`, { method: "DELETE" });
}

export function getNotificationsPath() {
  return "/api/v1/notifications";
}
