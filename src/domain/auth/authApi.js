import { apiRequest } from "../../global/api/apiClient";

export function getSession() {
  return apiRequest("/api/me");
}

export function logout() {
  return apiRequest("/api/logout", { method: "POST" });
}

export function login(id, password, rememberMe) {
  return apiRequest("/api/login", {
    method: "POST",
    body: { id, password, rememberMe },
  });
}
