import { apiRequest } from "../../../shared/api/apiClient";

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

export function signup(body) {
  return apiRequest("/api/signup", { method: "POST", body });
}

export function startSocialLogin(provider) {
  return apiRequest("/api/social/start", { method: "POST", body: { provider } });
}
export function completeSocialLogin(body) {
  return apiRequest("/api/social/code", { method: "POST", body });
}
