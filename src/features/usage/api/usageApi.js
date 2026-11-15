import { apiRequest } from "../../../shared/api/apiClient";

export function saveUsageCheck(id, usageLevel) {
  return apiRequest(`/api/v1/usage/${id}`, { method: "PUT", body: { usageLevel } });
}
