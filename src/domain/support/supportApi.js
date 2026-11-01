import { apiRequest } from "../../global/api/apiClient";

export function createInquiry(form) {
  return apiRequest("/api/v1/support/inquiries", {
    method: "POST",
    body: form,
  });
}

export function deleteInquiry(x) {
  return apiRequest("/api/v1/support/inquiries/" + x.id, { method: "DELETE" });
}

export function getSupportPath(tab, user) {
  return tab === "inquiries" && !user ? null : "/api/v1/support/" + tab;
}
